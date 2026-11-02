/**
 * Turning a civil date and wall clock time into a real instant in a named time zone.
 * Used for calendar export and for "how long was that shift really" on clock change
 * nights. Uses only Intl, so it is framework free and testable in any zone.
 */
import { MINUTES_PER_DAY, parseISO } from './dates.ts';
import type { ISODate } from './dates.ts';
import type { ShiftInstance } from './types.ts';

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = cache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    cache.set(timeZone, f);
  }
  return f;
}

/** Offset of `timeZone` from UTC in minutes at a given instant (east positive). */
export function offsetMinutesAt(epochMs: number, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(new Date(epochMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUTC - epochMs) / 60000);
}

/**
 * Epoch milliseconds for a wall clock time in a zone. On a spring forward gap the
 * missing time maps to the same distance after the jump (2:30 becomes 3:30); on a fall
 * back overlap the first occurrence wins, which is what a shift already running sees.
 */
export function zonedToEpoch(date: ISODate, minutes: number, timeZone: string): number {
  const d = parseISO(date);
  // The wall clock read as if it were UTC.
  const wall = Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0) + minutes * 60000;
  // The zone's offset a day either side covers both offsets of any transition that day.
  const before = offsetMinutesAt(wall - 86400000, timeZone);
  const after = offsetMinutesAt(wall + 86400000, timeZone);
  const valid = [before, after]
    .map((o) => wall - o * 60000)
    .filter((t) => wall - offsetMinutesAt(t, timeZone) * 60000 === t);
  if (valid.length > 0) return Math.min(...valid);
  // Gap: the wall time never happened. Use the offset from before the jump.
  return wall - before * 60000;
}

export function shiftStartEpoch(shift: ShiftInstance, timeZone: string): number {
  return zonedToEpoch(shift.date, shift.startMinutes, timeZone);
}

export function shiftEndEpoch(shift: ShiftInstance, timeZone: string): number {
  return zonedToEpoch(shift.endDate, shift.endMinutes, timeZone);
}

/** Real elapsed minutes of a shift in a zone: 23 hours on a spring forward night, 25 on fall back. */
export function elapsedMinutes(shift: ShiftInstance, timeZone: string): number {
  return Math.round((shiftEndEpoch(shift, timeZone) - shiftStartEpoch(shift, timeZone)) / 60000);
}

/** Wall clock minutes the shift was scheduled for, independent of zone. */
export function scheduledMinutes(shift: ShiftInstance): number {
  return shift.durationMinutes;
}

export { MINUTES_PER_DAY };
