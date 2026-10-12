/**
 * Guardian-side domain models, ported from the Swift `Models/` folder with the same field and
 * case names. Dates are epoch milliseconds so they persist as plain JSON.
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

// MARK: - Absence

export enum AbsenceReason {
  none = 'none',
  sick = 'sick',
  family = 'family',
  travel = 'travel',
  appointment = 'appointment',
  other = 'other',
}

export const AbsenceReasonTitle: Record<AbsenceReason, string> = {
  [AbsenceReason.none]: 'بدون سبب',
  [AbsenceReason.sick]: 'مرض',
  [AbsenceReason.family]: 'ظرف عائلي',
  [AbsenceReason.travel]: 'سفر',
  [AbsenceReason.appointment]: 'موعد طبي',
  [AbsenceReason.other]: 'سبب آخر',
};

export const allAbsenceReasons: AbsenceReason[] = [
  AbsenceReason.none,
  AbsenceReason.sick,
  AbsenceReason.family,
  AbsenceReason.travel,
  AbsenceReason.appointment,
  AbsenceReason.other,
];

export enum AbsenceScope {
  fullDay = 'fullDay',
  morningOnly = 'morningOnly',
  returnOnly = 'returnOnly',
}

export const AbsenceScopeTitle: Record<AbsenceScope, string> = {
  [AbsenceScope.fullDay]: 'اليوم كاملاً',
  [AbsenceScope.morningOnly]: 'الذهاب فقط',
  [AbsenceScope.returnOnly]: 'العودة فقط',
};

export const allAbsenceScopes: AbsenceScope[] = [AbsenceScope.fullDay, AbsenceScope.morningOnly, AbsenceScope.returnOnly];

export interface Absence {
  id: string;
  studentID: string;
  day: number;
  scope: AbsenceScope;
  reason: AbsenceReason;
  note: string;
  createdAt: number;
  seenByAdmin: boolean;
  seenByDriver: boolean;
}

// MARK: - Notifications

export enum NotificationKind {
  tripReminder = 'tripReminder',
  tripStarted = 'tripStarted',
  driverNear = 'driverNear',
  pickedUp = 'pickedUp',
  arrivedSchool = 'arrivedSchool',
  returnStarted = 'returnStarted',
  delivered = 'delivered',
  payment = 'payment',
  delay = 'delay',
  admin = 'admin',
}

export const allNotificationKinds: NotificationKind[] = [
  NotificationKind.tripReminder,
  NotificationKind.tripStarted,
  NotificationKind.driverNear,
  NotificationKind.pickedUp,
  NotificationKind.arrivedSchool,
  NotificationKind.returnStarted,
  NotificationKind.delivered,
  NotificationKind.payment,
  NotificationKind.delay,
  NotificationKind.admin,
];

export const NotificationKindTitle: Record<NotificationKind, string> = {
  [NotificationKind.tripReminder]: 'تذكير بموعد الرحلة',
  [NotificationKind.tripStarted]: 'السائق بدأ الرحلة',
  [NotificationKind.driverNear]: 'السائق قريب من المنزل',
  [NotificationKind.pickedUp]: 'تم استلام الطالب',
  [NotificationKind.arrivedSchool]: 'الطالب وصل إلى المدرسة',
  [NotificationKind.returnStarted]: 'بدأت رحلة العودة',
  [NotificationKind.delivered]: 'الطالب تم تسليمه',
  [NotificationKind.payment]: 'إشعار دفع',
  [NotificationKind.delay]: 'إشعار تأخر',
  [NotificationKind.admin]: 'إشعار من الإدارة',
};

export enum NotificationCategory {
  all = 'all',
  trips = 'trips',
  finance = 'finance',
  admin = 'admin',
}

export const allNotificationCategories: NotificationCategory[] = [
  NotificationCategory.all,
  NotificationCategory.trips,
  NotificationCategory.finance,
  NotificationCategory.admin,
];

export const NotificationCategoryTitle: Record<NotificationCategory, string> = {
  [NotificationCategory.all]: 'الكل',
  [NotificationCategory.trips]: 'الرحلات',
  [NotificationCategory.finance]: 'المالية',
  [NotificationCategory.admin]: 'الإدارة',
};

export function notificationCategory(kind: NotificationKind): NotificationCategory {
  switch (kind) {
    case NotificationKind.payment:
      return NotificationCategory.finance;
    case NotificationKind.admin:
    case NotificationKind.delay:
      return NotificationCategory.admin;
    default:
      return NotificationCategory.trips;
  }
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  body: string;
  date: number;
  isRead: boolean;
}

/** Which notification kinds the guardian wants pushed to the phone (saved on the server). */
export interface NotificationPreferences {
  enabled: Record<string, boolean>;
}

