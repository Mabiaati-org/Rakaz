import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { RakazApiError, rakazErrorText, todayISO } from '@rakaz/contract';

import { client, driverApi, onSessionLost } from '@/services/api';
import { BusTracking } from '@/services/busTracking';
import { Checkins } from '@/services/checkin';
import { LocationTracker } from '@/services/location';
import { NetworkMonitor } from '@/services/network';
import { PersistenceService } from '@/services/persistence';
import { Push } from '@/services/push';
import { ManualRouteOptimizer, NearestNeighborOptimizer } from '@/services/routeOptimizer';
import {
  NO_ROUTE,
  notificationFromServer,
  profileFromServer,
  routeFromServer,
  tripFromServer,
} from '@/services/serverMapping';
import { SyncService } from '@/services/sync';
import {
  ActionKind,
  type AppSnapshot,
  type Coordinate,
  RouteOptimizationMode,
  type StopRecord,
  StopStatus,
  TripLeg,
  TripPhase,
  emptyStopRecord,
  emptyTripState,
} from '@/types/models';
import { ArabicFormat } from '@/utils/arabicFormat';
import { type FeedbackKind, notifyHaptic } from '@/utils/haptics';

import {
  type DriverDerived,
  type DriverState,
  currentLeg,
  currentPosition,
  deriveDriverState,
  findStudent,
  initialDriverState,
  isOnline,
  nearbyGps,
} from './driverState';

/** One-shot feedback (toast + haptic). */
export interface DriverToast {
  id: number;
  message: string;
  kind: FeedbackKind;
}

export interface DriverActions {
  /** Resolves to an Arabic error message, or null on success. */
  login(phone: string, password: string): Promise<string | null>;
  logout(): void;
  /** Resolves to an Arabic error message, or null on success. */
  changePassword(currentPassword: string, newPassword: string): Promise<string | null>;
  /** Resolves to an Arabic error message, or null on success. */
  deleteAccount(password: string): Promise<string | null>;
  /** Reloads profile, route and notifications from the server. */
  refresh(): Promise<void>;
  startTrip(): void;
  arrive(studentId: string): void;
  pickUp(studentId: string): void;
  markAbsent(studentId: string, reason: string): void;
  undo(studentId: string): void;
  arriveSchool(): void;
  startReturn(): void;
  /** Return-leg hand-over; [pickUp] already records a drop-off when called on the afternoon leg. */
  dropOff(studentId: string): void;
  endTrip(): void;
  resetForNewDay(): void;
  triggerEmergency(type: string, note: string): void;
  resolveEmergency(): void;
  moveStop(from: number, to: number): void;
  applyOptimization(mode: RouteOptimizationMode): void;
  markAllRead(): void;
  markRead(id: string): void;
  sync(): void;
  checkConnection(): void;
}

export interface DriverStore extends DriverActions {
  state: DriverState;
  derived: DriverDerived;
  hydrated: boolean;
  toast: DriverToast | null;
}

const now = (): number => Date.now();
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000, 120_000];

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function snapshotOf(s: DriverState): AppSnapshot {
  return {
    profile: s.profile,
    route: s.route,
    trip: s.trip,
    pending: s.pending,
    notifications: s.notifications,
    lastSyncAt: s.lastSyncAt,
    completedTripsTotal: s.completedTripsTotal,
    mustChangePassword: s.mustChangePassword,
    workSchedule: s.workSchedule,
  };
}

function fromSnapshot(snap: AppSnapshot): DriverState {
  return {
    ...initialDriverState(snap.route),
    profile: snap.profile,
    trip: snap.trip,
    pending: snap.pending,
    notifications: snap.notifications,
    lastSyncAt: snap.lastSyncAt,
    completedTripsTotal: snap.completedTripsTotal,
    mustChangePassword: snap.mustChangePassword,
    workSchedule: snap.workSchedule,
  };
}

/** A trip that started on an earlier calendar day is over, whatever state the app was left in. */
const isFromEarlierDay = (startedAt: number | null): boolean =>
  startedAt != null && todayISO(new Date(startedAt)) !== todayISO();

const tripKindOf = (s: DriverState): 'morning' | 'afternoon' =>
  currentLeg(s) === TripLeg.AFTERNOON ? 'afternoon' : 'morning';

const isTripRunning = (phase: TripPhase): boolean => phase === TripPhase.MORNING_PICKUP || phase === TripPhase.RETURN_TRIP;

/**
 * Single source of truth for the driver app. Offline-first: every action updates local state,
 * is persisted immediately and queued for sync with the administration backend.
 */
