/** Calendar date (YYYY-MM-DD) of an instant in the given IANA timezone. */
export function dateISOInTz(instant: Date | number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Offset (ms) of a timezone from UTC at the given instant; positive east of Greenwich. */
function tzOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const n = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekday (0 = Sunday) and minutes since midnight of an instant in the given timezone. */
export function localClock(instant: Date | number, timeZone: string): { weekday: number; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return { weekday: WEEKDAYS.indexOf(get('weekday')), minutesOfDay: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Epoch ms of local midnight that starts `dateISO` in the given timezone. */
export function startOfDayMs(dateISO: string, timeZone: string): number {
  const utcMidnight = dbDateFromISO(dateISO).getTime();
  return utcMidnight - tzOffsetMs(utcMidnight, timeZone);
}

/** `@db.Date` columns hold the calendar day at UTC midnight. */
export function dbDateFromISO(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00.000Z`);
}

export function isoFromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dbDateFromISO(value).getTime());
}

export const ms = (date: Date | null | undefined): number | null => (date ? date.getTime() : null);
