/** Public student code, e.g. STU-24031 */
export type CanonicalStudentId = string;
/** Public trip code, e.g. TRIP-2026-10-07-R-204-MORNING */
export type CanonicalTripId = string;
/** Backend user id (driver, guardian, or admin). */
export type RakazUid = string;
/** Build a deterministic daily trip code. */
export declare function buildTripId(params: {
    dateISO: string;
    routeId: string;
    tripKind: 'morning' | 'afternoon';
}): CanonicalTripId;
/** Local calendar date (device timezone) as YYYY-MM-DD. */
export declare function todayISO(now?: Date): string;
