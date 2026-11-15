/**
 * The data the home screen widgets read. The app writes a snapshot of the next 400 days
 * whenever anything changes; the iOS widget (Swift, targets/widget) and the Android widget
 * (src/widgets/android) both turn it into what they show with the same rules as
 * `widgetView` below. Because the snapshot covers more than a year ahead, the widgets
 * keep rolling over at midnight even if the app is not opened.
 */
import type { Profile, WidgetBackground } from './model.ts';
import { PLATOON_COLORS } from './platoonColors.ts';
import { addDays, dayNumber, formatMinutes, fromDayNumber, parseISO, weekday, MONTH_SHORT, WEEKDAY_SHORT, MINUTES_PER_DAY , presetInfo, summarizeDays, effectiveShifts, isWorking } from './rotation/index.ts';
import type { Override, ShiftInstance, ShiftType } from './rotation/index.ts';

/** 2 added `sh` (every working shift on days with more than one). Version 1 snapshots still read fine. */
export const SNAPSHOT_VERSION = 2;
export const SNAPSHOT_DAYS = 400;

export interface SnapshotDay {
  /** YYYY-MM-DD */
  d: string;
  /** Working a shift that starts this day. */
  on: boolean;
  /** Short code: "24", "D", "N", "K", "T", "V", "S", "OT", or "" when off. */
  c: string;
  /** Start, minutes after midnight (0 when off). */
  s: number;
  /** Length in minutes (0 when off). */
  m: number;
  /** Full label for the shift, e.g. "24 hour tour". */
  l: string;
  /**
   * Every working shift that starts this day, earliest first. Written only when there is
   * more than one (say a callback after a day shift), so the day level fields above cover
   * the usual case and older snapshots without it still work.
   */
  sh?: SnapshotShift[];
}

export interface SnapshotShift {
  /** Start, minutes after midnight. */
  s: number;
  /** Length in minutes. */
  m: number;
  /** Full label, e.g. "Extra shift". */
  l: string;
}

/** Every working shift that starts on a snapshot day (older snapshots carry only the day level one). */
export function shiftsOfDay(day: SnapshotDay): SnapshotShift[] {
  if (day.sh) return day.sh;
  return day.on ? [{ s: day.s, m: day.m, l: day.l }] : [];
}

function shiftLabel(shift: ShiftInstance, types: readonly ShiftType[]): string {
  const type = types.find((t) => t.id === shift.shiftTypeId);
  return shift.source === 'extra' ? 'Extra shift' : shift.source === 'trade-in' ? `${type?.label ?? 'Shift'} (trade)` : (type?.label ?? 'Shift');
}

export interface WidgetSnapshot {
  v: number;
  generated: string;
  name: string;
  platoon: string;
  fill: string;
  text: string;
  bg: WidgetBackground;
  rotation: string;
  hour12: boolean;
  days: SnapshotDay[];
}

export function buildSnapshot(args: {
  profile: Profile;
  overrides: readonly Override[];
  today: string;
  hour12: boolean;
  background: WidgetBackground;
  days?: number;
}): WidgetSnapshot {
  const { profile, today } = args;
  const count = args.days ?? SNAPSHOT_DAYS;
  // Extra shifts can last up to 72 hours, so keep three days back: a shift that started
  // three days ago may still be running this morning.
  const from = addDays(today, -3);
  const summary = summarizeDays(profile.rotation, profile.platoon, from, count + 2, args.overrides);
  // summarizeDays keeps one shift per day; collect every working shift so a second one
  // the same day (overtime after a day shift, an early hireback before a tour) is not lost.
  const workingByDate = new Map<string, ShiftInstance[]>();
  for (const sh of effectiveShifts(profile.rotation, profile.platoon, from, addDays(from, count + 1), args.overrides)) {
    if (!isWorking(sh)) continue;
    const list = workingByDate.get(sh.date) ?? [];
    list.push(sh);
    workingByDate.set(sh.date, list);
  }
  const colors = PLATOON_COLORS[profile.platoon];
  const rotationName = profile.rotation.presetId === 'custom' ? 'Custom' : presetInfo(profile.rotation.presetId).name;
  return {
    v: SNAPSHOT_VERSION,
    generated: today,
    name: profile.name,
    platoon: profile.platoon,
    fill: colors.fill,
    text: colors.text,
    bg: args.background,
    rotation: rotationName,
    hour12: args.hour12,
    days: summary.map((d) => {
      const label = d.shift && d.on ? shiftLabel(d.shift, profile.rotation.shiftTypes) : statusLabel(d.code);
      const day: SnapshotDay = { d: d.date, on: d.on, c: d.code, s: d.on && d.shift ? d.shift.startMinutes : 0, m: d.on && d.shift ? d.shift.durationMinutes : 0, l: label };
      const working = workingByDate.get(d.date) ?? [];
      if (working.length > 1) day.sh = working.map((w) => ({ s: w.startMinutes, m: w.durationMinutes, l: shiftLabel(w, profile.rotation.shiftTypes) }));
      return day;
    }),
  };
}

