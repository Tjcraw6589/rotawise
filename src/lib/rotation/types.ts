import type { ISODate } from './dates.ts';

export type Platoon = 'A' | 'B' | 'C' | 'D';
export const PLATOONS: readonly Platoon[] = ['A', 'B', 'C', 'D'];

export type ShiftKind = 'tour' | 'day' | 'night' | 'custom';

export interface ShiftType {
  id: string;
  /** Full label, e.g. "24 hour tour". */
  label: string;
  /** One or two letters shown in tight calendar cells, e.g. "D", "N", "24". */
  short: string;
  kind: ShiftKind;
  /** Minutes after midnight on the start date. */
  startMinutes: number;
  /** Wall clock length. A 24 hour tour is 1440 even on a clock change night. */
  durationMinutes: number;
}

export type PresetId =
  | '24-48'
  | '48-96'
  | '24-72'
  | 'kelly'
  | 'pitman'
  | 'dupont'
  | '2-2-3'
  | '4-on-4-off'
  | '3-twelves'
  | 'custom';

export interface KellyRule {
  /** Every Nth scheduled shift (counting from the anchor date) is a Kelly day off. Below 2 means no Kelly days. */
  everyNthShift: number;
  /**
   * Which shift in each run of N is the Kelly day, 0..N-1. A shift is a Kelly day when
   * (ordinal - phase) is a multiple of N, so phase 0 makes shifts N, 2N, 3N Kelly days.
   * Lets members of different Kelly groups on one platoon line up with their own days.
   */
  phase?: number;
}

/**
 * A rotation is a repeating cycle of cycle days. Each cycle day is either a shift
 * type id or null (off). Platoon A is at cycle index 0 on `anchorDate`; platoon B
 * starts `platoonOffsetDays` later, platoon C twice that, and so on.
 */
export interface Rotation {
  presetId: PresetId;
  cycle: (string | null)[];
  shiftTypes: ShiftType[];
  platoonCount: number;
  platoonOffsetDays: number;
  anchorDate: ISODate;
  kelly: KellyRule | null;
}

export type ShiftSource = 'rotation' | 'extra' | 'trade-in';

export type ShiftStatus =
  | 'scheduled' // working as planned
  | 'kelly' // scheduled, but this is a Kelly day off
  | 'traded-away' // given to someone else
  | 'vacation'
  | 'sick'
  | 'other-leave';

export interface ShiftInstance {
  /** Stable id: platoon, start date, shift type, source. */
  id: string;
  platoon: Platoon;
  shiftTypeId: string;
  date: ISODate;
  startMinutes: number;
  durationMinutes: number;
  /** Date the shift ends on; the next day when it crosses midnight. */
  endDate: ISODate;
  /** Minutes after midnight on `endDate`. */
  endMinutes: number;
  source: ShiftSource;
  status: ShiftStatus;
  /** Id of the override that created or changed this instance, if any. */
  overrideId?: string;
  /** Ordinal of the scheduled shift counted from the anchor (1 = first). Rotation shifts only. */
  ordinal?: number;
}

export type TradeDirection = 'gave' | 'took';

export interface TradeOverride {
  id: string;
  kind: 'trade';
  date: ISODate;
  direction: TradeDirection;
  /** Who you traded with. */
  counterpart: string;
  /** Shift type worked or given; defaults to the rotation's first shift type. */
  shiftTypeId?: string;
  /** Hours owed or paid back; defaults to the shift length. */
  hours?: number;
  /** Set when the favor has been returned. */
  settled: boolean;
  note?: string;
}

export interface ExtraOverride {
  id: string;
  kind: 'extra';
  date: ISODate;
  category: 'overtime' | 'extra-shift' | 'callback' | 'training';
  shiftTypeId?: string;
  startMinutes?: number;
  hours: number;
  note?: string;
}

export type LeaveType = 'vacation' | 'sick' | 'kelly' | 'other';

export interface LeaveOverride {
  id: string;
  kind: 'leave';
  date: ISODate;
  leaveType: LeaveType;
  /** Hours charged against the balance; defaults to the shift length. */
  hours?: number;
  note?: string;
}

export type Override = TradeOverride | ExtraOverride | LeaveOverride;

export interface StatusNow {
  on: boolean;
  /** The shift being worked right now, if any. */
  current: ShiftInstance | null;
  /** The next working shift that starts after now. */
  next: ShiftInstance | null;
  /** Whole days from today to the next shift's start date (0 = later today). */
  daysUntilNext: number | null;
}

export function isWorking(shift: ShiftInstance): boolean {
  return shift.status === 'scheduled';
}
