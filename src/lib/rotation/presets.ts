import type { ISODate } from './dates.ts';
import type { KellyRule, PresetId, Rotation, ShiftType } from './types.ts';

export const TOUR_24: ShiftType = {
  id: 'tour24',
  label: '24 hour tour',
  short: '24',
  kind: 'tour',
  startMinutes: 7 * 60,
  durationMinutes: 24 * 60,
};

export const DAY_12: ShiftType = {
  id: 'day12',
  label: '12 hour day',
  short: 'D',
  kind: 'day',
  startMinutes: 7 * 60,
  durationMinutes: 12 * 60,
};

export const NIGHT_12: ShiftType = {
  id: 'night12',
  label: '12 hour night',
  short: 'N',
  kind: 'night',
  startMinutes: 19 * 60,
  durationMinutes: 12 * 60,
};

export const DAY_8: ShiftType = {
  id: 'day8',
  label: '8 hour day',
  short: 'D',
  kind: 'day',
  startMinutes: 8 * 60,
  durationMinutes: 8 * 60,
};

export interface PresetInfo {
  id: PresetId;
  name: string;
  tagline: string;
  description: string;
  /** Who typically works it; used on the landing site. */
  usedBy: string;
  platoonCount: number;
  cycleLength: number;
  hoursPerWeekAverage: number;
}

const on = (id: string, n: number): (string | null)[] => Array<string | null>(n).fill(id);
const off = (n: number): (string | null)[] => Array<string | null>(n).fill(null);

type Builder = (anchorDate: ISODate) => Rotation;

const builders: Record<Exclude<PresetId, 'custom'>, Builder> = {
  '24-48': (anchorDate) => ({
    presetId: '24-48',
    cycle: [TOUR_24.id, null, null],
    shiftTypes: [TOUR_24],
    platoonCount: 3,
    platoonOffsetDays: 1,
    anchorDate,
    kelly: null,
  }),
  '48-96': (anchorDate) => ({
    presetId: '48-96',
    cycle: [...on(TOUR_24.id, 2), ...off(4)],
    shiftTypes: [TOUR_24],
    platoonCount: 3,
    platoonOffsetDays: 2,
    anchorDate,
    kelly: null,
  }),
  '24-72': (anchorDate) => ({
    presetId: '24-72',
    cycle: [TOUR_24.id, null, null, null],
    shiftTypes: [TOUR_24],
    platoonCount: 4,
    platoonOffsetDays: 1,
    anchorDate,
    kelly: null,
  }),
  // Classic 3 platoon "Kelly schedule": 24 on, 24 off, 24 on, 24 off, 24 on, then 4 days off (9 day cycle).
  // Every Nth tour is a Kelly day off; departments differ, so the interval is configurable.
  kelly: (anchorDate) => ({
    presetId: 'kelly',
    cycle: [TOUR_24.id, null, TOUR_24.id, null, TOUR_24.id, null, null, null, null],
    shiftTypes: [TOUR_24],
    platoonCount: 3,
    platoonOffsetDays: 3,
    anchorDate,
    kelly: { everyNthShift: 7 },
  }),
  // Pitman: 14 day cycle, 12 hour shifts, 2 on 2 off 3 on 2 off 2 on 3 off.
  // Four platoons: A and B work days opposite each other, C and D work nights.
  pitman: (anchorDate) => ({
    presetId: 'pitman',
    // Written for A and B on days; platoons C and D work the same cycle on nights (see schedule.ts).
    cycle: [...on(DAY_12.id, 2), ...off(2), ...on(DAY_12.id, 3), ...off(2), ...on(DAY_12.id, 2), ...off(3)],
    shiftTypes: [DAY_12, NIGHT_12],
    platoonCount: 4,
    platoonOffsetDays: 7,
    anchorDate,
    kelly: null,
  }),
  // DuPont: 28 day cycle, 4 platoons offset by 7 days.
  dupont: (anchorDate) => ({
    presetId: 'dupont',
    cycle: [...on(NIGHT_12.id, 4), ...off(3), ...on(DAY_12.id, 3), ...off(1), ...on(NIGHT_12.id, 3), ...off(3), ...on(DAY_12.id, 4), ...off(7)],
    shiftTypes: [DAY_12, NIGHT_12],
    platoonCount: 4,
    platoonOffsetDays: 7,
    anchorDate,
    kelly: null,
  }),
  // 2 2 3 (Panama): 14 day cycle of 12 hour days, two platoons that mirror each other.
  '2-2-3': (anchorDate) => ({
    presetId: '2-2-3',
    cycle: [...on(DAY_12.id, 2), ...off(2), ...on(DAY_12.id, 3), ...off(2), ...on(DAY_12.id, 2), ...off(3)],
    shiftTypes: [DAY_12],
    platoonCount: 2,
    platoonOffsetDays: 7,
    anchorDate,
    kelly: null,
  }),
  // 4 on 4 off: 16 day cycle (4 days, 4 off, 4 nights, 4 off), four platoons offset by 4 days.
  '4-on-4-off': (anchorDate) => ({
    presetId: '4-on-4-off',
    cycle: [...on(DAY_12.id, 4), ...off(4), ...on(NIGHT_12.id, 4), ...off(4)],
    shiftTypes: [DAY_12, NIGHT_12],
    platoonCount: 4,
    platoonOffsetDays: 4,
    anchorDate,
    kelly: null,
  }),
  // 3 twelves: a weekly pattern of three 12 hour days. Two platoons cover six days; the seventh is open.
  '3-twelves': (anchorDate) => ({
    presetId: '3-twelves',
    cycle: [...on(DAY_12.id, 3), ...off(4)],
    shiftTypes: [DAY_12],
    platoonCount: 2,
    platoonOffsetDays: 3,
    anchorDate,
    kelly: null,
  }),
};

