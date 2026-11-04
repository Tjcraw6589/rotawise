import { currentPayPeriod, effectiveShifts, estimateGross, nextPayday, payPeriods, rotationFromPreset } from '@/lib/rotation';
import type { Override, PaySettings } from '@/lib/rotation';

const biweekly: PaySettings = {
  kind: 'biweekly',
  anchorStart: '2027-01-03',
  paydayOffsetDays: 6,
  hourlyRate: 20,
  regularHoursPerPeriod: 106,
  otMultiplier: 1.5,
};

describe('pay periods', () => {
  it('biweekly periods run from the anchor, including across the year end', () => {
    expect(payPeriods(biweekly, '2027-01-01', '2027-01-31')).toEqual([
      { start: '2026-12-20', end: '2027-01-02', payday: '2027-01-08' },
      { start: '2027-01-03', end: '2027-01-16', payday: '2027-01-22' },
      { start: '2027-01-17', end: '2027-01-30', payday: '2027-02-05' },
      { start: '2027-01-31', end: '2027-02-13', payday: '2027-02-19' },
    ]);
    // 2027 has 26 biweekly paydays with this anchor.
    const paydays2027 = payPeriods(biweekly, '2026-12-01', '2028-01-31').filter((p) => p.payday.startsWith('2027'));
    expect(paydays2027).toHaveLength(26);
  });

  it('weekly, monthly and custom periods', () => {
    const weekly: PaySettings = { ...biweekly, kind: 'weekly' };
    expect(payPeriods(weekly, '2027-01-03', '2027-01-16').map((p) => p.start)).toEqual(['2027-01-03', '2027-01-10']);
    const monthly: PaySettings = { ...biweekly, kind: 'monthly', paydayOffsetDays: 0 };
    expect(payPeriods(monthly, '2028-02-10', '2028-03-01')).toEqual([
      { start: '2028-02-01', end: '2028-02-29', payday: '2028-02-29' },
      { start: '2028-03-01', end: '2028-03-31', payday: '2028-03-31' },
    ]);
    const work28: PaySettings = { ...biweekly, kind: 'custom', customLengthDays: 28 };
    const p = payPeriods(work28, '2027-01-03', '2027-03-01');
    expect(p.map((x) => x.start)).toEqual(['2027-01-03', '2027-01-31', '2027-02-28']);
  });

  it('semimonthly splits on the 16th and handles February in leap years', () => {
    const semi: PaySettings = { ...biweekly, kind: 'semimonthly', paydayOffsetDays: 0 };
    expect(payPeriods(semi, '2028-02-01', '2028-02-29').map((p) => [p.start, p.end])).toEqual([
      ['2028-02-01', '2028-02-15'],
      ['2028-02-16', '2028-02-29'],
    ]);
    expect(payPeriods(semi, '2027-02-20', '2027-02-20').map((p) => p.end)).toEqual(['2027-02-28']);
    expect(payPeriods(semi, '2027-12-20', '2028-01-05').map((p) => p.start)).toEqual(['2027-12-16', '2028-01-01']);
  });

  it('finds the current period and the next payday', () => {
    expect(currentPayPeriod(biweekly, '2027-01-16')).toEqual({ start: '2027-01-03', end: '2027-01-16', payday: '2027-01-22' });
    expect(nextPayday(biweekly, '2027-01-20')).toBe('2027-01-22');
    expect(nextPayday(biweekly, '2027-01-22')).toBe('2027-01-22');
    // Paydays near the year end fall on Dec 24 2027 and Jan 7 2028.
    expect(nextPayday(biweekly, '2027-12-25')).toBe('2028-01-07');
    expect(nextPayday(biweekly, '2027-12-20')).toBe('2027-12-24');
  });
});

describe('estimated gross pay', () => {
  const r = rotationFromPreset('24-48', '2027-01-01', null);
  const period = { start: '2027-01-03', end: '2027-01-16', payday: '2027-01-22' };

  it('pays straight time up to the threshold and overtime above it', () => {
    // A works Jan 4, 7, 10, 13, 16 in this period: 120 hours.
    const shifts = effectiveShifts(r, 'A', period.start, period.end);
    expect(estimateGross(shifts, period, biweekly)).toEqual({
      scheduledHours: 120,
      leaveHours: 0,
      extraHours: 0,
      regularHours: 106,
      overtimeHours: 14,
      regularPay: 2120,
      overtimePay: 420,
      gross: 2540,
    });
  });

  it('adds logged overtime at the multiplier and still pays a shift someone works for you', () => {
    const o: Override[] = [
      { id: 'x', kind: 'extra', date: '2027-01-05', category: 'overtime', hours: 12 },
      { id: 't', kind: 'trade', date: '2027-01-07', direction: 'gave', counterpart: 'Smith', settled: false },
    ];
    const shifts = effectiveShifts(r, 'A', period.start, period.end, o);
    const g = estimateGross(shifts, period, biweekly);
    expect(g.scheduledHours).toBe(120);
    expect(g.extraHours).toBe(12);
    expect(g.regularHours).toBe(106);
    expect(g.overtimeHours).toBe(14 + 12);
    expect(g.gross).toBe(106 * 20 + 26 * 30);
  });

  it('pays vacation at straight time, not a shift you cover, and not a Kelly day', () => {
    const o: Override[] = [
      { id: 'v', kind: 'leave', date: '2027-01-07', leaveType: 'vacation' },
      { id: 'k', kind: 'leave', date: '2027-01-10', leaveType: 'kelly' },
      { id: 'in', kind: 'trade', date: '2027-01-05', direction: 'took', counterpart: 'Jones', settled: false },
    ];
    const g = estimateGross(effectiveShifts(r, 'A', period.start, period.end, o), period, biweekly);
    // Worked Jan 4, 13 and 16 (72 hours), 24 vacation hours, Kelly day unpaid, the covered shift unpaid.
    expect(g.scheduledHours).toBe(72);
    expect(g.leaveHours).toBe(24);
    expect(g.regularHours).toBe(96);
    expect(g.overtimeHours).toBe(0);
    expect(g.gross).toBe(96 * 20);
  });

  it('vacation does not push you into overtime', () => {
    // 120 hours on the rotation with one tour on vacation: 96 worked plus 24 paid leave, no overtime.
    const o: Override[] = [{ id: 'v', kind: 'leave', date: '2027-01-16', leaveType: 'vacation' }];
    const g = estimateGross(effectiveShifts(r, 'A', period.start, period.end, o), period, biweekly);
    expect(g.overtimeHours).toBe(0);
    expect(g.gross).toBe(120 * 20);
  });

  it('rounds to cents', () => {
    const odd: PaySettings = { ...biweekly, hourlyRate: 23.457, otMultiplier: 1.5 };
    const g = estimateGross(effectiveShifts(r, 'A', period.start, period.end), period, odd);
    expect(g.regularPay).toBe(2486.44);
    expect(g.overtimePay).toBe(492.6);
    expect(g.gross).toBe(2979.04);
  });
});
