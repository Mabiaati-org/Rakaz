import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { rakazErrorText, todayISO, type RakazNotificationKind, type RakazParentBootstrap } from '@rakaz/contract';

import { client, parentApi } from '@/services/api';
import { NotificationService } from '@/services/notificationService';
import {
  absenceFromServer,
  notificationFromServer,
  paymentFromServer,
  studentFromServer,
  subscriptionFromServer,
  ticketFromServer,
  tripFromServer,
} from '@/services/serverMapping';
import * as L from '@/store/familyLogic';
import type { FamilyState } from '@/store/familyLogic';
import { useSession } from '@/store/sessionStore';
import {
  type AbsenceReason,
  type AbsenceScope,
  allNotificationKinds,
  type AppNotification,
  type Coordinate,
  defaultNotificationPreferences,
  type NotificationKind,
  type NotificationPreferences,
  type StudentAddress,
  TicketKind,
  TicketTopic,
  TripKind,
} from '@/types/models';
import { Haptics } from '@/utils/haptics';
import { isRecord, Storage } from '@/utils/storage';

const CACHE_KEY = 'rakaz.parent.bootstrap';
const SELECTED_KEY = 'rakaz.parent.selectedStudent';
const TRIP_POLL_MS = 5_000;

const isBootstrap = (value: unknown): value is RakazParentBootstrap =>
  isRecord(value) && Array.isArray(value.students) && Array.isArray(value.absences) && isRecord(value.support);

const isString = (value: unknown): value is string => typeof value === 'string';
const NOWHERE: Coordinate = { latitude: 0, longitude: 0 };

function emptyState(): FamilyState {
  return {
    loaded: false,
    loadError: null,
    students: [],
    selectedStudentID: '',
    morningTrip: L.idleTrip(TripKind.morning),
    returnTrip: L.idleTrip(TripKind.afternoon),
    activeKind: TripKind.morning,
    notifications: [],
    absences: [],
    tickets: [],
    subscriptions: {},
    payments: {},
    support: { adminPhone: '', whatsappNumber: '', privacyPolicyUrl: '' },
    preferences: defaultNotificationPreferences(),
    banner: null,
    handoverPending: false,
    handoverConfirmedAt: null,
  };
}

/** Local calendar day of an epoch as YYYY-MM-DD, the form the API expects for absences. */
const dateISOOf = (epochMs: number): string => todayISO(new Date(epochMs));

/**
 * Central guardian-side state: children, live trips, notifications, absences, finance and support.
 * Everything is loaded from the Rakaz API; the last bootstrap is cached so the app opens offline.
 */
