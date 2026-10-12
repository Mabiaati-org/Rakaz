import { dateISOInTz, dbDateFromISO, isDateISO, isoFromDbDate, startOfDayMs } from './time.js';

describe('time helpers', () => {
  it('finds the calendar day in the school timezone, not in UTC', () => {
    // 22:30 UTC on the 11th is already 01:30 on the 12th in Baghdad (UTC+3).
    expect(dateISOInTz(Date.UTC(2026, 9, 11, 22, 30), 'Asia/Baghdad')).toBe('2026-10-12');
    expect(dateISOInTz(Date.UTC(2026, 9, 11, 20, 30), 'Asia/Baghdad')).toBe('2026-10-11');
  });

  it('computes local midnight as an instant', () => {
    expect(startOfDayMs('2026-10-12', 'Asia/Baghdad')).toBe(Date.UTC(2026, 9, 11, 21, 0));
    expect(startOfDayMs('2026-10-12', 'UTC')).toBe(Date.UTC(2026, 9, 12));
  });

  it('round-trips database dates', () => {
    expect(isoFromDbDate(dbDateFromISO('2026-01-05'))).toBe('2026-01-05');
  });

  it('validates date strings', () => {
    expect(isDateISO('2026-10-12')).toBe(true);
    expect(isDateISO('2026-13-40')).toBe(false);
    expect(isDateISO('12/10/2026')).toBe(false);
  });
});