export function defaultNotificationPreferences(): NotificationPreferences {
  return { enabled: Object.fromEntries(allNotificationKinds.map((k) => [k, true])) };
}

export function isNotificationOn(prefs: NotificationPreferences, kind: NotificationKind): boolean {
  return prefs.enabled[kind] ?? true;
}

// MARK: - Driver

export interface Vehicle {
  model: string;
  plateNumber: string;
  color: string;
  capacity: number | null;
  busNumber: string;
}

export interface Driver {
  /** False until the administration puts the student on a route that has a driver. */
  assigned: boolean;
  name: string;
  phone: string;
  /** When the driver joined, or null when unknown. */
  joinedAt: number | null;
  vehicle: Vehicle;
}

export const UNASSIGNED_DRIVER: Driver = {
  assigned: false,
  name: 'لم يُحدَّد بعد',
  phone: '',
  joinedAt: null,
  vehicle: { model: '', plateNumber: '', color: '', capacity: null, busNumber: '' },
};

/** "With Rakaz since 2024", or null when the join date is unknown. */
export function driverTenure(driver: Driver): string | null {
  if (driver.joinedAt == null) return null;
  return `مع ركاز منذ ${new Date(driver.joinedAt).getFullYear()}`;
}

/** Only the last 4 digits are exposed in UI; the full number is used solely to place a call. */
export function maskedPhone(driver: Driver): string {
  const digits = driver.phone.replace(/\D/g, '');
  if (digits.length <= 4) return driver.phone;
  return `•••• ••• ${digits.slice(-4)}`;
}

// MARK: - Finance

export enum AccountStatus {
  paid = 'paid',
  partiallyPaid = 'partiallyPaid',
  overdue = 'overdue',
  unpaid = 'unpaid',
}

export const AccountStatusTitle: Record<AccountStatus, string> = {
  [AccountStatus.paid]: 'مدفوع',
  [AccountStatus.partiallyPaid]: 'مدفوع جزئياً',
  [AccountStatus.overdue]: 'متأخر',
  [AccountStatus.unpaid]: 'غير مدفوع',
};

export enum PaymentMethod {
  cash = 'cash',
  card = 'card',
  zainCash = 'zainCash',
  bankTransfer = 'bankTransfer',
}

export const PaymentMethodTitle: Record<PaymentMethod, string> = {
  [PaymentMethod.cash]: 'نقداً',
  [PaymentMethod.card]: 'بطاقة',
  [PaymentMethod.zainCash]: 'زين كاش',
  [PaymentMethod.bankTransfer]: 'تحويل مصرفي',
};

