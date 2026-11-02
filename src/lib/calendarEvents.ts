/**
 * Turns a profile's working shifts into calendar events with real start and end instants
 * in the device's time zone, ready for expo-calendar. Pure, so it is unit tested.
 */
import type { Profile } from './model.ts';
import { effectiveShifts, isWorking, shiftEndEpoch, shiftStartEpoch } from './rotation/index.ts';
import type { Override } from './rotation/index.ts';

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
      return {
        key: s.id,
        title: `${who}${s.platoon} platoon: ${what}`,
        start: new Date(shiftStartEpoch(s, timeZone)),
        end: new Date(shiftEndEpoch(s, timeZone)),
        notes: 'Added by Rotawise. Exporting again replaces these events.',
      };
    });
}
