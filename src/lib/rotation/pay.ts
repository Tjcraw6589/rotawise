import { addDays, addMonths, dayNumber, daysInMonth, fromDayNumber, parseISO, toISO } from './dates.ts';
import type { ISODate } from './dates.ts';
import type { Override, ShiftInstance } from './types.ts';
import { isWorking } from './types.ts';

export type PayPeriodKind = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'custom';

export interface PaySettings {
  kind: PayPeriodKind;
  /** First day of a known pay period (weekly, biweekly, custom). */
  anchorStart: ISODate;
  /** Length in days for `custom`. */
  customLengthDays?: number;
  /** Days after the period ends that pay arrives (0 = last day of period). */
  paydayOffsetDays: number;
  /** Semimonthly split day: periods run 1..splitDay-1 and splitDay..end of month. Default 16. */
  semimonthlySplitDay?: number;
  hourlyRate: number;
  /** Straight time hours per period before overtime applies (e.g. 40 weekly, 80 biweekly, 212 per 28 days). */
  regularHoursPerPeriod: number;
  otMultiplier: number;
}

export interface PayPeriod {
  start: ISODate;
  end: ISODate;
  payday: ISODate;
}

function clampDay(year: number, month: number, day: number): ISODate {
  return toISO({ year, month, day: Math.min(day, daysInMonth(year, month)) });
}

/** Pay periods that overlap [from, to], in order. */
export function payPeriods(settings: PaySettings, from: ISODate, to: ISODate): PayPeriod[] {
  const out: PayPeriod[] = [];
  const push = (start: ISODate, end: ISODate) => {
    if (end < from || start > to) return;
    out.push({ start, end, payday: addDays(end, settings.paydayOffsetDays) });
  };
  if (settings.kind === 'weekly' || settings.kind === 'biweekly' || settings.kind === 'custom') {
    const length = settings.kind === 'weekly' ? 7 : settings.kind === 'biweekly' ? 14 : Math.max(1, settings.customLengthDays ?? 14);
    const anchor = dayNumber(settings.anchorStart);
    const firstStart = anchor + Math.floor((dayNumber(from) - anchor) / length) * length;
    for (let s = firstStart; s <= dayNumber(to); s += length) {
      push(fromDayNumber(s), fromDayNumber(s + length - 1));
    }
    return out;
  }
  if (settings.kind === 'monthly') {
    let cursor = toISO({ ...parseISO(from), day: 1 });
    while (cursor <= to) {
      const d = parseISO(cursor);
      push(cursor, toISO({ ...d, day: daysInMonth(d.year, d.month) }));
      cursor = addMonths(cursor, 1);
    }
    return out;
  }
  // semimonthly
  const split = settings.semimonthlySplitDay ?? 16;
  let cursor = toISO({ ...parseISO(from), day: 1 });
  while (cursor <= to) {
    const d = parseISO(cursor);
    const firstEnd = clampDay(d.year, d.month, split - 1);
    push(cursor, firstEnd);
    push(clampDay(d.year, d.month, split), toISO({ ...d, day: daysInMonth(d.year, d.month) }));
    cursor = addMonths(cursor, 1);
  }
  return out;
}

export function currentPayPeriod(settings: PaySettings, date: ISODate): PayPeriod {
  const found = payPeriods(settings, date, date)[0];
  if (!found) throw new Error('No pay period');
  return found;
}

export function nextPayday(settings: PaySettings, date: ISODate): ISODate {
  // Look up to three months ahead; the first payday on or after `date` wins.
  const periods = payPeriods(settings, addDays(date, -62), addDays(date, 93));
  const paydays = periods.map((p) => p.payday).filter((p) => p >= date).sort();
  const first = paydays[0];
  if (!first) throw new Error('No payday found');
  return first;
}

export interface GrossEstimate {
  /** Your own rotation hours, including shifts someone works for you on a trade. */
  scheduledHours: number;
  /** Paid vacation and sick hours, at straight time. */
  leaveHours: number;
  extraHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  gross: number;
}

