/**
 * What the rotation setup screen edits, and how it maps to a Rotation. Users pick "a day
 * you worked, starting a run" for their own platoon; the rotation's anchor (platoon A at
 * cycle day 0) is worked out from that.
 */
import { withStartTime } from './model.ts';
import type { Platoon, PresetId, Rotation, ShiftType } from './rotation/index.ts';
import {
  DAY_12,
  DAY_8,
  NIGHT_12,
  PLATOONS,
  SHIFT_TYPE_LIBRARY,
  TOUR_24,
  addDays,
  baseShifts,
  customRotation,
  diffDays,
  rotationFromPreset,
} from './rotation/index.ts';

export interface SetupState {
  presetId: PresetId;
  platoon: Platoon;
  /** A day this platoon started a run of shifts (cycle day 0 for this platoon). */
  workedDate: string;
  startMinutes: number;
  kellyEnabled: boolean;
  kellyEvery: number;
  kellyPhase: number;
  /** Custom pattern only. */
  customCycle: (string | null)[];
  customPlatoons: number;
}

/** Shift types a custom pattern can use, in the order a cycle chip steps through them. */
export const CUSTOM_STEPS: (string | null)[] = [null, TOUR_24.id, DAY_12.id, NIGHT_12.id, DAY_8.id];

export function defaultSetup(today: string): SetupState {
  return {
    presetId: '24-48',
    platoon: 'A',
    workedDate: today,
    startMinutes: TOUR_24.startMinutes,
    kellyEnabled: false,
    kellyEvery: 7,
    kellyPhase: 0,
    customCycle: [TOUR_24.id, null, null],
    customPlatoons: 3,
  };
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

function shiftsPerCycle(r: Rotation): number {
  return r.cycle.filter((c) => c !== null).length;
}

/** The base rotation for a setup before the anchor, Kelly rule and start time are applied. */
function baseFor(setup: SetupState): Rotation {
  if (setup.presetId === 'custom') {
    const used = new Set(setup.customCycle.filter((c): c is string => c !== null));
    const shiftTypes: ShiftType[] = SHIFT_TYPE_LIBRARY.filter((t) => used.has(t.id));
    return customRotation({
      cycle: setup.customCycle.length > 0 ? setup.customCycle : [null],
      shiftTypes: shiftTypes.length > 0 ? shiftTypes : [TOUR_24],
      platoonCount: setup.customPlatoons,
      anchorDate: setup.workedDate,
    });
  }
  return rotationFromPreset(setup.presetId, setup.workedDate, null);
}

export function platoonCountFor(setup: SetupState): number {
  return setup.presetId === 'custom' ? setup.customPlatoons : baseFor(setup).platoonCount;
}

export function rotationFromSetup(setup: SetupState): { rotation: Rotation; platoon: Platoon } {
  const base = baseFor(setup);
  const count = base.platoonCount;
  const platoon = PLATOONS.indexOf(setup.platoon) < count ? setup.platoon : 'A';
  const idx = PLATOONS.indexOf(platoon);
  const anchorDate = addDays(setup.workedDate, -idx * base.platoonOffsetDays);
  const every = Math.max(2, Math.min(60, Math.round(setup.kellyEvery)));
  const kelly = setup.kellyEnabled && shiftsPerCycle(base) > 0 ? { everyNthShift: every, phase: mod(setup.kellyPhase, every) } : null;
  const rotation = withStartTime({ ...base, anchorDate, kelly }, setup.startMinutes);
  return { rotation, platoon };
}

/**
 * Read an existing rotation back into the setup form. The worked date is moved to the
 * most recent start of a cycle on or before `today`, and the Kelly phase is adjusted so
 * the Kelly days stay on exactly the same dates.
 */
export function setupFromRotation(rotation: Rotation, platoon: Platoon, today: string): SetupState {
  const idx = PLATOONS.indexOf(platoon);
  const L = rotation.cycle.length;
  const start = addDays(rotation.anchorDate, idx * rotation.platoonOffsetDays);
  const k = Math.floor(diffDays(start, today) / L);
  const workedDate = addDays(start, k * L);
  const every = rotation.kelly?.everyNthShift ?? 7;
  const phase = rotation.kelly ? mod((rotation.kelly.phase ?? 0) - k * shiftsPerCycle(rotation), every) : 0;
  return {
    presetId: rotation.presetId,
    platoon,
    workedDate,
    startMinutes: rotation.shiftTypes[0]?.startMinutes ?? TOUR_24.startMinutes,
    kellyEnabled: rotation.kelly !== null && rotation.kelly.everyNthShift >= 2,
    kellyEvery: every,
    kellyPhase: phase,
    customCycle: rotation.presetId === 'custom' ? [...rotation.cycle] : [TOUR_24.id, null, null],
    customPlatoons: rotation.presetId === 'custom' ? rotation.platoonCount : 3,
  };
}

/** The next `count` working shifts from `today` (ignoring Kelly days), with the phase that makes each one the Kelly day. */
export function kellyChoices(setup: SetupState, today: string, count: number): { date: string; phase: number }[] {
  const { rotation, platoon } = rotationFromSetup({ ...setup, kellyEnabled: false });
  const every = Math.max(2, Math.round(setup.kellyEvery));
  const horizon = Math.max(60, rotation.cycle.length * (count + 2));
  return baseShifts(rotation, platoon, today, addDays(today, horizon))
    .slice(0, count)
    .map((s) => ({ date: s.date, phase: mod(s.ordinal ?? 0, every) }));
}

/** Help text for "a day you started a run of shifts", per preset. */
export function workedDateHelp(presetId: PresetId): string {
  switch (presetId) {
    case '24-48':
    case '24-72':
      return 'Any day you worked a tour.';
    case '48-96':
      return 'The first of your two tours in a row.';
    case 'kelly':
      return 'The first of your three tours, right after four days off.';
    case 'pitman':
    case '2-2-3':
      return 'The first day of a two day run that comes right after three days off.';
    case 'dupont':
      return 'The first of four nights in a row.';
    case '4-on-4-off':
      return 'The first of four day shifts in a row.';
    case '3-twelves':
      return 'The first of your three shifts in a week.';
    default:
      return 'The day your pattern starts (cycle day 1).';
  }
}