function statusLabel(code: string): string {
  switch (code) {
    case 'K':
      return 'Kelly day';
    case 'T':
      return 'Traded away';
    case 'V':
      return 'Vacation';
    case 'S':
      return 'Sick day';
    case 'L':
      return 'Leave';
    default:
      return 'Off';
  }
}

/**
 * The short label for a day cell: the platoon letter on rotation shifts (plus D or N when
 * the rotation has day and night shifts), the code alone for extra shifts (OT) and trade
 * shifts (T+), the code for days off with a reason (K, T, V, S), else "off".
 * The Swift widget mirrors this in cellLabel().
 */
export function dayCellLabel(platoon: string, on: boolean, code: string): string {
  if (on) {
    if (code === 'OT' || code === 'T+') return code;
    return platoon + (code && code !== '24' ? code : '');
  }
  return code || 'off';
}

export interface WidgetDayCell {
  date: string;
  weekday: string;
  dayOfMonth: number;
  on: boolean;
  code: string;
  isToday: boolean;
}

export interface WidgetView {
  ok: boolean;
  on: boolean;
  /** "ON" or "OFF". */
  status: string;
  /** "24 hour tour until 7 AM tomorrow", "Next shift in 2 days" ... */
  detail: string;
  /** "Mon, Jan 4" */
  dateLabel: string;
  platoon: string;
  fill: string;
  text: string;
  week: WidgetDayCell[];
}

/**
 * What a widget shows at a given local date and time. The Swift widget mirrors this
 * function line for line (targets/widget/Snapshot.swift).
 */
/** "Thu, Nov 19". The Swift widget mirrors this in shortDateLabel(). */
function shortDateLabel(date: string): string {
  const d = parseISO(date);
  return `${WEEKDAY_SHORT[weekday(date)]}, ${MONTH_SHORT[d.month - 1]} ${d.day}`;
}

export function widgetView(snapshot: WidgetSnapshot | null, date: string, minutes: number): WidgetView {
  const dateLabel = shortDateLabel(date);
  const todayNum = dayNumber(date);
  if (!snapshot || snapshot.days.length === 0 || snapshot.days[snapshot.days.length - 1]!.d < date) {
    return { ok: false, on: false, status: 'Open Rotawise', detail: 'Open the app to refresh your rotation', dateLabel, platoon: '', fill: '#555555', text: '#FFFFFF', week: [] };
  }
  const now = todayNum * MINUTES_PER_DAY + minutes;
  let current: SnapshotShift | null = null;
  let currentStart = 0;
  let next: SnapshotShift | null = null;
  let nextDay = 0;
  scan: for (const day of snapshot.days) {
    const n = dayNumber(day.d);
    for (const shift of shiftsOfDay(day)) {
      const start = n * MINUTES_PER_DAY + shift.s;
      const end = start + shift.m;
      if (current === null && start <= now && now < end) {
        current = shift;
        currentStart = start;
      }
      if (next === null && start > now) {
        next = shift;
        nextDay = n;
        break scan;
      }
    }
  }
  const fmt = (m: number) => formatMinutes(m, snapshot.hour12);
  let detail: string;
  if (current) {
    const endAbs = currentStart + current.m;
    const endDay = Math.floor(endAbs / MINUTES_PER_DAY);
    const endMin = endAbs - endDay * MINUTES_PER_DAY;
    const when = endDay === todayNum ? 'today' : endDay === todayNum + 1 ? 'tomorrow' : `on ${shortDateLabel(fromDayNumber(endDay))}`;
    detail = `${current.l} until ${fmt(endMin)} ${when}`;
  } else if (next) {
    const n = nextDay - todayNum;
    detail = n === 0 ? `Next shift today at ${fmt(next.s)}` : n === 1 ? 'Next shift tomorrow' : `Next shift in ${n} days`;
  } else {
    detail = 'No shifts scheduled';
  }
  const startIdx = snapshot.days.findIndex((x) => x.d === date);
  const week: WidgetDayCell[] = (startIdx >= 0 ? snapshot.days.slice(startIdx, startIdx + 7) : []).map((x) => ({
    date: x.d,
    weekday: WEEKDAY_SHORT[weekday(x.d)]!,
    dayOfMonth: parseISO(x.d).day,
    on: x.on,
    code: x.c,
    isToday: x.d === date,
  }));
  return {
    ok: true,
    on: current !== null,
    status: current ? 'ON' : 'OFF',
    detail,
    dateLabel,
    platoon: snapshot.platoon,
    fill: snapshot.fill,
    text: snapshot.text,
    week,
  };
}

/** Colors for a widget background choice. */
export function widgetColors(bg: WidgetBackground, systemDark: boolean, fill: string, text: string): { background: string; foreground: string; muted: string; chipOff: string } {
  if (bg === 'platoon') return { background: fill, foreground: text, muted: text, chipOff: text === '#000000' ? '#00000022' : '#FFFFFF33' };
  const dark = bg === 'dark' || (bg === 'system' && systemDark);
  return dark
    ? { background: '#141C25', foreground: '#F2F5F8', muted: '#A9B5C1', chipOff: '#1E2832' }
    : { background: '#FFFFFF', foreground: '#0E1621', muted: '#4F5D6B', chipOff: '#E9EDF1' };
}
