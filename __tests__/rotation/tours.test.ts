import { baseShiftOn, effectiveShifts, markDays, monthTotals, rotationFromPreset, statusAt, summarizeDays, customRotation, TOUR_24, NIGHT_12, DAY_12 } from '@/lib/rotation';

const r = rotationFromPreset('24-48', '2027-03-01', null);

describe('24 hour tours are one shift spanning two dates', () => {
  it('a 7 AM tour ends 7 AM the next day', () => {
    const s = baseShiftOn(r, 'A', '2027-03-01')!;
    expect(s.date).toBe('2027-03-01');
    expect(s.startMinutes).toBe(420);
    expect(s.durationMinutes).toBe(1440);
    expect(s.endDate).toBe('2027-03-02');
    expect(s.endMinutes).toBe(420);
  });

  it('the second date is marked as a continuation, not a second shift', () => {
    const shifts = effectiveShifts(r, 'A', '2027-02-27', '2027-03-08');
    const marks = markDays(shifts, '2027-03-01', '2027-03-07');
    expect(marks.get('2027-03-01')!.starts).toHaveLength(1);
    expect(marks.get('2027-03-02')!.starts).toHaveLength(0);
    expect(marks.get('2027-03-02')!.continues).toHaveLength(1);
    expect(marks.get('2027-03-02')!.continues[0]!.date).toBe('2027-03-01');
    expect(marks.get('2027-03-03')!.continues).toHaveLength(0);
  });

  it('counts a month of tours once each, even the one that ends next month', () => {
    // A works Mar 1, 4, 7 ... 31: 11 tours. The Mar 31 tour ends Apr 1 and belongs to March.
    expect(monthTotals(r, 'A', 2027, 3)).toEqual({ shifts: 11, hours: 264 });
    // April starts with Apr 3.
    expect(monthTotals(r, 'A', 2027, 4)).toEqual({ shifts: 10, hours: 240 });
    // A 4 hour callback adds hours but is not another tour.
    expect(monthTotals(r, 'A', 2027, 4, [{ id: 'cb', kind: 'extra', date: '2027-04-02', category: 'callback', hours: 4 }])).toEqual({ shifts: 10, hours: 244 });
  });

  it('is ON through midnight and OFF at the 7 AM handover', () => {
    const shifts = effectiveShifts(r, 'A', '2027-02-26', '2027-03-20');
    expect(statusAt(shifts, '2027-03-01', 6 * 60).on).toBe(false);
    expect(statusAt(shifts, '2027-03-01', 7 * 60).on).toBe(true);
    expect(statusAt(shifts, '2027-03-01', 23 * 60 + 59).on).toBe(true);
    const lateNight = statusAt(shifts, '2027-03-02', 3 * 60);
    expect(lateNight.on).toBe(true);
    expect(lateNight.current!.date).toBe('2027-03-01');
    expect(statusAt(shifts, '2027-03-02', 6 * 60 + 59).on).toBe(true);
    const handover = statusAt(shifts, '2027-03-02', 7 * 60);
    expect(handover.on).toBe(false);
    expect(handover.next!.date).toBe('2027-03-04');
    expect(handover.daysUntilNext).toBe(2);
  });

  it('before the tour starts today, the next shift is today', () => {
    const shifts = effectiveShifts(r, 'A', '2027-02-26', '2027-03-20');
    const s = statusAt(shifts, '2027-03-04', 5 * 60);
    expect(s.on).toBe(false);
    expect(s.daysUntilNext).toBe(0);
  });

  it('a New Year tour starts in one year and ends in the next', () => {
    const ny = rotationFromPreset('24-48', '2027-12-31', null);
    const s = baseShiftOn(ny, 'A', '2027-12-31')!;
    expect(s.endDate).toBe('2028-01-01');
    const shifts = effectiveShifts(ny, 'A', '2027-12-29', '2028-01-10');
    expect(statusAt(shifts, '2028-01-01', 2 * 60).current!.date).toBe('2027-12-31');
    const marks = markDays(shifts, '2028-01-01', '2028-01-03');
    expect(marks.get('2028-01-01')!.continues).toHaveLength(1);
  });

  it('a leap day tour ends on March 1', () => {
    const leap = rotationFromPreset('24-48', '2028-02-29', null);
    const s = baseShiftOn(leap, 'A', '2028-02-29')!;
    expect(s.endDate).toBe('2028-03-01');
    const feb28 = rotationFromPreset('24-48', '2027-02-28', null);
    expect(baseShiftOn(feb28, 'A', '2027-02-28')!.endDate).toBe('2027-03-01');
  });

  it('48/96 back to back tours hand over to each other with no gap', () => {
    const r48 = rotationFromPreset('48-96', '2027-03-01', null);
    const shifts = effectiveShifts(r48, 'A', '2027-02-25', '2027-03-15');
    expect(statusAt(shifts, '2027-03-02', 7 * 60).on).toBe(true);
    expect(statusAt(shifts, '2027-03-02', 7 * 60).current!.date).toBe('2027-03-02');
    expect(statusAt(shifts, '2027-03-03', 6 * 60).on).toBe(true);
    expect(statusAt(shifts, '2027-03-03', 7 * 60).on).toBe(false);
    expect(statusAt(shifts, '2027-03-03', 7 * 60).daysUntilNext).toBe(4);
  });

  it('a tour that starts at midnight does not spill into the next date', () => {
    const midnight = { ...TOUR_24, id: 'mid24', startMinutes: 0 };
    const m = customRotation({ cycle: [midnight.id, null, null], shiftTypes: [midnight], platoonCount: 3, anchorDate: '2027-03-01' });
    const shifts = effectiveShifts(m, 'A', '2027-03-01', '2027-03-06');
    expect(shifts[0]!.endDate).toBe('2027-03-02');
    expect(shifts[0]!.endMinutes).toBe(0);
    const marks = markDays(shifts, '2027-03-01', '2027-03-03');
    expect(marks.get('2027-03-02')!.continues).toHaveLength(0);
    expect(statusAt(shifts, '2027-03-02', 0).on).toBe(false);
  });

  it('12 hour nights cross midnight too', () => {
    const p = rotationFromPreset('pitman', '2027-03-01', null);
    const night = baseShiftOn(p, 'C', '2027-03-01')!;
    expect(night.shiftTypeId).toBe(NIGHT_12.id);
    expect(night.endDate).toBe('2027-03-02');
    expect(night.endMinutes).toBe(420);
    const day = baseShiftOn(p, 'A', '2027-03-01')!;
    expect(day.shiftTypeId).toBe(DAY_12.id);
    expect(day.endDate).toBe('2027-03-01');
    const shifts = effectiveShifts(p, 'C', '2027-02-27', '2027-03-10');
    expect(statusAt(shifts, '2027-03-02', 3 * 60).on).toBe(true);
  });

  it('the 7 day summary shows the tour once and flags the morning it ends', () => {
    const days = summarizeDays(r, 'A', '2027-03-01', 7);
    expect(days.map((d) => d.code)).toEqual(['24', '', '', '24', '', '', '24']);
    expect(days.map((d) => d.endsToday)).toEqual([false, true, false, false, true, false, false]);
  });
});
