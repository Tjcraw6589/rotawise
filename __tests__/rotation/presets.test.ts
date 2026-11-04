import {
  PRESETS,
  addDays,
  baseShiftOn,
  baseShifts,
  customRotation,
  cycleIndexOn,
  eachDay,
  presetInfo,
  rotationFromPreset,
  DAY_12,
  NIGHT_12,
  TOUR_24,
} from '@/lib/rotation';
import type { Platoon, Rotation } from '@/lib/rotation';

import { ALL_PRESETS, plain, platoonsOf, utcDays } from './helpers';

const ANCHOR = '2027-01-01';

function workingOn(rotation: Rotation, date: string): { platoon: Platoon; kind: string }[] {
  const out: { platoon: Platoon; kind: string }[] = [];
  for (const p of platoonsOf(rotation)) {
    const s = baseShiftOn(rotation, p, date);
    if (s && s.status === 'scheduled') {
      const kind = rotation.shiftTypes.find((t) => t.id === s.shiftTypeId)?.kind ?? '?';
      out.push({ platoon: p, kind });
    }
  }
  return out;
}

describe('every preset', () => {
  it('has info for the picker and the landing site', () => {
    for (const id of ALL_PRESETS) {
      const info = presetInfo(id);
      expect(info.name.length).toBeGreaterThan(0);
      const r = plain(id, ANCHOR);
      expect(r.cycle.length).toBe(info.cycleLength);
      expect(r.platoonCount).toBe(info.platoonCount);
    }
    expect(PRESETS.map((p) => p.id)).toContain('custom');
  });

  it('gives every preset its own tagline, and only Pitman is called Panama', () => {
    const taglines = PRESETS.map((p) => p.tagline);
    expect(new Set(taglines).size).toBe(taglines.length);
    expect(PRESETS.filter((p) => p.description.includes('Panama')).map((p) => p.id)).toEqual(['pitman']);
  });

  it.each(ALL_PRESETS)('%s advances exactly one cycle day per calendar day through leap years (oracle check, 2024 to 2030)', (id) => {
    const r = plain(id, ANCHOR);
    const L = r.cycle.length;
    for (const date of eachDay('2024-01-01', '2030-12-31')) {
      for (const p of platoonsOf(r)) {
        const offset = (['A', 'B', 'C', 'D'].indexOf(p) * r.platoonOffsetDays) % L;
        const expected = (((utcDays(ANCHOR, date) - offset) % L) + L) % L;
        expect(cycleIndexOn(r, p, date)).toBe(expected);
      }
    }
  });

  it.each(ALL_PRESETS)('%s keeps the right platoon on duty each side of a leap day and New Year', (id) => {
    const r = plain(id, ANCHOR);
    for (const [a, b] of [
      ['2028-02-28', '2028-02-29'],
      ['2028-02-29', '2028-03-01'],
      ['2027-02-28', '2027-03-01'],
      ['2027-12-31', '2028-01-01'],
      ['2028-12-31', '2029-01-01'],
    ] as const) {
      for (const p of platoonsOf(r)) {
        expect(cycleIndexOn(r, p, b)).toBe((cycleIndexOn(r, p, a) + 1) % r.cycle.length);
      }
    }
  });

  it('24/48 rotates A, B, C day by day, including Feb 29 2028', () => {
    const r = plain('24-48', ANCHOR);
    const onDuty = (d: string) => workingOn(r, d).map((x) => x.platoon);
    expect(onDuty('2027-01-01')).toEqual(['A']);
    expect(onDuty('2027-01-02')).toEqual(['B']);
    expect(onDuty('2027-01-03')).toEqual(['C']);
    expect(onDuty('2027-01-04')).toEqual(['A']);
    // 2028-02-28 is 423 days after the anchor: 423 mod 3 = 0.
    expect(onDuty('2028-02-28')).toEqual(['A']);
    expect(onDuty('2028-02-29')).toEqual(['B']);
    expect(onDuty('2028-03-01')).toEqual(['C']);
    // Before the anchor date the pattern runs backwards correctly.
    expect(onDuty('2026-12-31')).toEqual(['C']);
    expect(onDuty('2026-12-29')).toEqual(['A']);
  });

  it('48/96 gives each platoon two tours in a row then four days off', () => {
    const r = plain('48-96', ANCHOR);
    const a = baseShifts(r, 'A', '2027-01-01', '2027-01-12').map((s) => s.date);
    expect(a).toEqual(['2027-01-01', '2027-01-02', '2027-01-07', '2027-01-08']);
    const b = baseShifts(r, 'B', '2027-01-01', '2027-01-12').map((s) => s.date);
    expect(b).toEqual(['2027-01-03', '2027-01-04', '2027-01-09', '2027-01-10']);
  });

  it('24/72 cycles four platoons', () => {
    const r = plain('24-72', ANCHOR);
    expect(eachDay('2027-01-01', '2027-01-08').map((d) => workingOn(r, d).map((x) => x.platoon).join(''))).toEqual(['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D']);
  });

  it('Kelly schedule is on, off, on, off, on, then four off', () => {
    const r = plain('kelly', ANCHOR);
    const a = baseShifts(r, 'A', '2027-01-01', '2027-01-18').map((s) => s.date);
    expect(a).toEqual(['2027-01-01', '2027-01-03', '2027-01-05', '2027-01-10', '2027-01-12', '2027-01-14']);
  });

  it('Pitman puts A and B on days, C and D on nights, 2 2 3 2 2 3', () => {
    const r = plain('pitman', ANCHOR);
    const a = baseShifts(r, 'A', '2027-01-01', '2027-01-14');
    expect(a.map((s) => s.date.slice(8))).toEqual(['01', '02', '05', '06', '07', '10', '11']);
    expect(a.every((s) => s.shiftTypeId === DAY_12.id)).toBe(true);
    const c = baseShifts(r, 'C', '2027-01-01', '2027-01-14');
    expect(c.map((s) => s.date)).toEqual(a.map((s) => s.date));
    expect(c.every((s) => s.shiftTypeId === NIGHT_12.id)).toBe(true);
    const b = baseShifts(r, 'B', '2027-01-01', '2027-01-14');
    expect(b.map((s) => s.date.slice(8))).toEqual(['03', '04', '08', '09', '12', '13', '14']);
  });

  it('DuPont runs 4 nights, 3 off, 3 days, 1 off, 3 nights, 3 off, 4 days, 7 off', () => {
    const r = plain('dupont', ANCHOR);
    const a = baseShifts(r, 'A', '2027-01-01', '2027-01-28');
    const code = eachDay('2027-01-01', '2027-01-28')
      .map((d) => {
        const s = a.find((x) => x.date === d);
        return s ? (s.shiftTypeId === NIGHT_12.id ? 'N' : 'D') : '.';
      })
      .join('');
    expect(code).toBe('NNNN...DDD.NNN...DDDD.......');
  });

  it('2 2 3 platoons mirror each other so every day is covered once', () => {
    const r = plain('2-2-3', ANCHOR);
    const a = eachDay('2027-01-01', '2027-01-14').map((d) => (baseShiftOn(r, 'A', d) ? 'A' : 'B'));
    expect(a.join('')).toBe('AABBAAABBAABBB');
  });

  it('4 on 4 off is four days, four off, four nights, four off', () => {
    const r = plain('4-on-4-off', ANCHOR);
    const code = eachDay('2027-01-01', '2027-01-16')
      .map((d) => {
        const s = baseShiftOn(r, 'A', d);
        return s ? (s.shiftTypeId === NIGHT_12.id ? 'N' : 'D') : '.';
      })
      .join('');
    expect(code).toBe('DDDD....NNNN....');
  });

  it('3 twelves is three 12 hour days a week', () => {
    const r = plain('3-twelves', ANCHOR);
    const shifts = baseShifts(r, 'A', '2027-01-01', '2027-12-31');
    // 365 days = 52 weeks + 1 day; the extra day is cycle day 0, a work day.
    expect(shifts).toHaveLength(52 * 3 + 1);
    expect(shifts.every((s) => s.durationMinutes === 720)).toBe(true);
  });

  it.each(ALL_PRESETS)('%s covers each shift kind with exactly one platoon every day for 7 years', (id) => {
    const r = plain(id, ANCHOR);
    const kinds = [...new Set(r.shiftTypes.map((t) => t.kind))];
    for (const date of eachDay('2024-01-01', '2030-12-31')) {
      const on = workingOn(r, date);
      for (const kind of kinds) {
        const count = on.filter((x) => x.kind === kind).length;
        if (id === '3-twelves') {
          // Two platoons cover six days; the seventh cycle day is open.
          const open = cycleIndexOn(r, 'A', date) === 6;
          expect(count).toBe(open ? 0 : 1);
        } else {
          expect(count).toBe(1);
        }
      }
    }
  });

  it.each(ALL_PRESETS)('%s averages the advertised hours per week over 7 years', (id) => {
    const r = plain(id, ANCHOR);
    const info = presetInfo(id);
    const from = '2024-01-01';
    const days = 7 * 364; // whole weeks, and a multiple of every cycle length (3, 4, 6, 7, 9, 14, 16, 28)
    const to = addDays(from, days - 1);
    // 2548 days divides by every cycle length except 3 (2548/3 is not whole), 6 and 9, so check closely.
    const hours = baseShifts(r, 'A', from, to).reduce((h, s) => h + s.durationMinutes / 60, 0);
    expect(hours / (days / 7)).toBeCloseTo(info.hoursPerWeekAverage, 0);
  });
});

