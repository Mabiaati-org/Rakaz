import type { RakazAuthUser } from './auth';
import type {
  RakazAbsenceReport,
  RakazStopStatus,
  RakazStudentAddress,
  RakazTripSnapshot,
} from './events';
import type { RakazPayment, RakazSubscription } from './finance';
import type { CanonicalStudentId } from './ids';
import type { ParentTripStatusValue } from './mapping';

export interface RakazParentSchool {
  id: string;
  name: string;
  address: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  phone: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
}

export interface RakazParentDriver {
  name: string;
  phone: string;
  /** Epoch ms the driver joined, or null when unknown. */
  joinedAt: number | null;
  vehicle: {
    busNumber: string;
    plateNumber: string;
    model: string;
    color: string;
    capacity: number | null;
  };
}

export interface RakazParentStudent {
  id: CanonicalStudentId;
  internalNumber: string;
  fullName: string;
  firstName: string;
  grade: string;
  stage: string;
  gender: 'male' | 'female' | null;
  birthDate: number | null;
  guardianName: string;
  guardianPhone: string;
  address: RakazStudentAddress;
  school: RakazParentSchool;
  /** Null until the student is assigned to a route with a driver. */
  driver: RakazParentDriver | null;
  route: { id: string; name: string } | null;
  stop: { sequence: number; pickupTime: string; dropoffTime: string } | null;
  subscription: RakazSubscription | null;
  payments: RakazPayment[];
}

export interface RakazSupportContact {
  adminPhone: string;
  whatsappNumber: string;
  privacyPolicyUrl: string;
}

/** Everything the parent app needs after sign-in. */
export interface RakazParentBootstrap {
  account: RakazAuthUser;
  students: RakazParentStudent[];
  /** Absences from today onwards. */
  absences: RakazAbsenceReport[];
  support: RakazSupportContact;
  serverTime: number;
}

/** A trip as seen by one guardian for one of their children. */
export interface RakazParentTripView extends RakazTripSnapshot {
  status: ParentTripStatusValue;
  studentId: CanonicalStudentId;
  studentStatus: RakazStopStatus;
  /** Status changes that already happened for this student, oldest first. */
  timeline: Array<{ status: ParentTripStatusValue; at: number }>;
  /** Scheduled pickup (morning) or drop-off (afternoon) time, HH:mm. */
  scheduledTime: string | null;
  /** How many stops the bus still serves before this student; null when not applicable. */
  stopsAhead: number | null;
}

export type RakazTicketKind = 'complaint' | 'feedback';
export type RakazTicketTopic = 'driver' | 'timing' | 'vehicle' | 'payment' | 'app' | 'other';
export type RakazTicketStatus = 'open' | 'inReview' | 'resolved';

export interface RakazSupportTicket {
  id: string;
  /** Short reference shown to the guardian, e.g. #4821 */
  code: string;
  kind: RakazTicketKind;
  topic: RakazTicketTopic;
  body: string;
  status: RakazTicketStatus;
  adminReply: string | null;
  createdAt: number;
  /** Filled for the dashboard. */
  authorName?: string;
  authorPhone?: string;
  /**
   * Route label for the author's assigned students (dashboard).
   * Empty when the guardian has no student on a route.
   */
  routeName?: string;
}

export interface RakazSupportTicketInput {
  kind: RakazTicketKind;
  topic: RakazTicketTopic;
  body: string;
}
