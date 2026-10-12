import type { RakazWorkSchedule } from './checkin';
import type { RakazGeoPoint, RakazStopStatus, RakazTripKind } from './events';
import type { CanonicalStudentId, RakazUid } from './ids';
import type { RakazTripPhase } from './mapping';
export interface RakazDriverProfile {
    uid: RakazUid;
    name: string;
    phone: string;
    vehicleLabel: string;
    plateNumber: string;
    /** Number the driver calls to reach the transport administration. */
    adminPhone: string;
}
export interface RakazDriverSchool {
    id: string;
    name: string;
    address: string;
    coordinate: RakazGeoPoint;
    phone: string;
    /** HH:mm */
    startTime: string;
}
export interface RakazDriverStudent {
    id: CanonicalStudentId;
    name: string;
    grade: string;
    area: string;
    street: string;
    home: RakazGeoPoint;
    guardianName: string;
    guardianPhone: string;
    notes: string | null;
}
export interface RakazDriverStop {
    studentId: CanonicalStudentId;
    /** HH:mm */
    pickupTime: string;
    /** HH:mm */
    dropoffTime: string;
}
export interface RakazDriverRoute {
    /** Route code, e.g. R-204 */
    id: string;
    name: string;
    school: RakazDriverSchool;
    depot: RakazGeoPoint;
    students: RakazDriverStudent[];
    /** Ordered pickup sequence. */
    stops: RakazDriverStop[];
    updatedAt: number;
}
/** Server-side state of one of today's trips, used to restore the app after a reinstall or login. */
export interface RakazDriverTripState {
    tripKind: RakazTripKind;
    phase: RakazTripPhase;
    startedAt: number | null;
    arrivedSchoolAt: number | null;
    endedAt: number | null;
    students: Array<{
        studentId: CanonicalStudentId;
        status: RakazStopStatus;
        arrivedAt: number | null;
        completedAt: number | null;
    }>;
}
/** Everything the driver app needs after sign-in. */
export interface RakazDriverBootstrap {
    profile: RakazDriverProfile;
    /** Null until the administration assigns a route to this driver. */
    route: RakazDriverRoute | null;
    today: {
        dateISO: string;
        morning: RakazDriverTripState | null;
        afternoon: RakazDriverTripState | null;
    };
    completedTripsTotal: number;
    /** When the app should send its 5-minute check-ins. */
    workSchedule: RakazWorkSchedule;
    serverTime: number;
}
