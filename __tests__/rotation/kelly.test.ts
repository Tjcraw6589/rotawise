import { baseShifts, effectiveShifts, isKellyDay, rotationFromPreset, shiftOrdinalOn, statusAt, summarizeDays, diffDays } from '@/lib/rotation';
import type { Rotation } from '@/lib/rotation';

function kellyDates(r: Rotation, from: string, to: string): string[] {
  return baseShifts(r, 'A', from, to)
    .filter((s) => s.status === 'kelly')
    .map((s) => s.date);
}

describe('Kelly days', () => {
  it('the Kelly preset makes every 7th tour a Kelly day by default', () => {
    const r = rotationFromPreset('kelly', '2027-01-01');
    expect(r.kelly).toEqual({ everyNthShift: 7 });
    // A works Jan 1, 3, 5, 10, 12, 14, 19 ...; the 7th tour is Jan 19, the 14th is Feb 8.
    expect(kellyDates(r, '2027-01-01', '2027-02-10')).toEqual(['2027-01-19', '2027-02-08']);
  });

  it.each([
    [7, 21],
    [9, 27],
    [10, 30],
    [13, 39],
  ])('on 24/48, a Kelly day every %i tours lands every %i days all year and across the year end', (n, spacing) => {
    const r = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: n });
    const dates = kellyDates(r, '2026-06-01', '2028-06-30');
    expect(dates.length).toBeGreaterThan(10);
    for (let i = 1; i < dates.length; i++) expect(diffDays(dates[i - 1]!, dates[i]!)).toBe(spacing);
    // Shifts that are not Kelly days stay scheduled.
    const all = baseShifts(r, 'A', '2027-01-01', '2027-12-31');
    const kelly = all.filter((s) => s.status === 'kelly').length;
    expect(kelly).toBe(Math.floor(all.length / n));
  });

  it('the phase lines a Kelly group up with its own day', () => {
    const r0 = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7 });
    const r3 = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7, phase: 3 });
    expect(kellyDates(r0, '2027-01-01', '2027-02-15')).toEqual(['2027-01-19', '2027-02-09']);
    // Phase 3: tours 3, 10, 17 -> Jan 7, Jan 28, Feb 18.
    expect(kellyDates(r3, '2027-01-01', '2027-02-20')).toEqual(['2027-01-07', '2027-01-28', '2027-02-18']);
  });

  it('ordinals count up across the anchor, year ends and leap days', () => {
    const r = rotationFromPreset('24-48', '2027-01-01', null);
    expect(shiftOrdinalOn(r, 'A', '2027-01-01')).toBe(1);
    expect(shiftOrdinalOn(r, 'A', '2026-12-29')).toBe(0);
    expect(shiftOrdinalOn(r, 'A', '2026-12-26')).toBe(-1);
    expect(shiftOrdinalOn(r, 'A', '2027-01-02')).toBeNull();
    const shifts = baseShifts(r, 'A', '2026-11-01', '2028-03-31');
    for (let i = 1; i < shifts.length; i++) expect(shifts[i]!.ordinal).toBe(shifts[i - 1]!.ordinal! + 1);
  });

  it('each platoon counts its own tours', () => {
    const r = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7 });
    // B's first tour is Jan 2, its 7th is Jan 20.
    const b = baseShifts(r, 'B', '2027-01-01', '2027-01-31').filter((s) => s.status === 'kelly');
    expect(b.map((s) => s.date)).toEqual(['2027-01-20']);
  });

  it('an interval below 2 means no Kelly days', () => {
    for (const n of [0, 1, -3]) {
      const r = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: n });
      expect(kellyDates(r, '2027-01-01', '2027-12-31')).toEqual([]);
    }
    expect(isKellyDay(rotationFromPreset('24-48', '2027-01-01', null), 7)).toBe(false);
  });

  it('a Kelly day is a day off: status OFF and a K in the calendar', () => {
    const r = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7 });
    const shifts = effectiveShifts(r, 'A', '2027-01-15', '2027-02-10');
    const onKelly = statusAt(shifts, '2027-01-19', 12 * 60);
    expect(onKelly.on).toBe(false);
    expect(onKelly.next!.date).toBe('2027-01-22');
    expect(onKelly.daysUntilNext).toBe(3);
    const week = summarizeDays(r, 'A', '2027-01-16', 7);
    expect(week.map((d) => d.code)).toEqual(['24', '', '', 'K', '', '', '24']);
    expect(week[3]!.on).toBe(false);
    // The day after a Kelly day is not "ending a tour".
    expect(week[4]!.endsToday).toBe(false);
  });
});