export const [FamilyStoreProvider, useFamily] = createContextHook(() => {
  const session = useSession();
  const signedIn = session.phase === 'main';

  const [state, setState] = useState<FamilyState>(emptyState);
  const stateRef = useRef<FamilyState>(state);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatus = useRef<string>('');
  /** Trip whose handover screen the guardian already closed; the poll must not reopen it. */
  const handoverDismissedFor = useRef<string | null>(null);

  const actions = useMemo(() => {
    const get = (): FamilyState => stateRef.current;
    const commit = (next: FamilyState): void => {
      stateRef.current = next;
      setState(next);
    };
    const patch = (partial: Partial<FamilyState>): void => commit({ ...get(), ...partial });

    const showBanner = (n: AppNotification): void => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      patch({ banner: n });
      bannerTimer.current = setTimeout(() => patch({ banner: null }), 3500);
    };

    const applyBootstrap = (boot: RakazParentBootstrap, preferredID: string | null): void => {
      const students = boot.students.map(studentFromServer);
      const keep = [preferredID, get().selectedStudentID].find((id) => id && students.some((s) => s.id === id));
      patch({
        loaded: true,
        loadError: null,
        students,
        selectedStudentID: keep ?? students[0]?.id ?? '',
        absences: boot.absences.map(absenceFromServer).sort((a, b) => b.day - a.day),
        subscriptions: Object.fromEntries(boot.students.map((s) => [s.id, s.subscription ? subscriptionFromServer(s.subscription) : null])),
        payments: Object.fromEntries(boot.students.map((s) => [s.id, s.payments.map(paymentFromServer)])),
        support: boot.support,
      });
    };

    /** Loads the inbox; with `announce`, a notification that was not there before raises the banner. */
    const refreshNotifications = async (announce: boolean): Promise<void> => {
      try {
        const known = new Set(get().notifications.map((n) => n.id));
        const items = (await client.notifications.list()).map(notificationFromServer);
        patch({ notifications: items });
        const fresh = items.find((n) => !n.isRead && !known.has(n.id));
        if (announce && fresh) {
          Haptics.soft();
          showBanner(fresh);
        }
      } catch {
        // Keep the list already on screen.
      }
    };

    const refreshTickets = async (): Promise<void> => {
      try {
        patch({ tickets: (await parentApi.listTickets()).map(ticketFromServer) });
      } catch {
        // Keep the list already on screen.
      }
    };

    const refreshPreferences = async (): Promise<void> => {
      try {
        const { muted } = await client.notifications.getPreferences();
        const off = new Set<string>(muted);
        patch({ preferences: { enabled: Object.fromEntries(allNotificationKinds.map((k) => [k, !off.has(k)])) } });
      } catch {
        // Defaults stay in place until the server answers.
      }
    };

    /** Reloads everything the guardian sees. Never throws: failures are reported in `loadError`. */
    const load = async (): Promise<void> => {
      try {
        applyBootstrap(await parentApi.bootstrap().then((boot) => (Storage.save(CACHE_KEY, boot), boot)), null);
      } catch (error) {
        patch({ loadError: rakazErrorText(error) });
      }
      await Promise.all([refreshNotifications(false), refreshTickets(), refreshPreferences()]);
    };

    /** Reads today's two trips for the selected child. Called on a timer while the app is open. */
    const refreshTrips = async (): Promise<void> => {
      const s = get();
      const student = s.students.find((st) => st.id === s.selectedStudentID);
      if (!student) return;
      let today;
      try {
        today = await parentApi.todayTrips(student.id);
      } catch {
        return; // Offline or a brief server error: keep the last known state and try again on the next tick.
      }
      if (get().selectedStudentID !== student.id) return; // The guardian switched child while this was in flight.

      const morningTrip = tripFromServer(today.morning, student, TripKind.morning);
      const returnTrip = tripFromServer(today.afternoon, student, TripKind.afternoon);
      const tripId = today.afternoon.tripId;
      const pending = today.afternoon.handoverPending && handoverDismissedFor.current !== tripId;
      patch({
        morningTrip,
        returnTrip,
        activeKind: today.activeKind === 'afternoon' ? TripKind.afternoon : TripKind.morning,
        handoverPending: pending,
        handoverConfirmedAt: today.afternoon.handoverConfirmedAt,
      });

      const signature = `${student.id}:${morningTrip.status}:${returnTrip.status}`;
      const changed = lastStatus.current !== '' && lastStatus.current !== signature;
      lastStatus.current = signature;
      if (changed) await refreshNotifications(true);
    };

    const submitTicket = async (kind: TicketKind, topic: TicketTopic, body: string): Promise<void> => {
      const ticket = ticketFromServer(await parentApi.createTicket({ kind, topic, body: body.trim() }));
      patch({ tickets: [ticket, ...get().tickets] });
      Haptics.success();
    };

    const savePreferences = (preferences: NotificationPreferences): void => {
      const muted = allNotificationKinds.filter((k) => preferences.enabled[k] === false) as unknown as RakazNotificationKind[];
      void client.notifications.savePreferences({ muted }).catch(() => undefined);
    };

    return {
      load,
      refreshTrips,
      refreshNotifications,
      submitTicket,

      /** Forgets everything about the signed-in family (sign-out, account deletion). */
      reset(): void {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        lastStatus.current = '';
        handoverDismissedFor.current = null;
        Storage.remove(CACHE_KEY);
        Storage.remove(SELECTED_KEY);
        commit(emptyState());
      },

      /** Shows the cached copy immediately, so the app opens without waiting for the network. */
      async restoreCache(): Promise<void> {
        const [cached, selected] = await Promise.all([Storage.load(CACHE_KEY, isBootstrap), Storage.load(SELECTED_KEY, isString)]);
        if (cached && !get().loaded) applyBootstrap(cached, selected);
      },

      async confirmHandover(): Promise<void> {
        const s = get();
        const at = Date.now();
        await parentApi.handover({ tripId: s.returnTrip.id, studentId: s.selectedStudentID, confirmed: true, issueReported: false, at });
        handoverDismissedFor.current = s.returnTrip.id;
        patch({ handoverConfirmedAt: at });
        Haptics.success();
      },

      dismissHandover(): void {
        handoverDismissedFor.current = get().returnTrip.id;
        if (get().handoverPending) patch({ handoverPending: false });
      },

      /** Guardian says the student has not arrived: alert the administration and open a support ticket. */
      async reportHandoverIssue(): Promise<void> {
        const s = get();
        await parentApi.handover({
          tripId: s.returnTrip.id,
          studentId: s.selectedStudentID,
          confirmed: false,
          issueReported: true,
          at: Date.now(),
        });
        handoverDismissedFor.current = s.returnTrip.id;
        patch({ handoverPending: false });
        const name = L.currentStudent(get()).firstName;
        await submitTicket(TicketKind.complaint, TicketTopic.timing, `لم يصل ${name} إلى المنزل رغم تسجيل الوصول في رحلة العودة.`);
      },

      select(studentID: string): void {
        if (studentID === get().selectedStudentID) return;
        Haptics.selection();
        lastStatus.current = '';
        handoverDismissedFor.current = null;
        Storage.save(SELECTED_KEY, studentID);
        patch({
          selectedStudentID: studentID,
          morningTrip: L.idleTrip(TripKind.morning),
          returnTrip: L.idleTrip(TripKind.afternoon),
          handoverPending: false,
          handoverConfirmedAt: null,
        });
        void refreshTrips();
      },

      dismissBanner(): void {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        patch({ banner: null });
      },

      markRead(id: string): void {
        patch({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) });
        void client.notifications.markRead(id).catch(() => undefined);
      },

      markAllRead(): void {
        patch({ notifications: get().notifications.map((n) => ({ ...n, isRead: true })) });
        void client.notifications.markAllRead().catch(() => undefined);
      },

      deleteNotification(id: string): void {
        patch({ notifications: get().notifications.filter((n) => n.id !== id) });
        void client.notifications.remove(id).catch(() => undefined);
      },

      setPreference(kind: NotificationKind, on: boolean): void {
        const preferences: NotificationPreferences = { enabled: { ...get().preferences.enabled, [kind]: on } };
        patch({ preferences });
        savePreferences(preferences);
        Haptics.selection();
      },

      /** Throws with an Arabic message when the server rejects the report or cannot be reached. */
      async reportAbsence(day: number, scope: AbsenceScope, reason: AbsenceReason, note: string): Promise<void> {
        const saved = await parentApi.reportAbsence({
          studentId: get().selectedStudentID,
          dateISO: dateISOOf(day),
          scope,
          reason,
          note: note.trim(),
        });
        patch({ absences: L.replaceAbsenceForDay(get().absences, absenceFromServer(saved)) });
        Haptics.success();
        void refreshTrips();
      },

      async cancelAbsence(id: string): Promise<void> {
        await parentApi.cancelAbsence(id);
        patch({ absences: get().absences.filter((a) => a.id !== id) });
        void refreshTrips();
      },

      async updateAddress(address: StudentAddress, studentID: string): Promise<void> {
        const saved = await parentApi.updateAddress(studentID, address);
        patch({ students: get().students.map((st) => (st.id === studentID ? { ...st, address: saved } : st)) });
        Haptics.success();
      },
    };
  }, []);

  // Load on sign-in, forget on sign-out.
  useEffect(() => {
    if (!signedIn) {
      if (session.phase === 'login' && stateRef.current.loaded) actions.reset();
      return;
    }
    void actions.restoreCache().then(() => actions.load());
    void NotificationService.register();
  }, [signedIn, session.phase, actions]);

  // Follow today's trips while the app is on screen.
  const selectedStudentID = state.selectedStudentID;
  useEffect(() => {
    if (!signedIn || selectedStudentID === '') return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = (): void => {
      if (timer != null) return;
      void actions.refreshTrips();
      timer = setInterval(() => void actions.refreshTrips(), TRIP_POLL_MS);
    };
    const stop = (): void => {
      if (timer != null) clearInterval(timer);
      timer = null;
    };
    // The state can be unknown for a moment at launch, so only a definite "background" holds polling back.
    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        start();
        void actions.load();
      } else if (status === 'background') {
        stop();
      }
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [signedIn, selectedStudentID, actions]);

  useEffect(
    () => () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    },
    [],
  );

  const derived = useMemo(
    () => ({
      student: L.currentStudent(state),
      activeTrip: L.tripFor(state, state.activeKind),
      unreadCount: L.unreadCount(state),
      todaysAbsence: L.todaysAbsence(state),
      subscription: state.subscriptions[state.selectedStudentID] ?? null,
      payments: state.payments[state.selectedStudentID] ?? [],
    }),
    [state],
  );

  return useMemo(
    () => ({
      state,
      ...derived,
      ...actions,
      trip: (kind: TripKind) => L.tripFor(state, kind),
      isAbsent: (kind: TripKind) => L.isAbsentOn(state, kind),
      legs: (kind: TripKind) => L.legsFor(state, kind),
      busLocation: (kind: TripKind) => L.busLocation(state, kind),
      vehicleCoordinate: (kind: TripKind) => L.vehicleCoordinate(state, kind),
      // Screens that read these are only mounted once a student is loaded; the fallback keeps the hook total.
      homeCoordinate: state.students.length > 0 ? L.homeCoordinate(state) : NOWHERE,
      schoolCoordinate: state.students.length > 0 ? L.schoolCoord(state) : NOWHERE,
      etaMinutes: (kind: TripKind) => L.etaMinutes(state, kind),
      etaDate: (kind: TripKind) => L.etaDate(state, kind),
      etaTitle: (kind: TripKind) => L.etaTitle(state, kind),
      overallProgress: (kind: TripKind) => L.overallProgress(state, kind),
      remainingDistanceKm: (kind: TripKind) => L.remainingDistanceKm(state, kind),
      absencesFor: (studentID: string) => L.absencesFor(state, studentID),
      subscriptionFor: (studentID: string) => state.subscriptions[studentID] ?? null,
    }),
    [state, derived, actions],
  );
});
