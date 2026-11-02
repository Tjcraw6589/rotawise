import { effectiveShifts, extraHoursBetween, hoursBetween, leaveBalances, rotationFromPreset, statusAt, summarizeDays, tradeBalances, DAY_12, offStreakAfter } from '@/lib/rotation';
import type { Override } from '@/lib/rotation';

// A works Jan 1, 4, 7, 10 ... 2027. B works Jan 2, 5, 8 ...
const r = rotationFromPreset('24-48', '2027-01-01', null);

describe('trades override the base rotation', () => {
  const gave: Override = { id: 't1', kind: 'trade', date: '2027-01-04', direction: 'gave', counterpart: 'Smith', settled: false };
  const took: Override = { id: 't2', kind: 'trade', date: '2027-01-05', direction: 'took', counterpart: 'Jones', settled: false };

  it('giving a shift away takes you off that day', () => {
    const shifts = effectiveShifts(r, 'A', '2027-01-01', '2027-01-20', [gave]);
    const jan4 = shifts.find((s) => s.date === '2027-01-04')!;
    expect(jan4.status).toBe('traded-away');
    expect(jan4.overrideId).toBe('t1');
    const s = statusAt(shifts, '2027-01-04', 10 * 60);
    expect(s.on).toBe(false);
    expect(s.next!.date).toBe('2027-01-07');
  });

  it('taking a shift puts you on a day you were off', () => {
    const shifts = effectiveShifts(r, 'A', '2027-01-01', '2027-01-20', [took]);
    const jan5 = shifts.filter((s) => s.date === '2027-01-05');
    expect(jan5).toHaveLength(1);
    expect(jan5[0]!.source).toBe('trade-in');
    expect(statusAt(shifts, '2027-01-05', 10 * 60).on).toBe(true);
    expect(statusAt(shifts, '2027-01-06', 6 * 60).on).toBe(true); // still a 24 hour tour
  });

  it('a swap moves the shift and the calendar codes follow', () => {
    const days = summarizeDays(r, 'A', '2027-01-04', 4, [gave, took]);
    expect(days.map((d) => d.code)).toEqual(['T', 'T+', '', '24']);
    expect(days.map((d) => d.on)).toEqual([false, true, false, true]);
    expect(hoursBetween(effectiveShifts(r, 'A', '2027-01-01', '2027-01-31', [gave, took]), '2027-01-01', '2027-01-31')).toBe(
      hoursBetween(effectiveShifts(r, 'A', '2027-01-01', '2027-01-31'), '2027-01-01', '2027-01-31'),
    );
  });

  it('partial trades use the hours given', () => {
    const half: Override = { id: 't3', kind: 'trade', date: '2027-01-06', direction: 'took', counterpart: 'Lee', hours: 12, settled: false };
    const shifts = effectiveShifts(r, 'A', '2027-01-06', '2027-01-06', [half]);
    expect(shifts[0]!.durationMinutes).toBe(720);
    expect(shifts[0]!.endDate).toBe('2027-01-06');
  });

  it('only touches the matching shift type when one is named', () => {
    const p = rotationFromPreset('pitman', '2027-01-01', null);
    const wrongType: Override = { id: 't4', kind: 'trade', date: '2027-01-01', direction: 'gave', counterpart: 'X', shiftTypeId: 'night12', settled: false };
    const shifts = effectiveShifts(p, 'A', '2027-01-01', '2027-01-01', [wrongType]);
    expect(shifts[0]!.shiftTypeId).toBe(DAY_12.id);
    expect(shifts[0]!.status).toBe('scheduled');
  });

  it('giving away a day you are already off changes nothing', () => {
    const noop: Override = { id: 't5', kind: 'trade', date: '2027-01-02', direction: 'gave', counterpart: 'X', settled: false };
    expect(effectiveShifts(r, 'A', '2027-01-01', '2027-01-07', [noop])).toEqual(effectiveShifts(r, 'A', '2027-01-01', '2027-01-07'));
  });

  it('ignores overrides outside the range asked for', () => {
    const far: Override = { id: 't6', kind: 'trade', date: '2027-06-01', direction: 'took', counterpart: 'X', settled: false };
    expect(effectiveShifts(r, 'A', '2027-01-01', '2027-01-07', [far])).toEqual(effectiveShifts(r, 'A', '2027-01-01', '2027-01-07'));
  });

  it('a trade beats a Kelly day: taking a shift on your Kelly day puts you on', () => {
    const k = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7 });
    const work: Override = { id: 't7', kind: 'trade', date: '2027-01-19', direction: 'took', counterpart: 'Diaz', settled: false };
    const shifts = effectiveShifts(k, 'A', '2027-01-18', '2027-01-20', [work]);
    expect(statusAt(shifts, '2027-01-19', 12 * 60).on).toBe(true);
  });

  it('the ledger says who owes whom and drops settled trades', () => {
    const ledger: Override[] = [
      gave,
      took,
      { id: 't8', kind: 'trade', date: '2027-02-01', direction: 'gave', counterpart: 'Smith', hours: 12, settled: false },
      { id: 't9', kind: 'trade', date: '2027-02-02', direction: 'took', counterpart: 'Old', settled: true },
      { id: 't10', kind: 'trade', date: '2027-02-03', direction: 'took', counterpart: 'Jones', settled: false },
      { id: 't11', kind: 'trade', date: '2027-02-04', direction: 'gave', counterpart: 'Jones', settled: false },
    ];
    expect(tradeBalances(ledger, 24)).toEqual([
      { counterpart: 'Jones', hours: -24, open: 3 },
      { counterpart: 'Smith', hours: 36, open: 2 },
    ]);
  });
});

