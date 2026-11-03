/**
 * Turns a profile's working shifts into calendar events with real start and end instants
 * in the device's time zone, ready for expo-calendar. Pure, so it is unit tested.
 */
import type { Profile } from './model.ts';
import { effectiveShifts, isWorking, parseISO, shiftEndEpoch, shiftStartEpoch } from './rotation/index.ts';
import type { ISODate, Override, ShiftInstance } from './rotation/index.ts';

/** The device's own wall clock time as a Date (used when the JS engine cannot do named time zones). */
function localDate(date: ISODate, minutes: number): Date {
  const d = parseISO(date);
  return new Date(d.year, d.month - 1, d.day, Math.floor(minutes / 60), minutes % 60);
}

function instants(s: ShiftInstance, timeZone: string): { start: Date; end: Date } {
  try {
    return { start: new Date(shiftStartEpoch(s, timeZone)), end: new Date(shiftEndEpoch(s, timeZone)) };
  } catch {
    // Some engines lack Intl time zone support; the device's local time is the same zone anyway.
    return { start: localDate(s.date, s.startMinutes), end: localDate(s.endDate, s.endMinutes) };
  }
}

export interface ShiftEvent {
  key: string;
  title: string;
  start: Date;
  end: Date;
  notes: string;
}

export function shiftEvents(profile: Profile, overrides: readonly Override[], from: string, to: string, timeZone: string): ShiftEvent[] {
  return effectiveShifts(profile.rotation, profile.platoon, from, to, overrides)
    .filter(isWorking)
    .map((s) => {
      const type = profile.rotation.shiftTypes.find((t) => t.id === s.shiftTypeId);
      const what = s.source === 'extra' ? 'Extra shift' : s.source === 'trade-in' ? `${type?.label ?? 'Shift'} (trade)` : (type?.label ?? 'Shift');
      const who = profile.name && profile.name !== 'Me' ? `${profile.name}, ` : '';
      const { start, end } = instants(s, timeZone);
      return {
        key: s.id,
        title: `${who}${s.platoon} platoon: ${what}`,
        start,
        end,
        notes: 'Added by Rotawise. Exporting again replaces these events.',
      };
    });
}
