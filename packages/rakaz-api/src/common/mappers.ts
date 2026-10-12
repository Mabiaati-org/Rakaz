import type {
  RakazAbsenceReport,
  RakazNotificationKind,
  RakazPaymentMethod,
  RakazRole,
  RakazStopStatus,
  RakazTicketKind,
  RakazTicketStatus,
  RakazTicketTopic,
  RakazTripKind,
  RakazTripPhase,
} from '@rakaz/contract';

import type {
  AbsenceReason,
  AbsenceScope,
  NotificationKind,
  PaymentMethod,
  Role,
  StopStatus,
  TicketKind,
  TicketStatus,
  TicketTopic,
  TripKind,
  TripPhase,
} from '../generated/prisma/client.js';

/** Builds a two-way lookup between a database enum and its wire spelling. */
function bimap<D extends string, W extends string>(pairs: Record<D, W>) {
  const reverse = Object.fromEntries(Object.entries(pairs).map(([d, w]) => [w, d])) as Record<W, D>;
  return {
    toWire: (value: D): W => pairs[value],
    toDb: (value: W): D => reverse[value],
    wireValues: Object.values(pairs) as W[],
  };
}

export const roleMap = bimap<Role, RakazRole>({ ADMIN: 'admin', DRIVER: 'driver', GUARDIAN: 'guardian' });

export const tripKindMap = bimap<TripKind, RakazTripKind>({ MORNING: 'morning', AFTERNOON: 'afternoon' });

export const tripPhaseMap = bimap<TripPhase, RakazTripPhase>({
  NOT_STARTED: 'notStarted',
  IN_PROGRESS: 'inProgress',
  AT_SCHOOL: 'atSchool',
  FINISHED: 'finished',
});

export const stopStatusMap = bimap<StopStatus, RakazStopStatus>({
  PENDING: 'pending',
  ARRIVED: 'arrived',
  PICKED_UP: 'pickedUp',
  ABSENT: 'absent',
  DROPPED_OFF: 'droppedOff',
});

export const absenceScopeMap = bimap<AbsenceScope, RakazAbsenceReport['scope']>({
  FULL_DAY: 'fullDay',
  MORNING_ONLY: 'morningOnly',
  RETURN_ONLY: 'returnOnly',
});

export const absenceReasonMap = bimap<AbsenceReason, RakazAbsenceReport['reason']>({
  NONE: 'none',
  SICK: 'sick',
  FAMILY: 'family',
  TRAVEL: 'travel',
  APPOINTMENT: 'appointment',
  OTHER: 'other',
});

export const notificationKindMap = bimap<NotificationKind, RakazNotificationKind>({
  TRIP_REMINDER: 'tripReminder',
  TRIP_STARTED: 'tripStarted',
  DRIVER_NEAR: 'driverNear',
  PICKED_UP: 'pickedUp',
  ARRIVED_SCHOOL: 'arrivedSchool',
  RETURN_STARTED: 'returnStarted',
  DELIVERED: 'delivered',
  PAYMENT: 'payment',
  DELAY: 'delay',
  ADMIN: 'admin',
  ROUTE_CHANGE: 'routeChange',
  EMERGENCY: 'emergency',
});

export const paymentMethodMap = bimap<PaymentMethod, RakazPaymentMethod>({
  CASH: 'cash',
  CARD: 'card',
  ZAIN_CASH: 'zainCash',
  BANK_TRANSFER: 'bankTransfer',
});

export const ticketKindMap = bimap<TicketKind, RakazTicketKind>({ COMPLAINT: 'complaint', FEEDBACK: 'feedback' });

export const ticketTopicMap = bimap<TicketTopic, RakazTicketTopic>({
  DRIVER: 'driver',
  TIMING: 'timing',
  VEHICLE: 'vehicle',
  PAYMENT: 'payment',
  APP: 'app',
  OTHER: 'other',
});

export const ticketStatusMap = bimap<TicketStatus, RakazTicketStatus>({
  OPEN: 'open',
  IN_REVIEW: 'inReview',
  RESOLVED: 'resolved',
});
