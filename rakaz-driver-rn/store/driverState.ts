import {
  type AdminNotification,
  type Coordinate,
  type DriverProfile,
  type LegStop,
  type PendingAction,
  type Route,
  type Student,
  StopStatus,
  TripLeg,
  TripPhase,
  type TripState,
  type WorkSchedule,
  distanceTo,
  emptyStopRecord,
  emptyTripState,
  isDone,
} from '@/types/models';

/** GPS fixes farther than this from the school are treated as unrelated to the route (emulators, travel). */
export const GPS_RADIUS_METERS = 60_000;

/** Immutable UI state for the whole driver app (mirrors DriverState.kt). */
export interface DriverState {
  profile: DriverProfile | null;
  route: Route;
  trip: TripState;
  pending: PendingAction[];
  notifications: AdminNotification[];
  lastSyncAt: number | null;
  completedTripsTotal: number;
  mustChangePassword: boolean;
  workSchedule: WorkSchedule | null;
  networkConnected: boolean;
  isSyncing: boolean;
  isChecking: boolean;
  emergencyActive: boolean;
  gps: Coordinate | null;
}

export function initialDriverState(route: Route): DriverState {
  return {
    profile: null,
    route,
    trip: emptyTripState(),
    pending: [],
    notifications: [],
    lastSyncAt: null,
    completedTripsTotal: 0,
    mustChangePassword: false,
    workSchedule: null,
    networkConnected: true,
    isSyncing: false,
    isChecking: false,
    emergencyActive: false,
    gps: null,
  };
}

export const isOnline = (s: DriverState): boolean => s.networkConnected;

export const unreadCount = (s: DriverState): number => s.notifications.filter((n) => !n.isRead).length;

export const findStudent = (s: DriverState, id: string): Student | undefined =>
  s.route.students.find((st) => st.id === id);

export const currentLeg = (s: DriverState): TripLeg =>
  s.trip.phase === TripPhase.RETURN_TRIP || s.trip.phase === TripPhase.COMPLETED ? TripLeg.AFTERNOON : TripLeg.MORNING;

/** GPS fix if it is within [GPS_RADIUS_METERS] of the school, otherwise null. */
export function nearbyGps(s: DriverState): Coordinate | null {
  return s.gps != null && distanceTo(s.gps, s.route.school.coordinate) < GPS_RADIUS_METERS ? s.gps : null;
}

/** Morning: admin stop order. Return: reverse order, only students picked up in the morning. */
export function legStops(s: DriverState): LegStop[] {
  const result: LegStop[] = [];
  if (currentLeg(s) === TripLeg.MORNING) {
    for (const stop of s.route.stops) {
      const student = findStudent(s, stop.studentId);
      if (!student) continue;
      result.push({ student, scheduled: stop.pickupTime, record: s.trip.morning[stop.studentId] ?? emptyStopRecord() });
    }
  } else {
    for (const stop of [...s.route.stops].reverse()) {
      const student = findStudent(s, stop.studentId);
      if (!student) continue;
      if (s.trip.morning[stop.studentId]?.status !== StopStatus.PICKED_UP) continue;
      result.push({ student, scheduled: stop.dropoffTime, record: s.trip.afternoon[stop.studentId] ?? emptyStopRecord() });
    }
  }
  return result;
}

/** All derived values a screen needs, computed once per state change. */
export interface DriverDerived {
  isOnline: boolean;
  unreadCount: number;
  currentLeg: TripLeg;
  legStops: LegStop[];
  nextStop: LegStop | null;
  doneCount: number;
  pickedUpCount: number;
  droppedOffCount: number;
  absentCount: number;
  onBoardCount: number;
  progress: number;
  currentPosition: Coordinate;
  remainingPath: Coordinate[];
  remainingMeters: number;
  etaToDestination: number;
  tripTitle: string;
  routeSubtitle: string;
}

/** Real GPS fix when near the route; otherwise the last completed stop. */
export function currentPosition(s: DriverState, stops: LegStop[] = legStops(s)): Coordinate {
  const gps = nearbyGps(s);
  if (gps) return gps;
  if (s.trip.phase === TripPhase.AT_SCHOOL) return s.route.school.coordinate;
  for (let i = stops.length - 1; i >= 0; i--) {
    const stop = stops[i];
    if (stop && (isDone(stop.record.status) || stop.record.status === StopStatus.ARRIVED)) return stop.student.home;
  }
  return currentLeg(s) === TripLeg.MORNING ? s.route.depot : s.route.school.coordinate;
}

export function deriveDriverState(s: DriverState): DriverDerived {
  const leg = currentLeg(s);
  const stops = legStops(s);
  const phase = s.trip.phase;

  const nextStop =
    phase === TripPhase.MORNING_PICKUP || phase === TripPhase.RETURN_TRIP || phase === TripPhase.IDLE
      ? (stops.find((st) => !isDone(st.record.status)) ?? null)
      : null;

  const doneCount = stops.filter((st) => isDone(st.record.status)).length;
  const morningRecords = Object.values(s.trip.morning);
  const pickedUpCount = morningRecords.filter((r) => r.status === StopStatus.PICKED_UP).length;
  const droppedOffCount = Object.values(s.trip.afternoon).filter((r) => r.status === StopStatus.DROPPED_OFF).length;
  const absentCount = morningRecords.filter((r) => r.status === StopStatus.ABSENT).length;

  const onBoardCount =
    phase === TripPhase.MORNING_PICKUP ? pickedUpCount : phase === TripPhase.RETURN_TRIP ? pickedUpCount - droppedOffCount : 0;

  const position = currentPosition(s, stops);
  const remainingPath: Coordinate[] = [position, ...stops.filter((st) => !isDone(st.record.status)).map((st) => st.student.home)];
  if (leg === TripLeg.MORNING && phase !== TripPhase.AT_SCHOOL) remainingPath.push(s.route.school.coordinate);

  let remainingMeters = 0;
  for (let i = 1; i < remainingPath.length; i++) {
    const a = remainingPath[i - 1];
    const b = remainingPath[i];
    if (a && b) remainingMeters += distanceTo(a, b) * 1.3;
  }

  const open = stops.filter((st) => !isDone(st.record.status)).length;
  const etaToDestination = Date.now() + Math.trunc((remainingMeters / 7.5 + open * 60) * 1000);

  const tripTitle =
    phase === TripPhase.AT_SCHOOL
      ? 'في المدرسة'
      : phase === TripPhase.RETURN_TRIP
        ? 'رحلة العودة'
        : phase === TripPhase.COMPLETED
          ? 'انتهت الرحلة'
          : 'رحلة الصباح';

  return {
    isOnline: isOnline(s),
    unreadCount: unreadCount(s),
    currentLeg: leg,
    legStops: stops,
    nextStop,
    doneCount,
    pickedUpCount,
    droppedOffCount,
    absentCount,
    onBoardCount,
    progress: stops.length === 0 ? 0 : doneCount / stops.length,
    currentPosition: position,
    remainingPath,
    remainingMeters,
    etaToDestination,
    tripTitle,
    routeSubtitle: leg === TripLeg.MORNING ? s.route.name : 'من المدرسة إلى المنازل',
  };
}
