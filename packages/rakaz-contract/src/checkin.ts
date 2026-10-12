import type { CanonicalStudentId, RakazUid } from './ids';

/** How often the driver app reports where it is and who is on board. */
export const RAKAZ_CHECKIN_INTERVAL_SECONDS = 300;

/** When drivers are on duty. Times are HH:mm in the school timezone; days use 0 = Sunday … 6 = Saturday. */
export interface RakazWorkSchedule {
  startTime: string;
  endTime: string;
  days: number[];
}

const minutesOf = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Whether a moment falls inside the schedule. `weekday` and `minutesOfDay` must already be in
 * the school timezone. A window that ends before it starts runs past midnight.
 */
export function isWithinWorkSchedule(schedule: RakazWorkSchedule, weekday: number, minutesOfDay: number): boolean {
  const start = minutesOf(schedule.startTime);
  const end = minutesOf(schedule.endTime);
  if (start <= end) return schedule.days.includes(weekday) && minutesOfDay >= start && minutesOfDay < end;
  // Overnight shift: the part after midnight belongs to the day the shift started on.
  if (minutesOfDay >= start) return schedule.days.includes(weekday);
  return minutesOfDay < end && schedule.days.includes((weekday + 6) % 7);
}

/** Driver → API: where the driver's phone is right now. */
export interface RakazCheckinInput {
  latitude: number;
  longitude: number;
  /** Radius of uncertainty in metres, as reported by the phone; null when unknown. */
  accuracy: number | null;
}

export interface RakazCheckinPassenger {
  studentId: CanonicalStudentId;
  name: string;
}

/** One recorded check-in: the driver's exact position and who was on the bus at that moment. */
export interface RakazDriverCheckin {
  id: string;
  /** Full precision, exactly as the phone reported it. */
  latitude: number;
  longitude: number;
  accuracy: number | null;
  /** Street address looked up from OpenStreetMap; null when the lookup was unavailable. */
  address: string | null;
  /** Epoch ms, stamped by the server. */
  at: number;
  passengers: RakazCheckinPassenger[];
  /** Epoch ms when the next check-in is expected. */
  nextCheckinAt: number;
}

/** A check-in as listed on the dashboard. */
export interface RakazAdminCheckin extends RakazDriverCheckin {
  driverUid: RakazUid;
  driverName: string;
  vehicleLabel: string;
  routeId: string | null;
}
