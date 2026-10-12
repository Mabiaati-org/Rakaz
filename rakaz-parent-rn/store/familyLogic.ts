import { RouteGeometry } from '@/services/routeGeometry';
import {
  type Absence,
  AbsenceScope,
  addressCoordinate,
  type AppNotification,
  type Coordinate,
  eventDate,
  isSameDay,
  isToday,
  type NotificationPreferences,
  type Payment,
  schoolCoordinate,
  type Student,
  type Subscription,
  type SupportTicket,
  type Trip,
  TripKind,
  TripStatus,
} from '@/types/models';

export interface SupportContact {
  adminPhone: string;
  whatsappNumber: string;
  privacyPolicyUrl: string;
}

/** Central guardian-side state. Everything here comes from the Rakaz API. */
export interface FamilyState {
  /** False until the first bootstrap (or its cached copy) has been applied. */
  loaded: boolean;
  /** Set when the last refresh failed; the screens keep showing the cached data. */
  loadError: string | null;
  students: Student[];
  selectedStudentID: string;
  morningTrip: Trip;
  returnTrip: Trip;
  activeKind: TripKind;
  notifications: AppNotification[];
  absences: Absence[];
  tickets: SupportTicket[];
  subscriptions: Record<string, Subscription | null>;
  payments: Record<string, Payment[]>;
  support: SupportContact;
  preferences: NotificationPreferences;
  banner: AppNotification | null;
  /** Raised when the return trip drops the student home; the guardian confirms the handover. */
  handoverPending: boolean;
  handoverConfirmedAt: number | null;
}

export interface Legs {
  /** Bus heading to the pickup point. */
  first: Coordinate[];
  /** Pickup point to destination. */
  second: Coordinate[];
}

// Average door-to-door speed of a school bus in city traffic, and the dwell time at each stop.
const BUS_METRES_PER_MINUTE = 400; // 24 km/h
const MINUTES_PER_STOP = 1.5;

/** A trip that has not started and has no server data yet. */
export function idleTrip(kind: TripKind): Trip {
  const now = Date.now();
  return {
    id: '',
    kind,
    status: TripStatus.notStarted,
    scheduledStart: now,
    expectedArrival: now,
    progress: 0,
    events: [],
    updatedAt: now,
    busLocation: null,
    busUpdatedAt: null,
    stopsAhead: null,
  };
}

export function currentStudent(s: FamilyState): Student {
  return s.students.find((st) => st.id === s.selectedStudentID) ?? s.students[0];
}

export function tripFor(s: FamilyState, kind: TripKind): Trip {
  return kind === TripKind.morning ? s.morningTrip : s.returnTrip;
}

export function unreadCount(s: FamilyState): number {
  return s.notifications.filter((n) => !n.isRead).length;
}

export function todaysAbsence(s: FamilyState): Absence | null {
  return s.absences.find((a) => a.studentID === s.selectedStudentID && isToday(a.day)) ?? null;
}

export function isAbsentOn(s: FamilyState, kind: TripKind): boolean {
  const a = todaysAbsence(s);
  if (a == null) return false;
  switch (a.scope) {
    case AbsenceScope.fullDay:
      return true;
    case AbsenceScope.morningOnly:
      return kind === TripKind.morning;
    case AbsenceScope.returnOnly:
      return kind === TripKind.afternoon;
  }
}

export function homeCoordinate(s: FamilyState): Coordinate {
  return addressCoordinate(currentStudent(s).address);
}

export function schoolCoord(s: FamilyState): Coordinate {
  return schoolCoordinate(currentStudent(s).school);
}

export function pickupCoordinate(s: FamilyState, kind: TripKind): Coordinate {
  return kind === TripKind.morning ? homeCoordinate(s) : schoolCoord(s);
}

export function dropoffCoordinate(s: FamilyState, kind: TripKind): Coordinate {
  return kind === TripKind.morning ? schoolCoord(s) : homeCoordinate(s);
}

/** True while the bus has not reached the student's pickup point yet. */
const beforePickup = (trip: Trip): boolean => trip.status < TripStatus.arrivedAtPickup;

/** The live bus fix, only while the trip is running (an old fix after the trip would mislead). */
export function busLocation(s: FamilyState, kind: TripKind): Coordinate | null {
  const trip = tripFor(s, kind);
  const running = trip.status > TripStatus.notStarted && trip.status < TripStatus.finished;
  return running ? trip.busLocation : null;
}

/** Straight lines between the known points; the app has no road routing. */
export function legsFor(s: FamilyState, kind: TripKind): Legs {
  const trip = tripFor(s, kind);
  const pickup = pickupCoordinate(s, kind);
  const dropoff = dropoffCoordinate(s, kind);
  const bus = busLocation(s, kind);
  return { first: bus && beforePickup(trip) ? [bus, pickup] : [], second: [pickup, dropoff] };
}

