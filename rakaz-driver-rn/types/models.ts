/** Domain models mirrored 1:1 from the Android app (data/Models.kt). Timestamps are epoch millis. */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** Great-circle distance in meters. */
export function distanceTo(from: Coordinate, other: Coordinate): number {
  const r = 6_371_000;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(other.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(other.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Compass bearing in degrees from [from] toward [other]. */
export function bearingTo(from: Coordinate, other: Coordinate): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(other.latitude);
  const dLon = toRadians(other.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export enum NotificationKind {
  INFO = 'INFO',
  ROUTE = 'ROUTE',
  URGENT = 'URGENT',
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  date: number;
  kind: NotificationKind;
  isRead: boolean;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  busNumber: string;
  plate: string;
  adminPhone: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  coordinate: Coordinate;
  phone: string;
  startTime: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  area: string;
  street: string;
  home: Coordinate;
  guardianName: string;
  guardianPhone: string;
  notes: string | null;
}

export function studentInitials(student: Student): string {
  return student.name
    .split(' ')
    .filter((part) => part.trim().length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export function studentAddress(student: Student): string {
  return `${student.area} · ${student.street}`;
}

/** A single ordered stop on an admin-created route. */
export interface RouteStop {
  studentId: string;
  pickupTime: string;
  dropoffTime: string;
}

/** How stop order is produced. Manual is the default; automatic optimizers plug in later. */
export enum RouteOptimizationMode {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
}

export const RouteOptimizationModeTitle: Record<RouteOptimizationMode, string> = {
  [RouteOptimizationMode.MANUAL]: 'يدوي (من الإدارة)',
  [RouteOptimizationMode.AUTOMATIC]: 'تحسين تلقائي',
};

/** A route created by the administration for a driver. */
export interface Route {
  id: string;
  code: string;
  name: string;
  school: School;
  depot: Coordinate;
  students: Student[];
  stops: RouteStop[];
  optimizationMode: RouteOptimizationMode;
  createdBy: string;
  updatedAt: number;
}

export enum TripPhase {
  IDLE = 'IDLE',
  MORNING_PICKUP = 'MORNING_PICKUP',
  AT_SCHOOL = 'AT_SCHOOL',
  RETURN_TRIP = 'RETURN_TRIP',
  COMPLETED = 'COMPLETED',
}

export enum TripLeg {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
}

export enum StopStatus {
  PENDING = 'PENDING',
  ARRIVED = 'ARRIVED',
  PICKED_UP = 'PICKED_UP',
  ABSENT = 'ABSENT',
  DROPPED_OFF = 'DROPPED_OFF',
}

export const StopStatusTitle: Record<StopStatus, string> = {
  [StopStatus.PENDING]: 'بالانتظار',
  [StopStatus.ARRIVED]: 'في المحطة',
  [StopStatus.PICKED_UP]: 'تم الاستلام',
  [StopStatus.ABSENT]: 'غائب',
  [StopStatus.DROPPED_OFF]: 'تم التسليم',
};

export function isDone(status: StopStatus): boolean {
  return status === StopStatus.PICKED_UP || status === StopStatus.ABSENT || status === StopStatus.DROPPED_OFF;
}

/** Everything recorded at a stop: arrival, outcome, timestamp and where it happened. */
export interface StopRecord {
  status: StopStatus;
  arrivedAt: number | null;
  completedAt: number | null;
  location: Coordinate | null;
  isEstimatedLocation: boolean;
}

export function emptyStopRecord(): StopRecord {
  return { status: StopStatus.PENDING, arrivedAt: null, completedAt: null, location: null, isEstimatedLocation: false };
}

export interface TripState {
  phase: TripPhase;
  morning: Record<string, StopRecord>;
  afternoon: Record<string, StopRecord>;
  startedAt: number | null;
  schoolArrivalAt: number | null;
  schoolArrivalLocation: Coordinate | null;
  returnStartedAt: number | null;
  completedAt: number | null;
}

export function emptyTripState(): TripState {
  return {
    phase: TripPhase.IDLE,
    morning: {},
    afternoon: {},
    startedAt: null,
    schoolArrivalAt: null,
    schoolArrivalLocation: null,
    returnStartedAt: null,
    completedAt: null,
  };
}

export enum ActionKind {
  START_TRIP = 'START_TRIP',
  ARRIVED_AT_STOP = 'ARRIVED_AT_STOP',
  PICKED_UP = 'PICKED_UP',
  MARKED_ABSENT = 'MARKED_ABSENT',
  ARRIVED_AT_SCHOOL = 'ARRIVED_AT_SCHOOL',
  START_RETURN = 'START_RETURN',
  DROPPED_OFF = 'DROPPED_OFF',
  END_TRIP = 'END_TRIP',
  EMERGENCY = 'EMERGENCY',
  REORDER_STOPS = 'REORDER_STOPS',
  UNDO_STOP = 'UNDO_STOP',
  EMERGENCY_RESOLVED = 'EMERGENCY_RESOLVED',
}

export const ActionKindTitle: Record<ActionKind, string> = {
  [ActionKind.START_TRIP]: 'بدء الرحلة',
  [ActionKind.ARRIVED_AT_STOP]: 'الوصول إلى محطة',
  [ActionKind.PICKED_UP]: 'استلام طالب',
  [ActionKind.MARKED_ABSENT]: 'تسجيل غياب',
  [ActionKind.ARRIVED_AT_SCHOOL]: 'الوصول إلى المدرسة',
  [ActionKind.START_RETURN]: 'بدء رحلة العودة',
  [ActionKind.DROPPED_OFF]: 'تسليم طالب',
  [ActionKind.END_TRIP]: 'إنهاء الرحلة',
  [ActionKind.EMERGENCY]: 'بلاغ طوارئ',
  [ActionKind.REORDER_STOPS]: 'تعديل ترتيب المحطات',
  [ActionKind.UNDO_STOP]: 'تراجع عن إجراء',
  [ActionKind.EMERGENCY_RESOLVED]: 'انتهاء الطوارئ',
};

/** An offline-first event, queued locally and flushed to the server when connectivity returns. */
export interface PendingAction {
  id: string;
  kind: ActionKind;
  /** The leg the driver was on when the action happened; fixed here so a late upload is filed correctly. */
  tripKind: 'morning' | 'afternoon';
  studentId: string | null;
  timestamp: number;
  location: Coordinate | null;
  detail: string | null;
}

/** Everything persisted locally so the driver can keep working offline. */
export interface AppSnapshot {
  profile: DriverProfile | null;
  route: Route;
  trip: TripState;
  pending: PendingAction[];
  notifications: AdminNotification[];
  lastSyncAt: number | null;
  completedTripsTotal: number;
  /** True while the account still uses the temporary password issued by the administration. */
  mustChangePassword: boolean;
}

/** A stop row resolved for display on the active leg. */
export interface LegStop {
  student: Student;
  scheduled: string;
  record: StopRecord;
}
