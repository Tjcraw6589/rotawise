/**
 * The data the home screen widgets read. The app writes a snapshot of the next 400 days
 * whenever anything changes; the iOS widget (Swift, targets/widget) and the Android widget
 * (src/widgets/android) both turn it into what they show with the same rules as
 * `widgetView` below. Because the snapshot covers more than a year ahead, the widgets
 * keep rolling over at midnight even if the app is not opened.
 */
import type { Profile, WidgetBackground } from './model.ts';
import { PLATOON_COLORS } from './platoonColors.ts';
import { addDays, dayNumber, formatMinutes, fromDayNumber, parseISO, weekday, MONTH_SHORT, WEEKDAY_SHORT, MINUTES_PER_DAY , presetInfo, summarizeDays } from './rotation/index.ts';
import type { Override } from './rotation/index.ts';

export const SNAPSHOT_VERSION = 1;
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
  const from = addDays(today, -2);
  const summary = summarizeDays(profile.rotation, profile.platoon, from, count + 2, args.overrides);
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
      const type = d.shift ? profile.rotation.shiftTypes.find((t) => t.id === d.shift!.shiftTypeId) : undefined;
      const label = d.shift && d.on ? (d.shift.source === 'extra' ? 'Extra shift' : d.shift.source === 'trade-in' ? `${type?.label ?? 'Shift'} (trade)` : (type?.label ?? 'Shift')) : statusLabel(d.code);
      return { d: d.date, on: d.on, c: d.code, s: d.on && d.shift ? d.shift.startMinutes : 0, m: d.on && d.shift ? d.shift.durationMinutes : 0, l: label };
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
export function widgetView(snapshot: WidgetSnapshot | null, date: string, minutes: number): WidgetView {
  const d = parseISO(date);
  const dateLabel = `${WEEKDAY_SHORT[weekday(date)]}, ${MONTH_SHORT[d.month - 1]} ${d.day}`;
  const todayNum = dayNumber(date);
  if (!snapshot || snapshot.days.length === 0 || snapshot.days[snapshot.days.length - 1]!.d < date) {
    return { ok: false, on: false, status: 'Open Rotawise', detail: 'Open the app to refresh your rotation', dateLabel, platoon: '', fill: '#555555', text: '#FFFFFF', week: [] };
  }
  const now = todayNum * MINUTES_PER_DAY + minutes;
  let current: SnapshotDay | null = null;
  let next: SnapshotDay | null = null;
  for (const day of snapshot.days) {
    if (!day.on) continue;
    const start = dayNumber(day.d) * MINUTES_PER_DAY + day.s;
    const end = start + day.m;
    if (start <= now && now < end && current === null) current = day;
    if (start > now && next === null) next = day;
    if (next !== null && start > now) break;
  }
  const fmt = (m: number) => formatMinutes(m, snapshot.hour12);
  let detail: string;
  if (current) {
    const endAbs = dayNumber(current.d) * MINUTES_PER_DAY + current.s + current.m;
    const endDay = Math.floor(endAbs / MINUTES_PER_DAY);
    const endMin = endAbs - endDay * MINUTES_PER_DAY;
    const when = endDay === todayNum ? 'today' : endDay === todayNum + 1 ? 'tomorrow' : fromDayNumber(endDay);
    detail = `${current.l} until ${fmt(endMin)} ${when}`;
  } else if (next) {
    const n = dayNumber(next.d) - todayNum;
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