export interface Subscription {
  monthlyFee: number;
  yearlyFee: number | null;
  paidAmount: number;
  dueAmount: number;
  dueDate: number;
  periodTitle: string;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function isToday(ms: number): boolean {
  return isSameDay(ms, Date.now());
}

export function isTomorrow(ms: number): boolean {
  return isSameDay(ms, addDays(Date.now(), 1));
}

export function addDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Whole calendar days between two instants (same as `Calendar.dateComponents([.day])`). */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

export function subscriptionRemaining(s: Subscription): number {
  return Math.max(0, s.dueAmount - s.paidAmount);
}

export function subscriptionProgress(s: Subscription): number {
  if (s.dueAmount <= 0) return 1;
  return Math.min(1, s.paidAmount / s.dueAmount);
}

export function subscriptionStatus(s: Subscription): AccountStatus {
  if (subscriptionRemaining(s) === 0) return AccountStatus.paid;
  if (s.dueDate < startOfDay(Date.now())) return AccountStatus.overdue;
  if (s.paidAmount > 0) return AccountStatus.partiallyPaid;
  return AccountStatus.unpaid;
}

export function daysUntilDue(s: Subscription): number {
  return daysBetween(Date.now(), s.dueDate);
}

export interface Payment {
  id: string;
  amount: number;
  date: number;
  method: PaymentMethod;
  recordedBy: string;
  note: string;
}

// MARK: - School

export interface School {
  name: string;
  address: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  phone: string;
}

export function todayAt(hour: number, minute: number): number {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function schoolCoordinate(s: School): Coordinate {
  return { latitude: s.latitude, longitude: s.longitude };
}

export function schoolStartTime(s: School): number {
  return todayAt(s.startHour, s.startMinute);
}

export function schoolEndTime(s: School): number {
  return todayAt(s.endHour, s.endMinute);
}

// MARK: - Student

export interface StudentAddress {
  governorate: string;
  area: string;
  neighborhood: string;
  street: string;
  landmark: string;
  latitude: number;
  longitude: number;
  accessNotes: string;
}

export function addressCoordinate(a: StudentAddress): Coordinate {
  return { latitude: a.latitude, longitude: a.longitude };
}

export function addressSummary(a: StudentAddress): string {
  return [a.neighborhood, a.street, a.area].filter((p) => p.length > 0).join('، ');
}

export enum Gender {
  male = 'male',
  female = 'female',
}

export const GenderTitle: Record<Gender, string> = {
  [Gender.male]: 'ذكر',
  [Gender.female]: 'أنثى',
};

export interface Student {
  id: string;
  fullName: string;
  firstName: string;
  birthDate: number | null;
  gender: Gender | null;
  grade: string;
  stage: string;
  schoolName: string;
  internalNumber: string;
  guardianName: string;
  guardianPhone: string;
  address: StudentAddress;
  school: School;
  driver: Driver;
  /** Name of the bus route, or null while the student is not on one. */
  routeName: string | null;
  /** Scheduled stop times (HH:mm), or null while the student is not on a route. */
  pickupTime: string | null;
  dropoffTime: string | null;
}

export function studentInitials(s: Student): string {
  return s.fullName
    .split(' ')
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join(' ');
}

export function studentAge(s: Student): number | null {
  if (s.birthDate == null) return null;
  const birth = new Date(s.birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

/** First two words of the full name, as shown on cards. */
export function shortName(s: Student): string {
  return s.fullName.split(' ').slice(0, 2).join(' ');
}

// MARK: - Support

export enum TicketKind {
  complaint = 'complaint',
  feedback = 'feedback',
}

export const TicketKindTitle: Record<TicketKind, string> = {
  [TicketKind.complaint]: 'شكوى',
  [TicketKind.feedback]: 'ملاحظة',
};

export enum TicketTopic {
  driver = 'driver',
  timing = 'timing',
  vehicle = 'vehicle',
  payment = 'payment',
  app = 'app',
  other = 'other',
}

export const allTicketTopics: TicketTopic[] = [
  TicketTopic.driver,
  TicketTopic.timing,
  TicketTopic.vehicle,
  TicketTopic.payment,
  TicketTopic.app,
  TicketTopic.other,
];

export const TicketTopicTitle: Record<TicketTopic, string> = {
  [TicketTopic.driver]: 'السائق',
  [TicketTopic.timing]: 'المواعيد',
  [TicketTopic.vehicle]: 'المركبة',
  [TicketTopic.payment]: 'الدفع',
  [TicketTopic.app]: 'التطبيق',
  [TicketTopic.other]: 'أخرى',
};

export interface SupportTicket {
  id: string;
  kind: TicketKind;
  topic: TicketTopic;
  body: string;
  createdAt: number;
  /** Arabic status label from the administration. */
  status: string;
  /** The administration's answer, once there is one. */
  reply: string | null;
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

// MARK: - Trip

/** The eight lifecycle states of a trip, in order. */
export enum TripStatus {
  notStarted = 0,
  preparing = 1,
  driverOnTheWay = 2,
  arrivedAtPickup = 3,
  studentPickedUp = 4,
  onTheWayToSchool = 5,
  arrivedAtSchool = 6,
  finished = 7,
}

export const allTripStatuses: TripStatus[] = [
  TripStatus.notStarted,
  TripStatus.preparing,
  TripStatus.driverOnTheWay,
  TripStatus.arrivedAtPickup,
  TripStatus.studentPickedUp,
  TripStatus.onTheWayToSchool,
  TripStatus.arrivedAtSchool,
  TripStatus.finished,
];

export enum TripKind {
  morning = 'morning',
  afternoon = 'afternoon',
}

export function tripStatusTitle(status: TripStatus, kind: TripKind): string {
  const morning = kind === TripKind.morning;
  switch (status) {
    case TripStatus.notStarted:
      return 'لم تبدأ';
    case TripStatus.preparing:
      return 'السائق يستعد';
    case TripStatus.driverOnTheWay:
      return morning ? 'السائق في الطريق' : 'السائق في الطريق للمدرسة';
    case TripStatus.arrivedAtPickup:
      return morning ? 'وصل إلى نقطة الطالب' : 'وصل إلى المدرسة';
    case TripStatus.studentPickedUp:
      return 'تم استلام الطالب';
    case TripStatus.onTheWayToSchool:
      return morning ? 'في الطريق إلى المدرسة' : 'في الطريق إلى المنزل';
    case TripStatus.arrivedAtSchool:
      return morning ? 'وصل إلى المدرسة' : 'تم تسليم الطالب';
    case TripStatus.finished:
      return 'انتهت الرحلة';
  }
}

export function isMoving(status: TripStatus): boolean {
  return status === TripStatus.driverOnTheWay || status === TripStatus.onTheWayToSchool;
}

export function isActive(status: TripStatus): boolean {
  return status > TripStatus.notStarted && status < TripStatus.finished;
}

export function nextStatus(status: TripStatus): TripStatus | null {
  return status < TripStatus.finished ? ((status + 1) as TripStatus) : null;
}

export const TripKindTitle: Record<TripKind, string> = {
  [TripKind.morning]: 'رحلة الذهاب',
  [TripKind.afternoon]: 'رحلة العودة',
};

export const TripKindShortTitle: Record<TripKind, string> = {
  [TripKind.morning]: 'رحلة الصباح',
  [TripKind.afternoon]: 'رحلة العودة',
};

export function tripOrigin(kind: TripKind): string {
  return kind === TripKind.morning ? 'المنزل' : 'المدرسة';
}

export function tripDestination(kind: TripKind): string {
  return kind === TripKind.morning ? 'المدرسة' : 'المنزل';
}

export interface TripEvent {
  id: string;
  status: TripStatus;
  date: number;
  note: string;
}

export interface Trip {
  id: string;
  kind: TripKind;
  status: TripStatus;
  scheduledStart: number;
  expectedArrival: number;
  progress: number;
  events: TripEvent[];
  updatedAt: number;
  /** Last position reported by the driver's phone; null until the first fix arrives. */
  busLocation: Coordinate | null;
  busUpdatedAt: number | null;
  /** Stops the bus still serves before this student; null when not applicable. */
  stopsAhead: number | null;
}

export function isPickedUp(t: Trip): boolean {
  return t.status >= TripStatus.studentPickedUp;
}

export function hasArrived(t: Trip): boolean {
  return t.status >= TripStatus.arrivedAtSchool;
}

export function eventDate(t: Trip, status: TripStatus): number | null {
  for (let i = t.events.length - 1; i >= 0; i -= 1) {
    if (t.events[i].status === status) return t.events[i].date;
  }
  return null;
}

// MARK: - Session

export enum AccountType {
  guardian = 'guardian',
  student = 'student',
}

export const AccountTypeTitle: Record<AccountType, string> = {
  [AccountType.guardian]: 'ولي أمر',
  [AccountType.student]: 'طالب',
};

export interface Account {
  phone: string;
  name: string;
  familyName: string;
  type: AccountType;
  /** True while the account still uses the temporary password issued by the administration. */
  mustChangePassword: boolean;
}

let idCounter = 0;

/** Random identifier (UUID-like) for locally created records. */
export function makeId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
