import type {
  RakazAbsenceReport,
  RakazAuthUser,
  RakazNotificationKind,
  RakazParentNotification,
  RakazParentStudent,
  RakazParentTripView,
  RakazPayment,
  RakazSubscription,
  RakazSupportTicket,
} from '@rakaz/contract';

import {
  type Absence,
  type Account,
  AccountType,
  type AppNotification,
  Gender,
  NotificationKind,
  type Payment,
  type Student,
  type Subscription,
  type SupportTicket,
  todayAt,
  type Trip,
  type TripKind,
  type TripStatus,
  UNASSIGNED_DRIVER,
} from '@/types/models';

const hm = (time: string, fallbackHour: number): { hour: number; minute: number } => {
  const [h, m] = time.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? { hour: h, minute: m } : { hour: fallbackHour, minute: 0 };
};

/** Today's epoch for an `HH:mm` time, or null when the time is missing. */
const todayAtTime = (time: string | null): number | null => {
  if (!time) return null;
  const { hour, minute } = hm(time, 0);
  return todayAt(hour, minute);
};

export function accountFromServer(user: RakazAuthUser): Account {
  const first = user.name.trim().split(/\s+/)[0] ?? user.name;
  return {
    phone: user.phone,
    name: user.name,
    familyName: `عائلة ${first}`,
    type: AccountType.guardian,
    mustChangePassword: user.mustChangePassword,
  };
}

export function studentFromServer(s: RakazParentStudent): Student {
  const start = hm(s.school.startTime, 7);
  const end = hm(s.school.endTime, 13);
  return {
    id: s.id,
    fullName: s.fullName,
    firstName: s.firstName,
    birthDate: s.birthDate,
    gender: s.gender === 'male' ? Gender.male : s.gender === 'female' ? Gender.female : null,
    grade: s.grade,
    stage: s.stage,
    schoolName: s.school.name,
    internalNumber: s.internalNumber,
    guardianName: s.guardianName,
    guardianPhone: s.guardianPhone,
    address: s.address,
    school: {
      name: s.school.name,
      address: s.school.address,
      locationLabel: s.school.locationLabel,
      latitude: s.school.latitude,
      longitude: s.school.longitude,
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
      phone: s.school.phone,
    },
    driver: s.driver
      ? {
          assigned: true,
          name: s.driver.name,
          phone: s.driver.phone,
          joinedAt: s.driver.joinedAt,
          vehicle: {
            model: s.driver.vehicle.model,
            plateNumber: s.driver.vehicle.plateNumber,
            color: s.driver.vehicle.color,
            capacity: s.driver.vehicle.capacity,
            busNumber: s.driver.vehicle.busNumber,
          },
        }
      : UNASSIGNED_DRIVER,
    routeName: s.route?.name ?? null,
    pickupTime: s.stop?.pickupTime ?? null,
    dropoffTime: s.stop?.dropoffTime ?? null,
  };
}

export function subscriptionFromServer(s: RakazSubscription): Subscription {
  return {
    monthlyFee: s.monthlyFee,
    yearlyFee: s.yearlyFee,
    paidAmount: s.paidAmount,
    dueAmount: s.dueAmount,
    dueDate: s.dueDate,
    periodTitle: s.periodTitle,
  };
}

export function paymentFromServer(p: RakazPayment): Payment {
  // The receipt number is what the guardian quotes to the administration, so it is the visible id.
  return { id: p.code, amount: p.amount, date: p.date, method: p.method as Payment['method'], recordedBy: p.recordedBy, note: p.note };
}

export function absenceFromServer(a: RakazAbsenceReport): Absence {
  return {
    id: a.id,
    studentID: a.studentId,
    day: a.day,
    scope: a.scope as Absence['scope'],
    reason: a.reason as Absence['reason'],
    note: a.note,
    createdAt: a.createdAt,
    // Saved on the server means the dashboard already shows it.
    seenByAdmin: true,
    seenByDriver: a.seenByDriverAt != null,
  };
}

const KIND: Partial<Record<RakazNotificationKind, NotificationKind>> = {
  tripReminder: NotificationKind.tripReminder,
  tripStarted: NotificationKind.tripStarted,
  driverNear: NotificationKind.driverNear,
  pickedUp: NotificationKind.pickedUp,
  arrivedSchool: NotificationKind.arrivedSchool,
  returnStarted: NotificationKind.returnStarted,
  delivered: NotificationKind.delivered,
  payment: NotificationKind.payment,
  delay: NotificationKind.delay,
  admin: NotificationKind.admin,
};

export function notificationFromServer(n: RakazParentNotification): AppNotification {
  return { id: n.id, kind: KIND[n.kind] ?? NotificationKind.admin, body: n.body, date: n.at, isRead: n.read };
}

const TICKET_STATUS: Record<RakazSupportTicket['status'], string> = {
  open: 'قيد المراجعة',
  inReview: 'قيد المعالجة',
  resolved: 'تم الرد',
};

export function ticketFromServer(t: RakazSupportTicket): SupportTicket {
  return {
    id: t.code,
    kind: t.kind as SupportTicket['kind'],
    topic: t.topic as SupportTicket['topic'],
    body: t.body,
    createdAt: t.createdAt,
    status: TICKET_STATUS[t.status],
    reply: t.adminReply,
  };
}

/** A trip as the screens know it, built from the server's per-student view. */
export function tripFromServer(view: RakazParentTripView, student: Student, kind: TripKind): Trip {
  const morning = view.tripKind === 'morning';
  const schoolStart = todayAt(student.school.startHour, student.school.startMinute);
  const schoolEnd = todayAt(student.school.endHour, student.school.endMinute);
  const stopTime = todayAtTime(view.scheduledTime);
  return {
    id: view.tripId,
    kind,
    status: view.status as TripStatus,
    // Morning: pickup at the stop time, arrival by the first bell. Afternoon: leaves at the last bell.
    scheduledStart: morning ? (stopTime ?? schoolStart - 45 * 60_000) : schoolEnd,
    expectedArrival: morning ? schoolStart : (stopTime ?? schoolEnd + 30 * 60_000),
    progress: view.progress,
    events: view.timeline.map((e, i) => ({ id: `${view.tripId}-${i}`, status: e.status as TripStatus, date: e.at, note: '' })),
    updatedAt: view.busUpdatedAt ?? view.updatedAt,
    busLocation: view.busLocation,
    busUpdatedAt: view.busUpdatedAt,
    stopsAhead: view.stopsAhead,
  };
}