describe('leave and extra shifts', () => {
  it('vacation and sick days take you off and count against balances', () => {
    const leave: Override[] = [
      { id: 'l1', kind: 'leave', date: '2027-01-07', leaveType: 'vacation' },
      { id: 'l2', kind: 'leave', date: '2027-01-10', leaveType: 'sick', hours: 12 },
      { id: 'l3', kind: 'leave', date: '2027-01-13', leaveType: 'kelly' },
      { id: 'l4', kind: 'leave', date: '2026-12-29', leaveType: 'vacation' }, // last year
    ];
    const days = summarizeDays(r, 'A', '2027-01-07', 7, leave);
    expect(days.map((d) => d.code)).toEqual(['V', '', '', 'S', '', '', 'K']);
    expect(days.every((d) => !d.on)).toBe(true);
    expect(leaveBalances(leave, 2027, { vacationHours: 240, sickHours: 96, kellyDays: 17 }, 24)).toEqual({
      vacationUsed: 24,
      vacationLeft: 216,
      sickUsed: 12,
      sickLeft: 84,
      kellyUsed: 1,
      kellyLeft: 16,
    });
    expect(leaveBalances(leave, 2026, { vacationHours: 240, sickHours: 96, kellyDays: 17 }, 24).vacationUsed).toBe(24);
  });

  it('extra shifts and overtime add working time with their own hours', () => {
    const extra: Override[] = [
      { id: 'x1', kind: 'extra', date: '2027-01-02', category: 'overtime', hours: 12, startMinutes: 7 * 60 },
      { id: 'x2', kind: 'extra', date: '2027-01-02', category: 'callback', hours: 3, startMinutes: 20 * 60 },
    ];
    const shifts = effectiveShifts(r, 'A', '2027-01-01', '2027-01-03', extra);
    const jan2 = shifts.filter((s) => s.date === '2027-01-02');
    expect(jan2).toHaveLength(2);
    expect(new Set(jan2.map((s) => s.id)).size).toBe(2);
    expect(statusAt(shifts, '2027-01-02', 21 * 60).on).toBe(true);
    expect(extraHoursBetween(extra, '2027-01-01', '2027-01-31')).toEqual({ hours: 15, entries: 2 });
    expect(hoursBetween(shifts, '2027-01-02', '2027-01-02')).toBe(15);
  });

  it('the off streak counts days until you are back on', () => {
    expect(offStreakAfter(r, 'A', '2027-01-01')).toBe(2);
    const vac: Override[] = [{ id: 'v', kind: 'leave', date: '2027-01-04', leaveType: 'vacation' }];
    expect(offStreakAfter(r, 'A', '2027-01-01', vac)).toBe(5);
  });
});