/** Where to centre the map: the bus when its position is known, otherwise the next point of interest. */
export function vehicleCoordinate(s: FamilyState, kind: TripKind): Coordinate {
  const trip = tripFor(s, kind);
  return busLocation(s, kind) ?? (trip.status >= TripStatus.arrivedAtSchool ? dropoffCoordinate(s, kind) : pickupCoordinate(s, kind));
}

/** Estimated driving distance (km) the bus still covers for this student. */
export function remainingDistanceKm(s: FamilyState, kind: TripKind): number {
  const trip = tripFor(s, kind);
  if (trip.status >= TripStatus.arrivedAtSchool) return 0;
  const pickup = pickupCoordinate(s, kind);
  const dropoff = dropoffCoordinate(s, kind);
  const bus = busLocation(s, kind);
  const path = !bus ? [pickup, dropoff] : beforePickup(trip) ? [bus, pickup, dropoff] : [bus, dropoff];
  return RouteGeometry.roadLength(path) / 1000;
}

/**
 * Minutes until the next milestone (pickup before boarding, destination after).
 * Uses the live bus position when there is one, otherwise the timetable.
 */
export function etaMinutes(s: FamilyState, kind: TripKind): number {
  const trip = tripFor(s, kind);
  if (trip.status >= TripStatus.arrivedAtSchool) return 0;
  const bus = busLocation(s, kind);
  const target = beforePickup(trip) ? pickupCoordinate(s, kind) : dropoffCoordinate(s, kind);
  if (bus) {
    const driving = RouteGeometry.roadLength([bus, target]) / BUS_METRES_PER_MINUTE;
    const stops = beforePickup(trip) ? (trip.stopsAhead ?? 0) * MINUTES_PER_STOP : 0;
    return Math.max(1, Math.ceil(driving + stops));
  }
  const scheduled = beforePickup(trip) && kind === TripKind.morning ? trip.scheduledStart : trip.expectedArrival;
  return Math.max(1, Math.ceil((scheduled - Date.now()) / 60_000));
}

/** Expected time of arrival at the destination. */
export function etaDate(s: FamilyState, kind: TripKind): number {
  const trip = tripFor(s, kind);
  if (trip.status >= TripStatus.arrivedAtSchool) return eventDate(trip, TripStatus.arrivedAtSchool) ?? trip.expectedArrival;
  const bus = busLocation(s, kind);
  if (!bus || trip.status === TripStatus.notStarted) return trip.expectedArrival;
  const path = beforePickup(trip) ? [bus, pickupCoordinate(s, kind), dropoffCoordinate(s, kind)] : [bus, dropoffCoordinate(s, kind)];
  return Date.now() + Math.ceil(RouteGeometry.roadLength(path) / BUS_METRES_PER_MINUTE) * 60_000;
}

export function etaTitle(s: FamilyState, kind: TripKind): string {
  const trip = tripFor(s, kind);
  const morning = trip.kind === TripKind.morning;
  if (trip.status === TripStatus.notStarted) return morning ? 'الوصول المتوقع للمدرسة' : 'الوصول المتوقع للمنزل';
  if (trip.status < TripStatus.arrivedAtPickup) return morning ? 'وصول السائق إلى المنزل' : 'وصول السائق إلى المدرسة';
  if (trip.status >= TripStatus.arrivedAtSchool) return morning ? 'وصل إلى المدرسة' : 'وصل إلى المنزل';
  return morning ? 'الوصول المتوقع للمدرسة' : 'الوصول المتوقع للمنزل';
}

/** 0...1 progress across the whole trip (both legs). */
export function overallProgress(s: FamilyState, kind: TripKind): number {
  const trip = tripFor(s, kind);
  switch (trip.status) {
    case TripStatus.notStarted:
      return 0;
    case TripStatus.preparing:
      return 0.04;
    case TripStatus.driverOnTheWay:
      return 0.05 + trip.progress * 0.35;
    case TripStatus.arrivedAtPickup:
      return 0.42;
    case TripStatus.studentPickedUp:
      return 0.46;
    case TripStatus.onTheWayToSchool:
      return 0.48 + trip.progress * 0.5;
    case TripStatus.arrivedAtSchool:
    case TripStatus.finished:
      return 1;
  }
}

export function absencesFor(s: FamilyState, studentID: string): Absence[] {
  return s.absences.filter((a) => a.studentID === studentID);
}

export function replaceAbsenceForDay(absences: Absence[], absence: Absence): Absence[] {
  const rest = absences.filter((a) => !(a.studentID === absence.studentID && isSameDay(a.day, absence.day)));
  return [absence, ...rest].sort((a, b) => b.day - a.day);
}