/**
 * Estimated gross for a period, the way US fire, EMS and police payroll usually works:
 * - Your own scheduled shifts are paid even when someone works them for you on a trade, and a
 *   shift you cover for someone else is not (FLSA section 7(p)(3): trades leave pay unchanged).
 * - Vacation and sick hours are paid at straight time but do not count toward overtime.
 * - Kelly days and other leave are unpaid days off.
 * - Credited hours above the regular threshold, plus every logged extra hour, are paid at the
 *   overtime multiplier.
 */
export function estimateGross(shifts: readonly ShiftInstance[], period: PayPeriod, settings: PaySettings): GrossEstimate {
  const inPeriod = shifts.filter((s) => s.date >= period.start && s.date <= period.end);
  const hoursOf = (list: readonly ShiftInstance[]) => list.reduce((h, s) => h + s.durationMinutes / 60, 0);
  const own = inPeriod.filter((s) => s.source === 'rotation');
  const scheduledHours = hoursOf(own.filter((s) => s.status === 'scheduled' || s.status === 'traded-away'));
  const leaveHours = hoursOf(own.filter((s) => s.status === 'vacation' || s.status === 'sick'));
  const extraHours = hoursOf(inPeriod.filter((s) => s.source === 'extra' && isWorking(s)));
  const regularHours = Math.min(scheduledHours, settings.regularHoursPerPeriod) + leaveHours;
  const overtimeHours = Math.max(0, scheduledHours - settings.regularHoursPerPeriod) + extraHours;
  const regularPay = round2(regularHours * settings.hourlyRate);
  const overtimePay = round2(overtimeHours * settings.hourlyRate * settings.otMultiplier);
  return { scheduledHours, leaveHours, extraHours, regularHours, overtimeHours, regularPay, overtimePay, gross: round2(regularPay + overtimePay) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface LeaveAllowance {
  vacationHours: number;
  sickHours: number;
  kellyDays: number;
}

export interface LeaveBalances {
  vacationUsed: number;
  vacationLeft: number;
  sickUsed: number;
  sickLeft: number;
  kellyUsed: number;
  kellyLeft: number;
}

/** Leave used in a calendar year. Hours default to `defaultShiftHours` when an entry has none. */
export function leaveBalances(overrides: readonly Override[], year: number, allowance: LeaveAllowance, defaultShiftHours: number): LeaveBalances {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  let vacationUsed = 0;
  let sickUsed = 0;
  let kellyUsed = 0;
  for (const o of overrides) {
    if (o.kind !== 'leave' || o.date < from || o.date > to) continue;
    const hours = o.hours ?? defaultShiftHours;
    if (o.leaveType === 'vacation') vacationUsed += hours;
    else if (o.leaveType === 'sick') sickUsed += hours;
    else if (o.leaveType === 'kelly') kellyUsed += 1;
  }
  return {
    vacationUsed,
    vacationLeft: allowance.vacationHours - vacationUsed,
    sickUsed,
    sickLeft: allowance.sickHours - sickUsed,
    kellyUsed,
    kellyLeft: allowance.kellyDays - kellyUsed,
  };
}

export interface TradeBalance {
  counterpart: string;
  /** Positive: they owe you hours. Negative: you owe them. */
  hours: number;
  open: number;
}

/**
 * Who owes whom, from unsettled trades. When someone works your shift (gave), you owe them that time;
 * when you work theirs (took), they owe you.
 */
export function tradeBalances(overrides: readonly Override[], defaultShiftHours: number): TradeBalance[] {
  const map = new Map<string, TradeBalance>();
  for (const o of overrides) {
    if (o.kind !== 'trade' || o.settled) continue;
    const key = o.counterpart.trim() || 'Unknown';
    const entry = map.get(key) ?? { counterpart: key, hours: 0, open: 0 };
    const hours = o.hours ?? defaultShiftHours;
    entry.hours += o.direction === 'took' ? hours : -hours;
    entry.open += 1;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.counterpart.localeCompare(b.counterpart));
}

/** Overtime and extra hours in a date range. */
export function extraHoursBetween(overrides: readonly Override[], from: ISODate, to: ISODate): { hours: number; entries: number } {
  let hours = 0;
  let entries = 0;
  for (const o of overrides) {
    if (o.kind !== 'extra' || o.date < from || o.date > to) continue;
    hours += o.hours;
    entries += 1;
  }
  return { hours, entries };
}
