import { isWithinWorkSchedule } from '@rakaz/contract';

import { localClock } from './time.js';

const weekdays = { startTime: '06:00', endTime: '15:00', days: [0, 1, 2, 3, 4] };

describe('work schedule', () => {
  it('reads the weekday and time in the school timezone', () => {
    // Monday 12 Oct 2026, 03:30 UTC is 06:30 in Baghdad.
    expect(localClock(Date.UTC(2026, 9, 12, 3, 30), 'Asia/Baghdad')).toEqual({ weekday: 1, minutesOfDay: 390 });
    // Saturday 22:30 UTC is already Sunday 01:30 in Baghdad.
    expect(localClock(Date.UTC(2026, 9, 10, 22, 30), 'Asia/Baghdad')).toEqual({ weekday: 0, minutesOfDay: 90 });
  });

  it('includes the start minute and excludes the end minute', () => {
    expect(isWithinWorkSchedule(weekdays, 1, 6 * 60)).toBe(true);
    expect(isWithinWorkSchedule(weekdays, 1, 6 * 60 - 1)).toBe(false);
    expect(isWithinWorkSchedule(weekdays, 1, 15 * 60 - 1)).toBe(true);
    expect(isWithinWorkSchedule(weekdays, 1, 15 * 60)).toBe(false);
  });

  it('is off on days that are not working days', () => {
    expect(isWithinWorkSchedule(weekdays, 5, 9 * 60)).toBe(false);
    expect(isWithinWorkSchedule({ ...weekdays, days: [] }, 1, 9 * 60)).toBe(false);
  });

  it('counts the hours after midnight of an overnight shift as the day it started', () => {
    const night = { startTime: '22:00', endTime: '04:00', days: [4] }; // Thursday night
    expect(isWithinWorkSchedule(night, 4, 23 * 60)).toBe(true);
    expect(isWithinWorkSchedule(night, 5, 3 * 60)).toBe(true); // early Friday
    expect(isWithinWorkSchedule(night, 5, 23 * 60)).toBe(false); // Friday night is not a shift
    expect(isWithinWorkSchedule(night, 4, 3 * 60)).toBe(false); // early Thursday
  });
});