describe('custom pattern builder', () => {
  it('accepts any sequence of shift types and days off, with any start date', () => {
    const r = customRotation({
      cycle: [DAY_12.id, DAY_12.id, NIGHT_12.id, NIGHT_12.id, null, null, null, null],
      shiftTypes: [DAY_12, NIGHT_12],
      platoonCount: 4,
      anchorDate: '2027-06-15',
    });
    expect(r.platoonOffsetDays).toBe(2);
    const a = baseShifts(r, 'A', '2027-06-15', '2027-06-22');
    expect(a.map((s) => `${s.date.slice(8)}${s.shiftTypeId === DAY_12.id ? 'D' : 'N'}`)).toEqual(['15D', '16D', '17N', '18N']);
    const night = a[2]!;
    expect(night.endDate).toBe('2027-06-18');
    expect(night.endMinutes).toBe(7 * 60);
    // Four platoons offset by two days cover every day and night slot.
    for (const d of eachDay('2027-06-15', '2028-06-15')) {
      const on = (['A', 'B', 'C', 'D'] as const).map((p) => baseShiftOn(r, p, d)).filter((s) => s !== null);
      expect(on.filter((s) => s.shiftTypeId === DAY_12.id)).toHaveLength(1);
      expect(on.filter((s) => s.shiftTypeId === NIGHT_12.id)).toHaveLength(1);
    }
  });

  it('supports a single platoon with an odd cycle and a custom shift type', () => {
    const swing = { id: 'swing10', label: '10 hour swing', short: 'S', kind: 'custom' as const, startMinutes: 15 * 60, durationMinutes: 600 };
    const r = customRotation({ cycle: [swing.id, swing.id, swing.id, swing.id, null, null, null, null, null], shiftTypes: [swing], platoonCount: 1, anchorDate: '2027-02-27' });
    const shifts = baseShifts(r, 'A', '2027-02-27', '2027-03-10');
    expect(shifts.map((s) => s.date)).toEqual(['2027-02-27', '2027-02-28', '2027-03-01', '2027-03-02', '2027-03-08', '2027-03-09', '2027-03-10']);
    expect(shifts[0]!.endDate).toBe('2027-02-28'); // 3 PM + 10 h = 1 AM next day
    expect(shifts[0]!.endMinutes).toBe(60);
  });

  it('rejects patterns that cannot work', () => {
    expect(() => customRotation({ cycle: [], shiftTypes: [TOUR_24], platoonCount: 3, anchorDate: ANCHOR })).toThrow();
    expect(() => customRotation({ cycle: [TOUR_24.id], shiftTypes: [TOUR_24], platoonCount: 5, anchorDate: ANCHOR })).toThrow();
    const broken = customRotation({ cycle: ['nope'], shiftTypes: [TOUR_24], platoonCount: 1, anchorDate: ANCHOR });
    expect(() => baseShiftOn(broken, 'A', ANCHOR)).toThrow();
  });

  it('a preset can be rebuilt with any start date', () => {
    const r = rotationFromPreset('24-48', '2031-07-04', null);
    expect(baseShiftOn(r, 'A', '2031-07-04')).not.toBeNull();
    expect(baseShiftOn(r, 'A', '2031-07-05')).toBeNull();
  });
});