export const PRESETS: PresetInfo[] = [
  {
    id: '24-48',
    name: '24/48',
    tagline: '24 on, 48 off',
    description: 'Three platoons. One 24 hour tour, then two days off. The most common fire service schedule in North America.',
    usedBy: 'Fire departments and ambulance services',
    platoonCount: 3,
    cycleLength: 3,
    hoursPerWeekAverage: 56,
  },
  {
    id: '48-96',
    name: '48/96',
    tagline: '48 on, 96 off',
    description: 'Three platoons. Two back to back 24 hour tours, then four days off.',
    usedBy: 'Fire departments in the western United States',
    platoonCount: 3,
    cycleLength: 6,
    hoursPerWeekAverage: 56,
  },
  {
    id: '24-72',
    name: '24/72',
    tagline: '24 on, 72 off',
    description: 'Four platoons. One 24 hour tour, then three days off.',
    usedBy: 'Fire and EMS agencies with four platoons',
    platoonCount: 4,
    cycleLength: 4,
    hoursPerWeekAverage: 42,
  },
  {
    id: 'kelly',
    name: 'Kelly schedule',
    tagline: '24 on, 24 off, three times, then 4 off',
    description:
      'Three platoons on a nine day cycle: on, off, on, off, on, then four days off. Add Kelly days, an extra day off every Nth tour, at whatever interval your department uses.',
    usedBy: 'Fire departments with a Kelly day agreement',
    platoonCount: 3,
    cycleLength: 9,
    hoursPerWeekAverage: 56,
  },
  {
    id: 'pitman',
    name: 'Pitman',
    tagline: '2 on, 2 off, 3 on, 2 off, 2 on, 3 off',
    description: 'Four platoons on 12 hour shifts over a 14 day cycle. A and B work days, C and D work nights. Every other weekend is a three day weekend.',
    usedBy: 'Police, dispatch, hospitals and plants',
    platoonCount: 4,
    cycleLength: 14,
    hoursPerWeekAverage: 42,
  },
  {
    id: 'dupont',
    name: 'DuPont',
    tagline: '4 nights, 3 off, 3 days, 1 off, 3 nights, 3 off, 4 days, 7 off',
    description: 'Four platoons on 12 hour shifts over a 28 day cycle with a full week off each cycle.',
    usedBy: 'Plants, utilities and some police agencies',
    platoonCount: 4,
    cycleLength: 28,
    hoursPerWeekAverage: 42,
  },
  {
    id: '2-2-3',
    name: '2 2 3',
    tagline: '2 on, 2 off, 3 on, 2 off, 2 on, 3 off',
    description: 'Two platoons on 12 hour days over a 14 day cycle. Also called the Panama schedule.',
    usedBy: 'Police, corrections, dispatch and hospitals',
    platoonCount: 2,
    cycleLength: 14,
    hoursPerWeekAverage: 42,
  },
  {
    id: '4-on-4-off',
    name: '4 on 4 off',
    tagline: '4 days, 4 off, 4 nights, 4 off',
    description: 'Four platoons on 12 hour shifts over a 16 day cycle.',
    usedBy: 'Police, security, manufacturing',
    platoonCount: 4,
    cycleLength: 16,
    hoursPerWeekAverage: 42,
  },
  {
    id: '3-twelves',
    name: '3 twelves',
    tagline: 'Three 12 hour days a week',
    description: 'A weekly pattern of three 12 hour shifts. Two platoons cover six days a week.',
    usedBy: 'Nurses, EMS and hospital staff',
    platoonCount: 2,
    cycleLength: 7,
    hoursPerWeekAverage: 36,
  },
  {
    id: 'custom',
    name: 'Custom pattern',
    tagline: 'Any sequence of on, off and shift types',
    description: 'Build your own cycle day by day, with any shift types, any number of platoons and any start date.',
    usedBy: 'Anyone whose department does it their own way',
    platoonCount: 3,
    cycleLength: 0,
    hoursPerWeekAverage: 0,
  },
];

