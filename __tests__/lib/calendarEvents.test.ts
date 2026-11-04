import { shiftEvents } from '@/lib/calendarEvents';
import { defaultProfile, shiftWord } from '@/lib/model';
import { rotationFromPreset } from '@/lib/rotation';
import { formatHours, formatMoney, formatNumber, parseAmount } from '@/lib/format';

describe('calendar export events', () => {
  const profile = { ...defaultProfile('2027-03-01'), rotation: rotationFromPreset('24-48', '2027-03-01', null), platoon: 'A' as const };

  it('creates one event per working shift with real instants in the zone', () => {
    const events = shiftEvents(profile, [], '2027-03-01', '2027-03-31', 'America/New_York');
    expect(events).toHaveLength(11);
    expect(events[0]!.title).toBe('A platoon: 24 hour tour');
    expect(events[0]!.start.toISOString()).toBe('2027-03-01T12:00:00.000Z');
    expect(events[0]!.end.toISOString()).toBe('2027-03-02T12:00:00.000Z');
    // Mar 13 tour crosses the spring forward night: 7 AM EST to 7 AM EDT is 23 real hours.
    const dst = events.find((e) => e.key.includes('2027-03-13'))!;
    expect(dst.end.getTime() - dst.start.getTime()).toBe(23 * 3600 * 1000);
  });

  it('leaves out traded away and leave days, and adds trades taken and overtime', () => {
    const events = shiftEvents(
      { ...profile, name: 'Alex' },
      [
        { id: 'g', kind: 'trade', date: '2027-03-04', direction: 'gave', counterpart: 'X', settled: false },
        { id: 't', kind: 'trade', date: '2027-03-05', direction: 'took', counterpart: 'Y', settled: false },
        { id: 'o', kind: 'extra', date: '2027-03-06', category: 'overtime', hours: 4, startMinutes: 600 },
      ],
      '2027-03-01',
      '2027-03-07',
      'UTC',
    );
    expect(events.map((e) => e.title)).toEqual(['Alex, A platoon: 24 hour tour', 'Alex, A platoon: 24 hour tour (trade)', 'Alex, A platoon: Extra shift', 'Alex, A platoon: 24 hour tour']);
    expect(events.every((e) => !/-/.test(e.title))).toBe(true);
  });
});

describe('formatting', () => {
  it('formats money and hours and parses typed amounts', () => {
    expect(formatMoney(2540, 'USD', 'en-US')).toBe('$2,540.00');
    expect(formatHours(1)).toBe('1 hour');
    expect(formatHours(24)).toBe('24 hours');
    expect(formatHours(7.5)).toBe('7.5 hours');
    expect(formatHours(2184)).toBe('2,184 hours');
    expect(formatNumber(12345.678)).toBe('12,345.68');
    expect(shiftWord(rotationFromPreset('24-72', '2027-01-01'), 7)).toBe('tours');
    expect(shiftWord(rotationFromPreset('kelly', '2027-01-01'), 1)).toBe('tour');
    expect(shiftWord(rotationFromPreset('pitman', '2027-01-01'), 13)).toBe('shifts');
    expect(parseAmount('23.50')).toBe(23.5);
    expect(parseAmount('23,50')).toBe(23.5);
    expect(parseAmount('$41')).toBe(41);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('calendar export without Intl time zones', () => {
  it('falls back to the device clock instead of crashing', () => {
    const real = Intl.DateTimeFormat;
    const profile = { ...defaultProfile('2027-03-01'), rotation: rotationFromPreset('24-48', '2027-03-01', null), platoon: 'A' as const };
    try {
      (Intl as { DateTimeFormat: unknown }).DateTimeFormat = function broken() {
        throw new RangeError('timeZone not supported');
      };
      const events = shiftEvents(profile, [], '2027-03-01', '2027-03-04', 'Pacific/Chatham');
      expect(events).toHaveLength(2);
      expect(events[0]!.start.getHours()).toBe(7);
      expect(events[0]!.end.getDate()).toBe(2);
    } finally {
      (Intl as { DateTimeFormat: unknown }).DateTimeFormat = real;
    }
  });
});
