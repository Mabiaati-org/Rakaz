import type { CanonicalStudentId, CanonicalTripId, RakazUid } from './ids';

/** Geo point shared by the apps, the dashboard and the API. */
export interface RakazGeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Driver action kinds — must stay identical to `ActionKind` in rakaz-driver-rn/types/models.ts.
 */
export enum RakazActionKind {
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
}

export type RakazTripKind = 'morning' | 'afternoon';

/**
 * What the driver app sends for each queued action. The API derives the trip, route and
 * driver from the authenticated account, so the client never chooses them.
 */
export interface RakazDriverEventInput {
  /** Client-generated uuid; the API stores events idempotently by this id. */
  id: string;
  tripKind: RakazTripKind;
  action: RakazActionKind;
  studentId: CanonicalStudentId | null;
  /** Epoch ms (device clock) of when the driver performed the action. */
  at: number;
  location: RakazGeoPoint | null;
  detail: string | null;
  schemaVersion: 1;
}

/** One immutable trip event as stored by the API. */
export interface RakazTripEvent {
  /** Client-generated uuid; events are stored idempotently by this id. */
  id: string;
  tripId: CanonicalTripId;
  routeId: string;
  tripKind: RakazTripKind;
  action: RakazActionKind;
  /** Canonical STU-* id when the event is about a student; null for trip-level actions. */
  studentId: CanonicalStudentId | null;
  /** Epoch ms (device clock). */
  at: number;
  location: RakazGeoPoint | null;
  /** Free-text detail (absence reason, emergency note, reorder payload). */
  detail: string | null;
  driverUid: RakazUid | null;
  /** Schema version for forward-compatible changes. */
  schemaVersion: 1;
}

/** Live state of one daily trip (morning or afternoon) of a route. */
export interface RakazTripSnapshot {
  tripId: CanonicalTripId;
  routeId: string;
  tripKind: RakazTripKind;
  /** Parent TripStatus numeric value 0..7 — see mapping.ts */
  status: number;
  /** 0..1 progress hint for map animation; optional. */
  progress: number;
  driverUid: RakazUid | null;
  vehicleLabel: string | null;
  updatedAt: number;
  /** Set when afternoon drop-off happens; parent shows handover sheet. */
  handoverPending: boolean;
  handoverConfirmedAt: number | null;
  /** Last known bus position for the live map. */
  busLocation: RakazGeoPoint | null;
  /** Epoch ms of the last bus position, or null when none was received yet. */
  busUpdatedAt: number | null;
  /** Calendar day of the trip (YYYY-MM-DD, school timezone). */
  dateISO: string;
  startedAt: number | null;
  endedAt: number | null;
}

export type RakazStopStatus = 'pending' | 'arrived' | 'pickedUp' | 'absent' | 'droppedOff';

/** Per-student state inside a trip. */
export interface RakazTripStudentState {
  studentId: CanonicalStudentId;
  studentName: string;
  status: RakazStopStatus;
  arrivedAt: number | null;
  completedAt: number | null;
  handoverPending: boolean;
  handoverConfirmedAt: number | null;
  handoverIssue: boolean;
}

/** Bus position sent periodically by the driver app while a trip is running. */
export interface RakazLocationPing {
  tripKind: RakazTripKind;
  latitude: number;
  longitude: number;
  /** Epoch ms (device clock). */
  at: number;
  speed: number | null;
  heading: number | null;
}

/** Parent → backend absence report. */
export interface RakazAbsenceReport {
  id: string;
  studentId: CanonicalStudentId;
  /** Start of local calendar day as epoch ms. */
  day: number;
  scope: 'fullDay' | 'morningOnly' | 'returnOnly';
  reason: 'none' | 'sick' | 'family' | 'travel' | 'appointment' | 'other';
  note: string;
  createdAt: number;
  guardianUid: RakazUid | null;
  /** Filled by the API on reads. */
  studentName?: string;
  /** Epoch ms when the driver app fetched this report, or null. */
  seenByDriverAt?: number | null;
}

/** Full home address of a student, editable by the guardian. */
export interface RakazStudentAddress {
  governorate: string;
  area: string;
  neighborhood: string;
  street: string;
  landmark: string;
  accessNotes: string;
  latitude: number;
  longitude: number;
}

/** Parent → backend handover confirmation / issue for the afternoon drop-off. */
export interface RakazHandoverResult {
  tripId: CanonicalTripId;
  studentId: CanonicalStudentId;
  confirmed: boolean;
  issueReported: boolean;
  at: number;
}

/** Parent → backend absence report payload. */
export interface RakazAbsenceInput {
  studentId: CanonicalStudentId;
  /** Calendar day of the absence (YYYY-MM-DD). */
  dateISO: string;
  scope: RakazAbsenceReport['scope'];
  reason: RakazAbsenceReport['reason'];
  note: string;
}

/** Push / in-app notification kinds. */
export type RakazNotificationKind =
  | 'tripReminder'
  | 'tripStarted'
  | 'driverNear'
  | 'pickedUp'
  | 'arrivedSchool'
  | 'returnStarted'
  | 'delivered'
  | 'payment'
  | 'delay'
  | 'admin'
  | 'routeChange'
  | 'emergency';

/** One inbox item of the signed-in user (guardian, driver or admin). */
export interface RakazParentNotification {
  id: string;
  kind: RakazNotificationKind;
  title: string;
  body: string;
  studentId: CanonicalStudentId | null;
  tripId: CanonicalTripId | null;
  at: number;
  read: boolean;
}

/** Which notification kinds the user does not want pushed to their phone. The inbox still records them. */
export interface RakazNotificationPreferences {
  muted: RakazNotificationKind[];
}