export function presetInfo(id: PresetId): PresetInfo {
  const found = PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown preset ${id}`);
  return found;
}

/**
 * Build a rotation from a preset. Platoon A is at cycle day 0 on `anchorDate`.
 * `kelly`: undefined keeps the preset's default (only the Kelly preset has one),
 * null turns Kelly days off, a rule adds Kelly days to any preset (common on 24/48).
 */
export function rotationFromPreset(id: Exclude<PresetId, 'custom'>, anchorDate: ISODate, kelly?: KellyRule | null): Rotation {
  const build = builders[id];
  const rotation = build(anchorDate);
  if (kelly === null) return { ...rotation, kelly: null };
  if (kelly !== undefined) return { ...rotation, kelly: { ...kelly } };
  return rotation;
}

/** Build a custom rotation. */
export function customRotation(args: {
  cycle: (string | null)[];
  shiftTypes: ShiftType[];
  platoonCount: number;
  anchorDate: ISODate;
  platoonOffsetDays?: number;
  kelly?: KellyRule | null;
}): Rotation {
  if (args.cycle.length === 0) throw new Error('A cycle needs at least one day');
  if (args.platoonCount < 1 || args.platoonCount > 4) throw new Error('Platoons must be between 1 and 4');
  const offset = args.platoonOffsetDays ?? Math.max(1, Math.round(args.cycle.length / args.platoonCount));
  return {
    presetId: 'custom',
    cycle: [...args.cycle],
    shiftTypes: [...args.shiftTypes],
    platoonCount: args.platoonCount,
    platoonOffsetDays: offset,
    anchorDate: args.anchorDate,
    kelly: args.kelly ? { ...args.kelly } : null,
  };
}

export const SHIFT_TYPE_LIBRARY: ShiftType[] = [TOUR_24, DAY_12, NIGHT_12, DAY_8];
