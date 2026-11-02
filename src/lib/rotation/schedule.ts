import { MINUTES_PER_DAY, addDays, dayNumber, diffDays, fromDayNumber } from './dates.ts';
import type { ISODate } from './dates.ts';
import type { Override, Platoon, Rotation, ShiftInstance, ShiftType, StatusNow } from './types.ts';
import { PLATOONS, isWorking } from './types.ts';

const mod = (n: number, m: number): number => ((n % m) + m) % m;

export function platoonIndex(platoon: Platoon): number {
  return PLATOONS.indexOf(platoon);
}

export function shiftTypeById(rotation: Rotation, id: string): ShiftType {
  const found = rotation.shiftTypes.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown shift type ${id}`);
  return found;
}

/**
 * For Pitman style rotations (A/B days, C/D nights) the cycle is written for days and
 * platoons C and D swap the day type for the night type. Only presets that carry both
 * shift types and exactly four platoons with a two platoon offset structure use this.
 */
function shiftTypeForPlatoon(rotation: Rotation, platoon: Platoon, cycleTypeId: string): string {
  if (rotation.presetId !== 'pitman') return cycleTypeId;
  const idx = platoonIndex(platoon);
  if (idx < 2) return cycleTypeId;
  const night = rotation.shiftTypes.find((s) => s.kind === 'night');
  return night ? night.id : cycleTypeId;
}

/** The day of the platoon's cycle that falls on `date` (0 based). */
export function cycleIndexOn(rotation: Rotation, platoon: Platoon, date: ISODate): number {
  const L = rotation.cycle.length;
  const start = dayNumber(rotation.anchorDate) + platoonIndex(platoon) * rotation.platoonOffsetDays;
  return mod(dayNumber(date) - start, L);
}

function shiftsPerCycle(rotation: Rotation): number {
  return rotation.cycle.filter((c) => c !== null).length;
}

/**
 * 1 based ordinal of the scheduled shift on `date`, counted from the platoon's first cycle
 * day on or after its own anchor. Negative or zero before the anchor. Null when off.
 */
export function shiftOrdinalOn(rotation: Rotation, platoon: Platoon, date: ISODate): number | null {
  const L = rotation.cycle.length;
  const start = dayNumber(rotation.anchorDate) + platoonIndex(platoon) * rotation.platoonOffsetDays;
  const elapsed = dayNumber(date) - start;
  const cycles = Math.floor(elapsed / L);
  const rem = elapsed - cycles * L;
  if (rotation.cycle[rem] === null) return null;
  let partial = 0;
  for (let i = 0; i <= rem; i++) if (rotation.cycle[i] !== null) partial += 1;
  return cycles * shiftsPerCycle(rotation) + partial;
}

export function isKellyDay(rotation: Rotation, ordinal: number | null): boolean {
  if (!rotation.kelly || ordinal === null) return false;
  const n = Math.floor(rotation.kelly.everyNthShift);
  if (n < 2) return false;
  return mod(ordinal - (rotation.kelly.phase ?? 0), n) === 0;
}

function endOf(date: ISODate, startMinutes: number, durationMinutes: number): { endDate: ISODate; endMinutes: number } {
  const total = startMinutes + durationMinutes;
  const dayCarry = Math.floor(total / MINUTES_PER_DAY);
  return { endDate: addDays(date, dayCarry), endMinutes: total - dayCarry * MINUTES_PER_DAY };
}

export function makeInstance(args: {
  platoon: Platoon;
  type: ShiftType;
  date: ISODate;
  source: ShiftInstance['source'];
  status: ShiftInstance['status'];
  startMinutes?: number;
  durationMinutes?: number;
  overrideId?: string;
  ordinal?: number;
}): ShiftInstance {
  const startMinutes = args.startMinutes ?? args.type.startMinutes;
  const durationMinutes = args.durationMinutes ?? args.type.durationMinutes;
  const { endDate, endMinutes } = endOf(args.date, startMinutes, durationMinutes);
  const instance: ShiftInstance = {
    id: `${args.platoon}:${args.date}:${args.type.id}:${args.source}${args.overrideId ? `:${args.overrideId}` : ''}`,
    platoon: args.platoon,
    shiftTypeId: args.type.id,
    date: args.date,
    startMinutes,
    durationMinutes,
    endDate,
    endMinutes,
    source: args.source,
    status: args.status,
  };
  if (args.overrideId !== undefined) instance.overrideId = args.overrideId;
  if (args.ordinal !== undefined) instance.ordinal = args.ordinal;
  return instance;
}

/** The base rotation's shift on `date` for a platoon, or null when off. Kelly days come back with status 'kelly'. */
export function baseShiftOn(rotation: Rotation, platoon: Platoon, date: ISODate): ShiftInstance | null {
  const idx = cycleIndexOn(rotation, platoon, date);
  const typeId = rotation.cycle[idx];
  if (typeId === null || typeId === undefined) return null;
  const ordinal = shiftOrdinalOn(rotation, platoon, date);
  const type = shiftTypeById(rotation, shiftTypeForPlatoon(rotation, platoon, typeId));
  return makeInstance({
    platoon,
    type,
    date,
    source: 'rotation',
    status: isKellyDay(rotation, ordinal) ? 'kelly' : 'scheduled',
    ordinal: ordinal ?? undefined,
  });
}

/**
 * All base shifts that START between `from` and `to` inclusive. Pass `from` one day
 * earlier when you also need shifts that spill into the range from the day before.
 */
export function baseShifts(rotation: Rotation, platoon: Platoon, from: ISODate, to: ISODate): ShiftInstance[] {
  const out: ShiftInstance[] = [];
  const a = dayNumber(from);
  const b = dayNumber(to);
  for (let n = a; n <= b; n++) {
    const s = baseShiftOn(rotation, platoon, fromDayNumber(n));
    if (s) out.push(s);
  }
  return out;
}

function defaultType(rotation: Rotation, id?: string): ShiftType {
  if (id) return shiftTypeById(rotation, id);
  const first = rotation.shiftTypes[0];
  if (!first) throw new Error('Rotation has no shift types');
  return first;
}

/**
 * Apply overrides to the base rotation for one platoon. Trades given, leave and Kelly
 * days change the status of the base shift; trades taken and extra shifts add instances.
 * Overrides outside [from, to] are ignored.
 */
export function effectiveShifts(rotation: Rotation, platoon: Platoon, from: ISODate, to: ISODate, overrides: readonly Override[] = []): ShiftInstance[] {
  const base = baseShifts(rotation, platoon, from, to);
  const byDate = new Map<ISODate, ShiftInstance[]>();
  for (const s of base) {
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }
  const inRange = overrides.filter((o) => o.date >= from && o.date <= to);
  // Status changes first (they only touch base shifts), then additions.
  for (const o of inRange) {
    if (o.kind === 'trade' && o.direction === 'gave') {
      for (const s of byDate.get(o.date) ?? []) {
        if (o.shiftTypeId && s.shiftTypeId !== o.shiftTypeId) continue;
        s.status = 'traded-away';
        s.overrideId = o.id;
      }
    } else if (o.kind === 'leave') {
      for (const s of byDate.get(o.date) ?? []) {
        s.status = o.leaveType === 'vacation' ? 'vacation' : o.leaveType === 'sick' ? 'sick' : o.leaveType === 'kelly' ? 'kelly' : 'other-leave';
        s.overrideId = o.id;
      }
    }
  }
  for (const o of inRange) {
    if (o.kind === 'trade' && o.direction === 'took') {
      const type = defaultType(rotation, o.shiftTypeId);
      const list = byDate.get(o.date) ?? [];
      list.push(
        makeInstance({
          platoon,
          type,
          date: o.date,
          source: 'trade-in',
          status: 'scheduled',
          durationMinutes: o.hours !== undefined ? Math.round(o.hours * 60) : undefined,
          overrideId: o.id,
        }),
      );
      byDate.set(o.date, list);
    } else if (o.kind === 'extra') {
      const type = defaultType(rotation, o.shiftTypeId);
      const list = byDate.get(o.date) ?? [];
      list.push(
        makeInstance({
          platoon,
          type,
          date: o.date,
          source: 'extra',
          status: 'scheduled',
          startMinutes: o.startMinutes,
          durationMinutes: Math.round(o.hours * 60),
          overrideId: o.id,
        }),
      );
      byDate.set(o.date, list);
    }
  }
  const out: ShiftInstance[] = [];
  for (const list of byDate.values()) out.push(...list);
  out.sort((x, y) => (x.date === y.date ? x.startMinutes - y.startMinutes : x.date < y.date ? -1 : 1));
  return out;
}

/** Absolute minute number of a date and minutes after midnight (days since epoch times 1440). */
export function absoluteMinutes(date: ISODate, minutes: number): number {
  return dayNumber(date) * MINUTES_PER_DAY + minutes;
}

export function shiftStart(shift: ShiftInstance): number {
  return absoluteMinutes(shift.date, shift.startMinutes);
}

export function shiftEnd(shift: ShiftInstance): number {
  return absoluteMinutes(shift.endDate, shift.endMinutes);
}

/** Is the shift being worked at this civil date and time (start inclusive, end exclusive)? */
export function coversMoment(shift: ShiftInstance, date: ISODate, minutes: number): boolean {
  const t = absoluteMinutes(date, minutes);
  return shiftStart(shift) <= t && t < shiftEnd(shift);
}

/**
 * ON or OFF right now, plus the next working shift. `shifts` must include shifts that
 * started up to the longest shift length before `date` (use `effectiveShifts` from a few
 * days earlier) and enough future days to find the next one.
 */
export function statusAt(shifts: readonly ShiftInstance[], date: ISODate, minutes: number): StatusNow {
  const t = absoluteMinutes(date, minutes);
  const working = shifts.filter(isWorking);
  const current = working.find((s) => shiftStart(s) <= t && t < shiftEnd(s)) ?? null;
  const next = working.filter((s) => shiftStart(s) > t).sort((a, b) => shiftStart(a) - shiftStart(b))[0] ?? null;
  return {
    on: current !== null,
    current,
    next,
    daysUntilNext: next ? diffDays(date, next.date) : null,
  };
}

/** Working shifts whose start date is within [from, to]. */
export function workingShiftsBetween(shifts: readonly ShiftInstance[], from: ISODate, to: ISODate): ShiftInstance[] {
  return shifts.filter((s) => isWorking(s) && s.date >= from && s.date <= to);
}

/** Hours of working shifts starting within [from, to]. */
export function hoursBetween(shifts: readonly ShiftInstance[], from: ISODate, to: ISODate): number {
  return workingShiftsBetween(shifts, from, to).reduce((sum, s) => sum + s.durationMinutes / 60, 0);
}

/** How many consecutive days the platoon is off starting the day after `date` (0 when working tomorrow). */
export function offStreakAfter(rotation: Rotation, platoon: Platoon, date: ISODate, overrides: readonly Override[] = []): number {
  let n = 0;
  let d = addDays(date, 1);
  const horizon = Math.max(rotation.cycle.length * 2, 60);
  while (n < horizon) {
    const working = effectiveShifts(rotation, platoon, d, d, overrides).some(isWorking);
    if (working) break;
    n += 1;
    d = addDays(d, 1);
  }
  return n;
}
