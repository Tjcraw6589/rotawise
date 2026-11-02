import { formatMinutes, monthGrid, platoonsOn, rotationFromPreset, todayCard } from '@/lib/rotation';
import type { Override } from '@/lib/rotation';

describe('month grid', () => {
  it('lays out January 2027 starting Sunday or Monday', () => {
    const sun = monthGrid(2027, 1, 0);
    expect(sun[0]).toEqual([null, null, null, null, null, '2027-01-01', '2027-01-02']);
    expect(sun.flat().filter(Boolean)).toHaveLength(31);
    const mon = monthGrid(2027, 1, 1);
    expect(mon[0]!.slice(0, 5)).toEqual([null, null, null, null, '2027-01-01']);
  });

  it('has 29 days in February 2028 and 28 in 2027', () => {
    expect(monthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
    // Feb 2027 starts on a Monday: 4 rows when weeks start Monday, 5 when they start Sunday.
    expect(monthGrid(2027, 2, 1)).toHaveLength(4);
    expect(monthGrid(2027, 2, 0)).toHaveLength(5);
  });
});

describe('platoons on duty', () => {
  it('shows exactly one platoon per day on 24/48', () => {
    const r = rotationFromPreset('24-48', '2027-01-01', null);
    expect(platoonsOn(r, '2027-01-01')).toEqual(['A']);
    expect(platoonsOn(r, '2027-01-03')).toEqual(['C']);
  });
  it('shows a day and a night platoon on Pitman', () => {
    const r = rotationFromPreset('pitman', '2027-01-01', null);
    expect(platoonsOn(r, '2027-01-01')).toEqual(['A', 'C']);
    expect(platoonsOn(r, '2027-01-03')).toEqual(['B', 'D']);
  });
});

describe('today card copy', () => {
  const r = rotationFromPreset('24-48', '2027-01-01', null);
  const t = (m: number) => formatMinutes(m);

  it('ON during a tour, with when it ends', () => {
    const c = todayCard(r, 'A', '2027-01-01', 9 * 60, [], t);
    expect(c.headline).toBe("You're ON");
    expect(c.detail).toBe('24 hour tour until 7 AM tomorrow');
    const morning = todayCard(r, 'A', '2027-01-02', 5 * 60, [], t);
    expect(morning.detail).toBe('24 hour tour until 7 AM today');
  });

  it('OFF with days until the next shift', () => {
    expect(todayCard(r, 'A', '2027-01-02', 9 * 60, [], t).detail).toBe('Next shift in 2 days');
    expect(todayCard(r, 'A', '2027-01-03', 9 * 60, [], t).detail).toBe('Next shift tomorrow');
    expect(todayCard(r, 'A', '2027-01-04', 5 * 60, [], t).detail).toBe('Next shift today at 7 AM');
  });

  it('follows trades', () => {
    const o: Override[] = [{ id: 't', kind: 'trade', date: '2027-01-04', direction: 'gave', counterpart: 'Smith', settled: false }];
    const c = todayCard(r, 'A', '2027-01-02', 9 * 60, o, t);
    expect(c.detail).toBe('Next shift in 5 days');
  });

  it('never uses hyphens in user facing copy', () => {
    for (const date of ['2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04']) {
      for (const m of [0, 300, 420, 600, 1200]) {
        const c = todayCard(r, 'A', date, m, [], t);
        expect(c.headline + c.detail).not.toMatch(/-/);
      }
    }
  });
});