export const [DriverStoreProvider, useDriverStore] = createContextHook<DriverStore>(() => {
  const [state, setState] = useState<DriverState>(() => initialDriverState(NO_ROUTE));
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<DriverToast | null>(null);

  // Mirrors the latest state synchronously so chained actions read fresh values (like StateFlow.value).
  const stateRef = useRef(state);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const location = useRef(new LocationTracker()).current;
  const network = useRef(new NetworkMonitor()).current;

  const actions = useMemo<DriverActions>(() => {
    const get = (): DriverState => stateRef.current;

    const update = (change: (s: DriverState) => DriverState): void => {
      const next = change(stateRef.current);
      stateRef.current = next;
      setState(next);
    };

    const persist = (): void => {
      void PersistenceService.save(snapshotOf(get()));
    };

    const emit = (message: string, kind: FeedbackKind = 'SUCCESS'): void => {
      notifyHaptic(kind);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ id: now(), message, kind });
      toastTimer.current = setTimeout(() => setToast(null), 2200);
    };

    /** GPS when it is within 60 km of the school; otherwise the fallback, flagged as estimated. */
    const stamp = (fallback: Coordinate | null | undefined): { coord: Coordinate | null; estimated: boolean } => {
      const gps = nearbyGps(get());
      return gps ? { coord: gps, estimated: false } : { coord: fallback ?? null, estimated: true };
    };

    const mutateRecord = (studentId: string, change: (r: StopRecord) => StopRecord): void => {
      update((s) => {
        const trip =
          currentLeg(s) === TripLeg.MORNING
            ? { ...s.trip, morning: { ...s.trip.morning, [studentId]: change(s.trip.morning[studentId] ?? emptyStopRecord()) } }
            : { ...s.trip, afternoon: { ...s.trip.afternoon, [studentId]: change(s.trip.afternoon[studentId] ?? emptyStopRecord()) } };
        return { ...s, trip };
      });
    };

    /** Clears every trace of the signed-in account from this device. */
    const resetLocal = (): void => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      void BusTracking.stop();
      void Checkins.reset();
      void PersistenceService.clear();
      update(() => ({ ...initialDriverState(NO_ROUTE), networkConnected: get().networkConnected }));
    };

    const applyParentAbsences = async (): Promise<void> => {
      if (get().profile == null || !isOnline(get())) return;
      const reports = await SyncService.pullAbsences();
      if (reports.length === 0) return;
      const leg = currentLeg(get());
      const bag = leg === TripLeg.AFTERNOON ? get().trip.afternoon : get().trip.morning;
      let changed = false;
      for (const report of reports) {
        if (!findStudent(get(), report.studentId)) continue;
        const record = bag[report.studentId];
        if (record && record.status !== StopStatus.PENDING) continue;
        if (report.scope === 'morningOnly' && leg !== TripLeg.MORNING) continue;
        if (report.scope === 'returnOnly' && leg !== TripLeg.AFTERNOON) continue;
        mutateRecord(report.studentId, (r) => ({ ...r, status: StopStatus.ABSENT, completedAt: report.createdAt }));
        changed = true;
      }
      if (changed) persist();
    };

    const loadNotifications = async (): Promise<void> => {
      try {
        const items = await client.notifications.list();
        update((s) => ({ ...s, notifications: items.map(notificationFromServer) }));
        persist();
      } catch {
        // Keep showing the cached list while offline.
      }
    };

    /** Loads the account's real data. Throws when the server cannot be reached. */
    const bootstrap = async (): Promise<void> => {
      const boot = await driverApi.bootstrap();
      update((s) => {
        const staleTrip = isFromEarlierDay(s.trip.startedAt);
        // The device is the source of truth for a trip it is running; the server only fills a blank slate.
        const trip = s.trip.phase === TripPhase.IDLE || staleTrip ? tripFromServer(boot.today) : s.trip;
        return {
          ...s,
          profile: profileFromServer(boot.profile),
          route: routeFromServer(boot.route),
          trip,
          completedTripsTotal: boot.completedTripsTotal,
          mustChangePassword: false,
          workSchedule: boot.workSchedule,
        };
      });
      persist();
      await loadNotifications();
    };

    const scheduleRetry = (): void => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      const delay = RETRY_DELAYS_MS[Math.min(retryAttempt.current, RETRY_DELAYS_MS.length - 1)] ?? 120_000;
      retryAttempt.current += 1;
      retryTimer.current = setTimeout(() => sync(), delay);
    };

    const sync = (): void => {
      const s = get();
      if (s.profile == null || s.mustChangePassword) return;
      void applyParentAbsences();
      if (!isOnline(s) || s.isSyncing || s.pending.length === 0) return;
      update((st) => ({ ...st, isSyncing: true }));
      void (async () => {
        const batch = get().pending;
        try {
          await SyncService.send(batch);
          const sent = new Set(batch.map((a) => a.id));
          update((st) => ({ ...st, pending: st.pending.filter((a) => !sent.has(a.id)), lastSyncAt: now() }));
          retryAttempt.current = 0;
          // The completed-trips total is counted by the server; pick it up once a leg has ended.
          if (batch.some((a) => a.kind === ActionKind.END_TRIP || a.kind === ActionKind.START_RETURN)) {
            void bootstrap().catch(() => undefined);
          }
        } catch (error) {
          // Malformed events can never be accepted and would block the queue forever, so they are dropped.
          // Anything else (offline, no route assigned yet, a session problem) keeps the queue for a retry.
          const malformed = error instanceof RakazApiError && (error.status === 400 || error.status === 422);
          if (malformed) {
            const sent = new Set(batch.map((a) => a.id));
            update((st) => ({ ...st, pending: st.pending.filter((a) => !sent.has(a.id)) }));
            emit(rakazErrorText(error), 'WARNING');
          } else {
            if (error instanceof RakazApiError && error.code === 'NO_ROUTE_ASSIGNED') emit(error.display, 'WARNING');
            scheduleRetry();
          }
        }
        update((st) => ({ ...st, isSyncing: false }));
        persist();
        if (get().pending.length > 0 && retryAttempt.current === 0) sync();
      })();
    };

    const record = (
      kind: ActionKind,
      studentId: string | null = null,
      locationStamp: Coordinate | null = null,
      detail: string | null = null,
    ): void => {
      const action = { id: uuid(), kind, tripKind: tripKindOf(get()), studentId, timestamp: now(), location: locationStamp, detail };
      update((s) => ({ ...s, pending: [...s.pending, action] }));
      persist();
      sync();
    };

    const startTrip = (): void => {
      if (get().trip.phase !== TripPhase.IDLE) return;
      update((s) => ({ ...s, trip: { ...s.trip, phase: TripPhase.MORNING_PICKUP, startedAt: now() } }));
      record(ActionKind.START_TRIP, null, stamp(get().route.depot).coord);
    };

    const pickUp = (studentId: string): void => {
      const { coord, estimated } = stamp(findStudent(get(), studentId)?.home);
      const morning = currentLeg(get()) === TripLeg.MORNING;
      mutateRecord(studentId, (r) => ({
        ...r,
        status: morning ? StopStatus.PICKED_UP : StopStatus.DROPPED_OFF,
        completedAt: now(),
        location: coord,
        isEstimatedLocation: estimated,
        arrivedAt: r.arrivedAt ?? now(),
      }));
      record(morning ? ActionKind.PICKED_UP : ActionKind.DROPPED_OFF, studentId, coord);
      emit((morning ? 'تم الاستلام · ' : 'تم التسليم · ') + ArabicFormat.time(now()));
    };

    return {
      async login(phone, password) {
        try {
          const session = await client.login(phone, password);
          if (session.user.role !== 'driver') {
            await client.logout();
            return 'هذا الحساب ليس حساب سائق';
          }
          if (session.user.mustChangePassword) {
            // Nothing else is reachable until the temporary password is replaced.
            update((s) => ({
              ...s,
              profile: { id: session.user.uid, name: session.user.name, phone: session.user.phone, busNumber: '', plate: '', adminPhone: '' },
              mustChangePassword: true,
            }));
            persist();
            return null;
          }
          await bootstrap();
          notifyHaptic('SUCCESS');
          void Push.register();
          return null;
        } catch (error) {
          return rakazErrorText(error);
        }
      },

      logout() {
        notifyHaptic('WARNING');
        void Push.unregister().then(() => client.logout());
        resetLocal();
      },

      async changePassword(currentPassword, newPassword) {
        try {
          await client.changePassword(currentPassword, newPassword);
          await bootstrap();
          void Push.register();
          emit('تم تغيير كلمة المرور');
          return null;
        } catch (error) {
          return rakazErrorText(error);
        }
      },

      async deleteAccount(password) {
        try {
          await client.deleteAccount(password);
          resetLocal();
          return null;
        } catch (error) {
          return rakazErrorText(error);
        }
      },

      async refresh() {
        if (get().profile == null || get().mustChangePassword) return;
        try {
          await bootstrap();
        } catch {
          // Offline: keep working from the cached route.
        }
      },

      startTrip,

      arrive(studentId) {
        if (get().trip.phase === TripPhase.IDLE) startTrip();
        const { coord, estimated } = stamp(findStudent(get(), studentId)?.home);
        mutateRecord(studentId, (r) => ({
          ...r,
          status: StopStatus.ARRIVED,
          arrivedAt: now(),
          location: coord,
          isEstimatedLocation: estimated,
        }));
        record(ActionKind.ARRIVED_AT_STOP, studentId, coord);
        emit(isOnline(get()) ? 'تم تسجيل الوصول · أُبلغ ولي الأمر' : 'تم تسجيل الوصول · سيُبلَّغ ولي الأمر عند عودة الاتصال');
      },

      pickUp,

      dropOff: pickUp,

      markAbsent(studentId, reason) {
        if (get().trip.phase === TripPhase.IDLE) startTrip();
        const { coord, estimated } = stamp(findStudent(get(), studentId)?.home);
        mutateRecord(studentId, (r) => ({
          ...r,
          status: StopStatus.ABSENT,
          completedAt: now(),
          location: coord,
          isEstimatedLocation: estimated,
        }));
        record(ActionKind.MARKED_ABSENT, studentId, coord, reason);
        emit('تم تسجيل الغياب', 'WARNING');
      },

      undo(studentId) {
        mutateRecord(studentId, () => emptyStopRecord());
        notifyHaptic('WARNING');
        // The guardian and the dashboard already saw the action, so the correction must reach them too.
        record(ActionKind.UNDO_STOP, studentId);
      },

      arriveSchool() {
        if (get().trip.phase !== TripPhase.MORNING_PICKUP) return;
        const { coord } = stamp(get().route.school.coordinate);
        update((s) => ({
          ...s,
          trip: { ...s.trip, phase: TripPhase.AT_SCHOOL, schoolArrivalAt: now(), schoolArrivalLocation: coord },
        }));
        record(ActionKind.ARRIVED_AT_SCHOOL, null, coord);
        emit('تم تسجيل الوصول إلى المدرسة');
      },

      startReturn() {
        if (get().trip.phase !== TripPhase.AT_SCHOOL) return;
        update((s) => ({ ...s, trip: { ...s.trip, phase: TripPhase.RETURN_TRIP, returnStartedAt: now() } }));
        notifyHaptic('SUCCESS');
        record(ActionKind.START_RETURN, null, stamp(get().route.school.coordinate).coord);
      },

      endTrip() {
        update((s) => ({
          ...s,
          trip: { ...s.trip, phase: TripPhase.COMPLETED, completedAt: now() },
        }));
        record(ActionKind.END_TRIP);
        emit(isOnline(get()) ? 'تم إرسال تقرير الرحلة إلى الإدارة' : 'انتهت الرحلة · سيُرسل التقرير عند عودة الاتصال');
      },

      resetForNewDay() {
        update((s) => ({ ...s, trip: emptyTripState() }));
        notifyHaptic('SUCCESS');
        persist();
      },

      triggerEmergency(type, note) {
        update((s) => ({ ...s, emergencyActive: true }));
        notifyHaptic('ERROR');
        record(ActionKind.EMERGENCY, null, stamp(currentPosition(get())).coord, `${type} — ${note}`);
      },

      resolveEmergency() {
        notifyHaptic('SUCCESS');
        update((s) => ({ ...s, emergencyActive: false }));
        record(ActionKind.EMERGENCY_RESOLVED, null, stamp(currentPosition(get())).coord);
      },

      moveStop(from, to) {
        const stops = [...get().route.stops];
        if (from < 0 || from >= stops.length || to < 0 || to >= stops.length) return;
        const [moved] = stops.splice(from, 1);
        if (!moved) return;
        stops.splice(to, 0, moved);
        update((s) => ({
          ...s,
          route: { ...s.route, stops, optimizationMode: RouteOptimizationMode.MANUAL, updatedAt: now() },
        }));
        record(ActionKind.REORDER_STOPS, null, null, stops.map((st) => st.studentId).join(','));
      },

      applyOptimization(mode) {
        const route = get().route;
        const optimizer = mode === RouteOptimizationMode.AUTOMATIC ? NearestNeighborOptimizer : ManualRouteOptimizer;
        const pickups = route.stops.map((st) => st.pickupTime);
        const ordered = optimizer
          .order(route.stops, route.students, route.depot, route.school.coordinate)
          .map((stop, i) => ({ ...stop, pickupTime: pickups[i] ?? stop.pickupTime }));
        update((s) => ({ ...s, route: { ...s.route, stops: ordered, optimizationMode: mode, updatedAt: now() } }));
        // The server stores the order itself, so it gets the resulting sequence rather than the mode.
        record(ActionKind.REORDER_STOPS, null, null, ordered.map((st) => st.studentId).join(','));
        emit(mode === RouteOptimizationMode.AUTOMATIC ? 'تم تحسين الترتيب تلقائياً' : 'تم اعتماد الترتيب يدوياً');
      },

      markAllRead() {
        update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, isRead: true })) }));
        notifyHaptic('SUCCESS');
        persist();
        void client.notifications.markAllRead().catch(() => undefined);
      },

      markRead(id) {
        update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }));
        persist();
        void client.notifications.markRead(id).catch(() => undefined);
      },

      sync,

      checkConnection() {
        update((s) => ({ ...s, isChecking: true }));
        void (async () => {
          const ok = await SyncService.ping();
          update((s) => ({ ...s, isChecking: false }));
          if (ok && isOnline(get())) {
            retryAttempt.current = 0;
            sync();
            emit(get().pending.length === 0 ? 'الاتصال ممتاز · كل البيانات متزامنة' : 'متصل · جارٍ المزامنة');
          } else {
            emit('غير متصل · سيتم حفظ الإجراءات ومزامنتها لاحقاً', 'WARNING');
          }
        })();
      },
    };
  }, []);

  // Restore the persisted snapshot, then start connectivity monitoring and refresh from the server.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [snap, connected, hasSession] = await Promise.all([
        PersistenceService.load(),
        network.isConnectedNow(),
        client.hasSession(),
      ]);
      if (cancelled) return;
      // A cached profile without a stored session cannot talk to the server; start signed out.
      const base = snap && hasSession ? fromSnapshot(snap) : stateRef.current;
      const trip = isFromEarlierDay(base.trip.startedAt) && base.pending.length === 0 ? emptyTripState() : base.trip;
      stateRef.current = { ...base, trip, networkConnected: connected };
      setState(stateRef.current);
      setHydrated(true);
      network.start((isConnected) => {
        const wasOnline = isOnline(stateRef.current);
        stateRef.current = { ...stateRef.current, networkConnected: isConnected };
        setState(stateRef.current);
        if (!wasOnline && isOnline(stateRef.current)) {
          retryAttempt.current = 0;
          actions.sync();
        }
      });
      await actions.refresh();
      actions.sync();
      if (stateRef.current.profile != null && !stateRef.current.mustChangePassword) void Push.register();
    })();

    const offSessionLost = onSessionLost(() => {
      void BusTracking.stop();
      void PersistenceService.clear();
      stateRef.current = { ...initialDriverState(NO_ROUTE), networkConnected: stateRef.current.networkConnected };
      setState(stateRef.current);
    });
    // Coming back to the app is the moment route changes and new absences matter.
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') void actions.refresh().then(() => actions.sync());
    });

    return () => {
      cancelled = true;
      network.stop();
      offSessionLost();
      appState.remove();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [actions, network]);

  // Ask for location once the driver is signed in, then stream GPS fixes into state.
  const loggedIn = state.profile != null && !state.mustChangePassword;
  useEffect(() => {
    if (!loggedIn) return undefined;
    void (async () => {
      await location.requestPermission();
      await location.start((gps) => {
        stateRef.current = { ...stateRef.current, gps };
        setState(stateRef.current);
        const s = stateRef.current;
        if (isTripRunning(s.trip.phase)) void BusTracking.reportForegroundFix(tripKindOf(s), gps.latitude, gps.longitude);
      });
    })();
    return () => location.stop();
  }, [loggedIn, location]);

  // On duty, report where the driver is every five minutes; the check itself is cheap, so it runs each minute.
  const workSchedule = state.workSchedule;
  useEffect(() => {
    if (!loggedIn) return undefined;
    const tick = (): void => void Checkins.tick(workSchedule);
    tick();
    const timer = setInterval(tick, 60_000);
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, [loggedIn, workSchedule]);

  // Share the bus position for exactly as long as a trip is running.
  const phase = state.trip.phase;
  useEffect(() => {
    if (!loggedIn) return;
    if (isTripRunning(phase)) void BusTracking.start(phase === TripPhase.RETURN_TRIP ? 'afternoon' : 'morning');
    else void BusTracking.stop();
  }, [loggedIn, phase]);

  const derived = useMemo(() => deriveDriverState(state), [state]);

  return { state, derived, hydrated, toast, ...actions };
});
