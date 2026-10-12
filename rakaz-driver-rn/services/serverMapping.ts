import type {
  RakazDriverBootstrap,
  RakazDriverRoute,
  RakazDriverTripState,
  RakazParentNotification,
  RakazStopStatus,
} from '@rakaz/contract';

import {
  type AdminNotification,
  type DriverProfile,
  NotificationKind,
  type Route,
  RouteOptimizationMode,
  type StopRecord,
  StopStatus,
  TripPhase,
  type TripState,
  emptyStopRecord,
  emptyTripState,
} from '@/types/models';

/** Shown until the administration assigns a route, so every screen still has a route object to read. */
export const NO_ROUTE: Route = {
  id: '',
  code: '',
  name: 'لم يُسند مسار بعد',
  school: { id: '', name: '', address: '', coordinate: { latitude: 33.3152, longitude: 44.3661 }, phone: '', startTime: '' },
  depot: { latitude: 33.3152, longitude: 44.3661 },
  students: [],
  stops: [],
  optimizationMode: RouteOptimizationMode.MANUAL,
  createdBy: 'إدارة النقل',
  updatedAt: 0,
};

export const hasRoute = (route: Route): boolean => route.code !== '';

export function profileFromServer(profile: RakazDriverBootstrap['profile']): DriverProfile {
  return {
    id: profile.uid,
    name: profile.name,
    phone: profile.phone.startsWith('+964') ? `0${profile.phone.slice(4)}` : profile.phone,
    busNumber: profile.vehicleLabel,
    plate: profile.plateNumber,
    adminPhone: profile.adminPhone,
  };
}

export function routeFromServer(route: RakazDriverRoute | null): Route {
  if (!route) return NO_ROUTE;
  return {
    id: route.id,
    code: route.id,
    name: route.name,
    school: route.school,
    depot: route.depot,
    students: route.students,
    stops: route.stops,
    optimizationMode: RouteOptimizationMode.MANUAL,
    createdBy: 'إدارة النقل',
    updatedAt: route.updatedAt,
  };
}

const STOP_STATUS: Record<RakazStopStatus, StopStatus> = {
  pending: StopStatus.PENDING,
  arrived: StopStatus.ARRIVED,
  pickedUp: StopStatus.PICKED_UP,
  absent: StopStatus.ABSENT,
  droppedOff: StopStatus.DROPPED_OFF,
};

function recordsFromServer(trip: RakazDriverTripState | null): Record<string, StopRecord> {
  const records: Record<string, StopRecord> = {};
  for (const s of trip?.students ?? []) {
    if (s.status === 'pending') continue;
    records[s.studentId] = { ...emptyStopRecord(), status: STOP_STATUS[s.status], arrivedAt: s.arrivedAt, completedAt: s.completedAt };
  }
  return records;
}

/** Rebuilds today's trip from the server, for a fresh install or a second device. */
export function tripFromServer(today: RakazDriverBootstrap['today']): TripState {
  const { morning, afternoon } = today;
  const morningStarted = morning != null && morning.phase !== 'notStarted';
  const afternoonStarted = afternoon != null && afternoon.phase !== 'notStarted';
  if (!morningStarted && !afternoonStarted) return emptyTripState();

  let phase = TripPhase.MORNING_PICKUP;
  if (afternoon?.phase === 'finished') phase = TripPhase.COMPLETED;
  else if (afternoonStarted) phase = TripPhase.RETURN_TRIP;
  else if (morning?.phase === 'atSchool' || morning?.phase === 'finished') phase = TripPhase.AT_SCHOOL;

  return {
    ...emptyTripState(),
    phase,
    morning: recordsFromServer(morning),
    afternoon: recordsFromServer(afternoon),
    startedAt: morning?.startedAt ?? afternoon?.startedAt ?? null,
    schoolArrivalAt: morning?.arrivedSchoolAt ?? null,
    returnStartedAt: afternoon?.startedAt ?? null,
    completedAt: afternoon?.endedAt ?? null,
  };
}

export function notificationFromServer(n: RakazParentNotification): AdminNotification {
  const kind =
    n.kind === 'emergency' || n.kind === 'delay'
      ? NotificationKind.URGENT
      : n.kind === 'routeChange'
        ? NotificationKind.ROUTE
        : NotificationKind.INFO;
  return { id: n.id, title: n.title, body: n.body, date: n.at, kind, isRead: n.read };
}
