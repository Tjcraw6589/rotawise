import { addDays, daysInMonth, eachDay, fromDayNumber, dayNumber, toISO, weekday } from './dates.ts';
import type { ISODate } from './dates.ts';
import { effectiveShifts, statusAt } from './schedule.ts';
import type { Override, Platoon, Rotation, ShiftInstance } from './types.ts';
import { PLATOONS, isWorking } from './types.ts';

export type WeekStart = 0 | 1; // Sunday or Monday

/** A month laid out in weeks. Cells outside the month are null. */
export function monthGrid(year: number, month: number, weekStartsOn: WeekStart = 0): (ISODate | null)[][] {
  const first = toISO({ year, month, day: 1 });
  const lead = (weekday(first) - weekStartsOn + 7) % 7;
  const total = daysInMonth(year, month);
  const cells: (ISODate | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(toISO({ year, month, day: d }));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface DayMarks {
  date: ISODate;
  /** Shifts that start on this date. */
  starts: ShiftInstance[];
  /** Shifts that started earlier and are still running into this date (a 24 hour tour's second day). */
  continues: ShiftInstance[];
}

/** Mark every date in [from, to] with the shifts that start on it or run into it. */
export function markDays(shifts: readonly ShiftInstance[], from: ISODate, to: ISODate): Map<ISODate, DayMarks> {
  const map = new Map<ISODate, DayMarks>();
  for (const d of eachDay(from, to)) map.set(d, { date: d, starts: [], continues: [] });
  for (const s of shifts) {
    map.get(s.date)?.starts.push(s);
    // Every later date the shift is still running on. A shift that ends exactly at
    // midnight does not touch the date it ends on.
    const last = dayNumber(s.endDate) - (s.endMinutes === 0 ? 1 : 0);
    for (let n = dayNumber(s.date) + 1; n <= last; n++) {
      map.get(fromDayNumber(n))?.continues.push(s);
    }
  }
  return map;
}

/**
 * Platoons on duty for a whole rotation on a given date (starting a shift that day).
 * Kelly days are ignored: they belong to a person or Kelly group, and the platoon is
 * still on duty.
 */
export function platoonsOn(rotation: Rotation, date: ISODate): Platoon[] {
  const noKelly = { ...rotation, kelly: null };
  return PLATOONS.slice(0, rotation.platoonCount).filter((p) => effectiveShifts(noKelly, p, date, date).some(isWorking));
}

export interface DaySummary {
  date: ISODate;
  on: boolean;
  /** Short label for the day: shift short code, 'K' for Kelly day, 'T' traded, 'V' vacation, 'S' sick, or '' when off. */
  code: string;
  shift: ShiftInstance | null;
  /** True when a shift from the previous day is still running in the morning. */
  endsToday: boolean;
}

export function codeFor(shift: ShiftInstance, rotation: Rotation): string {
  switch (shift.status) {
    case 'kelly':
      return 'K';
    case 'traded-away':
      return 'T';
    case 'vacation':
      return 'V';
    case 'sick':
      return 'S';
    case 'other-leave':
      return 'L';
    default: {
      const type = rotation.shiftTypes.find((t) => t.id === shift.shiftTypeId);
      if (shift.source === 'extra') return 'OT';
      if (shift.source === 'trade-in') return 'T+';
      return type?.short ?? 'ON';
    }
  }
}

/** One line per day for widgets and lists: next `count` days starting at `from`. */
export function summarizeDays(rotation: Rotation, platoon: Platoon, from: ISODate, count: number, overrides: readonly Override[] = []): DaySummary[] {
  const to = addDays(from, count - 1);
  const shifts = effectiveShifts(rotation, platoon, addDays(from, -2), to, overrides);
  const marks = markDays(shifts, from, to);
  const out: DaySummary[] = [];
  for (const d of eachDay(from, to)) {
    const m = marks.get(d);
    const starts = m?.starts ?? [];
    const working = starts.filter(isWorking);
    const primary = working[0] ?? starts[0] ?? null;
    out.push({
      date: d,
      on: working.length > 0,
      code: primary ? codeFor(primary, rotation) : '',
      shift: primary,
      endsToday: (m?.continues ?? []).some(isWorking),
    });
  }
  return out;
}

export interface TodayCard {
  date: ISODate;
  on: boolean;
  headline: string; // "You're ON" / "You're OFF"
  detail: string; // "24 hour tour until 7 AM tomorrow" / "Next shift in 2 days"
  current: ShiftInstance | null;
  next: ShiftInstance | null;
  daysUntilNext: number | null;
}

export function todayCard(rotation: Rotation, platoon: Platoon, date: ISODate, minutes: number, overrides: readonly Override[] = [], formatTime: (m: number) => string = (m) => String(m)): TodayCard {
  const horizon = Math.max(rotation.cycle.length * 2, 45);
  const shifts = effectiveShifts(rotation, platoon, addDays(date, -3), addDays(date, horizon), overrides);
  const status = statusAt(shifts, date, minutes);
  let detail = '';
  if (status.on && status.current) {
    const c = status.current;
    const type = rotation.shiftTypes.find((t) => t.id === c.shiftTypeId);
    const endWord = c.endDate === date ? 'today' : c.endDate === addDays(date, 1) ? 'tomorrow' : c.endDate;
    detail = `${type?.label ?? 'Shift'} until ${formatTime(c.endMinutes)} ${endWord}`;
  } else if (status.next) {
    const n = status.daysUntilNext ?? 0;
    detail = n === 0 ? `Next shift today at ${formatTime(status.next.startMinutes)}` : n === 1 ? 'Next shift tomorrow' : `Next shift in ${n} days`;
  } else {
    detail = 'No shifts scheduled';
  }
  return {
    date,
    on: status.on,
    headline: status.on ? "You're ON" : "You're OFF",
    detail,
    current: status.current,
    next: status.next,
    daysUntilNext: status.daysUntilNext,
  };
}

/**
 * Shifts and hours worked between two dates. The count is rotation and trade shifts only, so a
 * 4 hour callback is not counted as a tour; the hours include logged overtime and extra shifts.
 */
export function workTotals(rotation: Rotation, platoon: Platoon, from: ISODate, to: ISODate, overrides: readonly Override[] = []): { shifts: number; hours: number } {
  const working = effectiveShifts(rotation, platoon, from, to, overrides).filter(isWorking);
  return { shifts: working.filter((s) => s.source !== 'extra').length, hours: working.reduce((h, s) => h + s.durationMinutes / 60, 0) };
}

/** Shifts and hours worked in a calendar month (see workTotals). */
export function monthTotals(rotation: Rotation, platoon: Platoon, year: number, month: number, overrides: readonly Override[] = []): { shifts: number; hours: number } {
  return workTotals(rotation, platoon, toISO({ year, month, day: 1 }), toISO({ year, month, day: daysInMonth(year, month) }), overrides);
}
