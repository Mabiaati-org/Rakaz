import { RakazActionKind, type RakazNotificationKind, type RakazStopStatus, type RakazTripKind } from './events';

/**
 * Parent app TripStatus (numeric) — must match rakaz-parent-rn/types/models.ts TripStatus.
 */
export const ParentTripStatus = {
  notStarted: 0,
  preparing: 1,
  driverOnTheWay: 2,
  arrivedAtPickup: 3,
  studentPickedUp: 4,
  onTheWayToSchool: 5,
  arrivedAtSchool: 6,
  finished: 7,
} as const;

export type ParentTripStatusValue = (typeof ParentTripStatus)[keyof typeof ParentTripStatus];

/** Coarse lifecycle of a whole trip (the bus), independent of any single student. */
export type RakazTripPhase = 'notStarted' | 'inProgress' | 'atSchool' | 'finished';

/** Trip-level status shown on the dashboard for a whole bus. */
export function tripStatusForPhase(phase: RakazTripPhase): ParentTripStatusValue {
  switch (phase) {
    case 'notStarted':
      return ParentTripStatus.notStarted;
    case 'inProgress':
      return ParentTripStatus.driverOnTheWay;
    case 'atSchool':
      return ParentTripStatus.arrivedAtSchool;
    case 'finished':
      return ParentTripStatus.finished;
  }
}

/**
 * What one guardian should see for their own child, given the bus phase and the child's stop state.
 * Morning: home → school. Afternoon: school → home (`arrivedAtSchool` reads «تم تسليم الطالب»).
 */
export function parentStatusFor(
  tripKind: RakazTripKind,
  phase: RakazTripPhase,
  stop: RakazStopStatus,
): ParentTripStatusValue {
  if (phase === 'notStarted' || stop === 'absent') return ParentTripStatus.notStarted;
  if (phase === 'finished') return ParentTripStatus.finished;

  if (tripKind === 'morning') {
    if (phase === 'atSchool') {
      return stop === 'pickedUp' ? ParentTripStatus.arrivedAtSchool : ParentTripStatus.finished;
    }
    if (stop === 'pickedUp') return ParentTripStatus.onTheWayToSchool;
    if (stop === 'arrived') return ParentTripStatus.arrivedAtPickup;
    return ParentTripStatus.driverOnTheWay;
  }

  if (stop === 'droppedOff') return ParentTripStatus.arrivedAtSchool;
  return ParentTripStatus.onTheWayToSchool;
}

/** Which notification (if any) a driver action raises for the affected guardians. */
export function notificationForAction(
  action: RakazActionKind,
  tripKind: RakazTripKind,
): RakazNotificationKind | null {
  const morning = tripKind === 'morning';
  switch (action) {
    case RakazActionKind.START_TRIP:
      return morning ? 'tripStarted' : 'returnStarted';
    case RakazActionKind.START_RETURN:
      return 'returnStarted';
    case RakazActionKind.ARRIVED_AT_STOP:
      return 'driverNear';
    case RakazActionKind.PICKED_UP:
      return 'pickedUp';
    case RakazActionKind.DROPPED_OFF:
      return 'delivered';
    case RakazActionKind.ARRIVED_AT_SCHOOL:
      return morning ? 'arrivedSchool' : null;
    case RakazActionKind.MARKED_ABSENT:
      return 'admin';
    case RakazActionKind.EMERGENCY:
      return 'delay';
    case RakazActionKind.END_TRIP:
    case RakazActionKind.REORDER_STOPS:
      return null;
  }
}
