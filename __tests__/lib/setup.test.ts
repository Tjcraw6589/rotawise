import { baseShiftOn, baseShifts, rotationFromPreset } from '@/lib/rotation';
import type { PresetId } from '@/lib/rotation';
import { defaultSetup, kellyChoices, platoonCountFor, rotationFromSetup, setupFromRotation, workedDateHelp } from '@/lib/setup';

import { ALL_PRESETS } from '../rotation/helpers';

describe('rotation setup', () => {
  it('the day you worked becomes your platoon\'s first cycle day', () => {
    for (const id of ALL_PRESETS) {
      for (const platoon of ['A', 'B', 'C', 'D'] as const) {
        const setup = { ...defaultSetup('2027-03-10'), presetId: id as PresetId, platoon, workedDate: '2027-03-10', startMinutes: 420 };
        if (['A', 'B', 'C', 'D'].indexOf(platoon) >= platoonCountFor(setup)) continue;
        const { rotation, platoon: p } = rotationFromSetup(setup);
        expect(p).toBe(platoon);
        const s = baseShiftOn(rotation, p, '2027-03-10');
        expect(s).not.toBeNull();
        expect(s!.ordinal).toBe(1);
      }
    }
  });

  it('a platoon the pattern does not have falls back to A', () => {
    const setup = { ...defaultSetup('2027-03-10'), presetId: '2-2-3' as PresetId, platoon: 'D' as const };
    expect(rotationFromSetup(setup).platoon).toBe('A');
  });

  it('shift start time moves day and night shifts together', () => {
    const { rotation } = rotationFromSetup({ ...defaultSetup('2027-03-10'), presetId: 'pitman', startMinutes: 6 * 60 });
    expect(rotation.shiftTypes.map((t) => t.startMinutes)).toEqual([6 * 60, 18 * 60]);
    const tour = rotationFromSetup({ ...defaultSetup('2027-03-10'), startMinutes: 8 * 60 }).rotation;
    expect(baseShiftOn(tour, 'A', '2027-03-10')!.endMinutes).toBe(8 * 60);
  });

  it('round trips through the edit form without moving a single shift or Kelly day', () => {
    for (const id of ALL_PRESETS) {
      const original = { ...defaultSetup('2026-02-01'), presetId: id as PresetId, platoon: 'B' as const, workedDate: '2026-02-01', kellyEnabled: true, kellyEvery: 7, kellyPhase: 3 };
      const a = rotationFromSetup(original);
      const back = setupFromRotation(a.rotation, a.platoon, '2027-06-15');
      expect(back.workedDate <= '2027-06-15').toBe(true);
      const b = rotationFromSetup(back);
      const sa = baseShifts(a.rotation, a.platoon, '2027-01-01', '2028-12-31');
      const sb = baseShifts(b.rotation, b.platoon, '2027-01-01', '2028-12-31');
      expect(sb.map((s) => `${s.date}:${s.status}:${s.shiftTypeId}`)).toEqual(sa.map((s) => `${s.date}:${s.status}:${s.shiftTypeId}`));
    }
  });

  it('custom patterns round trip too', () => {
    const setup = { ...defaultSetup('2027-01-05'), presetId: 'custom' as PresetId, customCycle: ['day12', 'day12', 'night12', null, null], customPlatoons: 2, platoon: 'B' as const };
    const a = rotationFromSetup(setup);
    expect(a.rotation.shiftTypes.map((t) => t.id).sort()).toEqual(['day12', 'night12']);
    const b = rotationFromSetup(setupFromRotation(a.rotation, a.platoon, '2027-09-01'));
    const key = (x: { date: string; shiftTypeId: string; status: string; endDate: string }) => `${x.date}:${x.shiftTypeId}:${x.status}:${x.endDate}`;
    expect(baseShifts(b.rotation, 'B', '2027-09-01', '2027-12-31').map(key)).toEqual(baseShifts(a.rotation, 'B', '2027-09-01', '2027-12-31').map(key));
  });

  it('an all off custom pattern still builds (nothing scheduled)', () => {
    const { rotation } = rotationFromSetup({ ...defaultSetup('2027-01-05'), presetId: 'custom', customCycle: [null, null], kellyEnabled: true });
    expect(baseShifts(rotation, 'A', '2027-01-01', '2027-02-01')).toEqual([]);
    expect(rotation.kelly).toBeNull();
  });

  it('picking the next Kelly day sets the phase so that day is the Kelly day', () => {
    const setup = { ...defaultSetup('2027-01-01'), presetId: '24-48' as PresetId, kellyEnabled: true, kellyEvery: 7 };
    const choices = kellyChoices(setup, '2027-01-10', 7);
    expect(choices).toHaveLength(7);
    for (const c of choices) {
      const { rotation, platoon } = rotationFromSetup({ ...setup, kellyPhase: c.phase });
      expect(baseShiftOn(rotation, platoon, c.date)!.status).toBe('kelly');
    }
  });

  it('has help text for every preset, without hyphens', () => {
    for (const id of [...ALL_PRESETS, 'custom'] as PresetId[]) expect(workedDateHelp(id)).not.toMatch(/-/);
  });

  it('keeps the preset default Kelly interval when reading a Kelly rotation', () => {
    const r = rotationFromPreset('kelly', '2027-01-01');
    expect(setupFromRotation(r, 'A', '2027-01-01')).toMatchObject({ kellyEnabled: true, kellyEvery: 7 });
  });
});
