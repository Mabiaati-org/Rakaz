import { RakazActionKind, type RakazNotificationKind, type RakazStopStatus, type RakazTripKind } from './events';
/**
 * Parent app TripStatus (numeric) — must match rakaz-parent-rn/types/models.ts TripStatus.
 */
export declare const ParentTripStatus: {
    readonly notStarted: 0;
    readonly preparing: 1;
    readonly driverOnTheWay: 2;
    readonly arrivedAtPickup: 3;
    readonly studentPickedUp: 4;
    readonly onTheWayToSchool: 5;
    readonly arrivedAtSchool: 6;
    readonly finished: 7;
};
export type ParentTripStatusValue = (typeof ParentTripStatus)[keyof typeof ParentTripStatus];
/** Coarse lifecycle of a whole trip (the bus), independent of any single student. */
export type RakazTripPhase = 'notStarted' | 'inProgress' | 'atSchool' | 'finished';
/** Trip-level status shown on the dashboard for a whole bus. */
export declare function tripStatusForPhase(phase: RakazTripPhase): ParentTripStatusValue;
/**
 * What one guardian should see for their own child, given the bus phase and the child's stop state.
 * Morning: home → school. Afternoon: school → home (`arrivedAtSchool` reads «تم تسليم الطالب»).
 */
export declare function parentStatusFor(tripKind: RakazTripKind, phase: RakazTripPhase, stop: RakazStopStatus): ParentTripStatusValue;
/** Which notification (if any) a driver action raises for the affected guardians. */
export declare function notificationForAction(action: RakazActionKind, tripKind: RakazTripKind): RakazNotificationKind | null;
