import {
  addDays,
  addMonths,
  dayNumber,
  daysInMonth,
  diffDays,
  eachDay,
  endOfMonth,
  formatLongDate,
  formatMinutes,
  fromDayNumber,
  isLeapYear,
  isValidISO,
  localISO,
  parseISO,
  weekday,
} from '@/lib/rotation';

import { utcDateList, utcDays } from './helpers';

describe('civil dates', () => {
  it('knows leap years, including the century rules', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2027)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
  });

  it('rejects dates that do not exist', () => {
    expect(isValidISO('2027-02-29')).toBe(false);
    expect(isValidISO('2028-02-29')).toBe(true);
    expect(isValidISO('2027-13-01')).toBe(false);
    expect(isValidISO('2027-04-31')).toBe(false);
    expect(isValidISO('27-04-01')).toBe(false);
    expect(() => parseISO('2027-00-10')).toThrow();
  });

  it('day numbers match a JS Date oracle from 1900 to 2100', () => {
    const start = '1900-01-01';
    const base = dayNumber(start);
    expect(dayNumber('1970-01-01')).toBe(0);
    for (const iso of utcDateList(start, 73415)) {
      // every day through 2100-12-31
      expect(dayNumber(iso) - base).toBe(utcDays(start, iso));
      expect(fromDayNumber(dayNumber(iso))).toBe(iso);
    }
  });

  it('adds days across month, leap day and year boundaries', () => {
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(diffDays('2027-01-01', '2028-01-01')).toBe(365);
    expect(diffDays('2028-01-01', '2029-01-01')).toBe(366);
  });

  it('adds months and clamps to the end of short months', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2027-11-15', 2)).toBe('2028-01-15');
    expect(addMonths('2027-01-15', -1)).toBe('2026-12-15');
    expect(endOfMonth('2028-02-03')).toBe('2028-02-29');
  });

  it('knows the weekday', () => {
    expect(weekday('1970-01-01')).toBe(4);
    expect(weekday('2027-01-01')).toBe(5);
    expect(weekday('2000-02-29')).toBe(2);
    expect(weekday('2028-02-29')).toBe(2);
    expect(formatLongDate('2027-01-01')).toBe('Friday, January 1');
  });

  it('lists every day in a range, inclusive', () => {
    expect(eachDay('2027-12-30', '2028-01-02')).toEqual(['2027-12-30', '2027-12-31', '2028-01-01', '2028-01-02']);
    expect(eachDay('2027-01-01', '2027-12-31')).toHaveLength(365);
    expect(eachDay('2028-01-01', '2028-12-31')).toHaveLength(366);
  });

  it('formats times without hyphens', () => {
    expect(formatMinutes(420)).toBe('7 AM');
    expect(formatMinutes(1140)).toBe('7 PM');
    expect(formatMinutes(0)).toBe('12 AM');
    expect(formatMinutes(750)).toBe('12:30 PM');
    expect(formatMinutes(1440 + 420)).toBe('7 AM');
    expect(formatMinutes(1140, false)).toBe('19:00');
  });

  it('reads the local date from a JS Date', () => {
    expect(localISO(new Date(2027, 0, 1, 12))).toBe('2027-01-01');
    expect(localISO(new Date(2028, 1, 29, 23, 59))).toBe('2028-02-29');
  });
});
