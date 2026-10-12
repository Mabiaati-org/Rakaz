/** Public student code, e.g. STU-24031 */
export type CanonicalStudentId = string;

/** Public trip code, e.g. TRIP-2026-10-07-R-204-MORNING */
export type CanonicalTripId = string;

/** Backend user id (driver, guardian, or admin). */
export type RakazUid = string;

/** Build a deterministic daily trip code. */
export function buildTripId(params: {
  dateISO: string; // YYYY-MM-DD
  routeId: string;
  tripKind: 'morning' | 'afternoon';
}): CanonicalTripId {
  const kind = params.tripKind === 'morning' ? 'MORNING' : 'AFTERNOON';
  return `TRIP-${params.dateISO}-${params.routeId}-${kind}`;
}

/** Local calendar date (device timezone) as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
