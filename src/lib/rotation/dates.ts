/**
 * Civil date arithmetic on plain `YYYY-MM-DD` strings.
 *
 * Nothing here touches `Date` or time zones, so a shift can never move because
 * the clocks changed. Day numbers count days since 1970-01-01 (day 0).
 */

export type ISODate = string;

export interface CivilDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

export function parseISO(iso: ISODate): CivilDate {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Bad date: ${iso}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Bad date: ${iso}`);
  }
  return { year, month, day };
}

export function isValidISO(iso: string): boolean {
  try {
    parseISO(iso);
    return true;
  } catch {
    return false;
  }
}

export function toISO(d: CivilDate): ISODate {
  const y = String(d.year).padStart(4, '0');
  const m = String(d.month).padStart(2, '0');
  const day = String(d.day).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days since 1970-01-01 (Howard Hinnant's days_from_civil). */
export function dayNumberOf(d: CivilDate): number {
  const y = d.month <= 2 ? d.year - 1 : d.year;
  const era = Math.floor((y >= 0 ? y : y - 399) / 400);
  const yoe = y - era * 400;
  const mp = (d.month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function dayNumber(iso: ISODate): number {
  return dayNumberOf(parseISO(iso));
}

/** Inverse of dayNumberOf (civil_from_days). */
export function civilFromDayNumber(n: number): CivilDate {
  const z = n + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? y + 1 : y, month, day };
}

export function fromDayNumber(n: number): ISODate {
  return toISO(civilFromDayNumber(n));
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(dayNumber(iso) + days);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return dayNumber(to) - dayNumber(from);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 0 = Sunday ... 6 = Saturday. 1970-01-01 was a Thursday (4). */
export function weekday(iso: ISODate): number {
  const n = dayNumber(iso);
  return (((n + 4) % 7) + 7) % 7;
}

export function startOfMonth(iso: ISODate): ISODate {
  const d = parseISO(iso);
  return toISO({ ...d, day: 1 });
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = parseISO(iso);
  return toISO({ ...d, day: daysInMonth(d.year, d.month) });
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = parseISO(iso);
  const total = d.year * 12 + (d.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return toISO({ year, month, day: Math.min(d.day, daysInMonth(year, month)) });
}

/** Every date from `from` to `to` inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const a = dayNumber(from);
  const b = dayNumber(to);
  const out: ISODate[] = [];
  for (let n = a; n <= b; n++) out.push(fromDayNumber(n));
  return out;
}

/** The local civil date of a JS Date (the only place the module looks at a Date). */
export function localISO(date: Date = new Date()): ISODate {
  return toISO({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

/** Minutes after local midnight of a JS Date. */
export function localMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export const MINUTES_PER_DAY = 1440;

export function formatMinutes(minutes: number, hour12 = true): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  if (!hour12) return `${String(h).padStart(2, '0')}:${mm}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mm === '00' ? `${h12} ${suffix}` : `${h12}:${mm} ${suffix}`;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function formatLongDate(iso: ISODate): string {
  const d = parseISO(iso);
  return `${WEEKDAY_LONG[weekday(iso)]}, ${MONTH_NAMES[d.month - 1]} ${d.day}`;
}

export function formatShortDate(iso: ISODate): string {
  const d = parseISO(iso);
  return `${MONTH_SHORT[d.month - 1]} ${d.day}`;
}
