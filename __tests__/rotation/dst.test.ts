import { baseShiftOn, cycleIndexOn, eachDay, elapsedMinutes, localISO, rotationFromPreset, zonedToEpoch, effectiveShifts, statusAt } from '@/lib/rotation';

import { ALL_PRESETS, plain, platoonsOf } from './helpers';

// 2027 clock changes:
//   United States: spring forward Sun Mar 14, fall back Sun Nov 7 (2 AM local)
//   United Kingdom: Sun Mar 28, Sun Oct 31 (1 AM UTC)
//   Sydney: fall back Sun Apr 4, spring forward Sun Oct 3 (southern hemisphere)

describe('clock changes never move the rotation', () => {
  const transitions = ['2027-03-14', '2027-11-07', '2027-03-28', '2027-10-31', '2027-04-04', '2027-10-03', '2028-03-12', '2028-11-05'];

  it.each(ALL_PRESETS)('%s advances one cycle day across every 2027 and 2028 clock change', (id) => {
    const r = plain(id, '2027-01-01');
    for (const t of transitions) {
      const days = eachDay(t.slice(0, 8) + '01', t.slice(0, 8) + '28');
      for (let i = 1; i < days.length; i++) {
        for (const p of platoonsOf(r)) {
          expect(cycleIndexOn(r, p, days[i]!)).toBe((cycleIndexOn(r, p, days[i - 1]!) + 1) % r.cycle.length);
        }
      }
    }
  });

  it('the scheduled tour is still 24 wall clock hours on a clock change night', () => {
    const r = rotationFromPreset('24-48', '2027-03-13', null);
    const s = baseShiftOn(r, 'A', '2027-03-13')!;
    expect(s.durationMinutes).toBe(1440);
    expect(s.endDate).toBe('2027-03-14');
    expect(s.endMinutes).toBe(420);
  });

  it('ON or OFF is decided by wall clock time on a clock change night', () => {
    const r = rotationFromPreset('24-48', '2027-03-13', null);
    const shifts = effectiveShifts(r, 'A', '2027-03-10', '2027-03-20');
    // 3:30 AM on the spring forward morning is still inside the tour.
    expect(statusAt(shifts, '2027-03-14', 3 * 60 + 30).on).toBe(true);
    expect(statusAt(shifts, '2027-03-14', 7 * 60).on).toBe(false);
  });

  it('reads today correctly in zones with clock changes', () => {
    const saved = process.env.TZ;
    try {
      for (const zone of ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Australia/Sydney', 'UTC']) {
        process.env.TZ = zone;
        for (const t of transitions) {
          const [y, m, d] = t.split('-').map(Number) as [number, number, number];
          for (const hour of [0, 1, 3, 12, 23]) {
            const local = new Date(y, m - 1, d, hour, 30);
            expect(localISO(local)).toBe(t);
          }
        }
      }
    } finally {
      if (saved === undefined) delete process.env.TZ;
      else process.env.TZ = saved;
    }
  });
});

describe('real elapsed time across clock changes (for calendar export)', () => {
  const tour = (date: string) => baseShiftOn(rotationFromPreset('24-48', date, null), 'A', date)!;

  it('a normal tour is 24 real hours', () => {
    expect(elapsedMinutes(tour('2027-06-01'), 'America/New_York')).toBe(1440);
    expect(elapsedMinutes(tour('2027-03-14'), 'Asia/Kolkata')).toBe(1440);
  });

  it('spring forward makes the tour 23 real hours, fall back 25', () => {
    expect(elapsedMinutes(tour('2027-03-13'), 'America/New_York')).toBe(1380);
    expect(elapsedMinutes(tour('2027-11-06'), 'America/New_York')).toBe(1500);
    expect(elapsedMinutes(tour('2027-03-13'), 'America/Chicago')).toBe(1380);
    expect(elapsedMinutes(tour('2027-03-27'), 'Europe/London')).toBe(1380);
    expect(elapsedMinutes(tour('2027-10-30'), 'Europe/London')).toBe(1500);
    expect(elapsedMinutes(tour('2027-04-03'), 'Australia/Sydney')).toBe(1500);
    expect(elapsedMinutes(tour('2027-10-02'), 'Australia/Sydney')).toBe(1380);
    // Arizona has no daylight time.
    expect(elapsedMinutes(tour('2027-03-13'), 'America/Phoenix')).toBe(1440);
  });

  it('a 12 hour night across spring forward is 11 real hours', () => {
    const night = baseShiftOn(rotationFromPreset('pitman', '2027-03-13', null), 'C', '2027-03-13')!;
    expect(elapsedMinutes(night, 'America/New_York')).toBe(660);
    const fallBack = baseShiftOn(rotationFromPreset('pitman', '2027-11-06', null), 'C', '2027-11-06')!;
    expect(elapsedMinutes(fallBack, 'America/New_York')).toBe(780);
  });

  it('maps a missing time forward and a repeated time to its first occurrence', () => {
    // 2:30 AM Mar 14 2027 does not exist in New York; it becomes 3:30 AM EDT (07:30 UTC).
    expect(zonedToEpoch('2027-03-14', 150, 'America/New_York')).toBe(Date.UTC(2027, 2, 14, 7, 30));
    // 1:30 AM Nov 7 2027 happens twice; the first is EDT (05:30 UTC).
    expect(zonedToEpoch('2027-11-07', 90, 'America/New_York')).toBe(Date.UTC(2027, 10, 7, 5, 30));
    expect(zonedToEpoch('2027-07-04', 420, 'America/New_York')).toBe(Date.UTC(2027, 6, 4, 11, 0));
    expect(zonedToEpoch('2027-01-04', 420, 'Australia/Sydney')).toBe(Date.UTC(2027, 0, 3, 20, 0));
  });
});
