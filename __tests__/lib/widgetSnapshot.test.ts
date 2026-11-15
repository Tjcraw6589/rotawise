/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { defaultProfile } from '@/lib/model';
import type { Override } from '@/lib/rotation';
import { rotationFromPreset } from '@/lib/rotation';
import { SNAPSHOT_DAYS, SNAPSHOT_VERSION, buildSnapshot, widgetColors, widgetView } from '@/lib/widgetSnapshot';
import type { WidgetSnapshot } from '@/lib/widgetSnapshot';

const profile = { ...defaultProfile('2027-01-01'), rotation: rotationFromPreset('24-48', '2027-01-01', null), platoon: 'A' as const };

function snap(overrides: Override[] = [], today = '2027-01-01') {
  return buildSnapshot({ profile, overrides, today, hour12: true, background: 'system' });
}

describe('widget snapshot', () => {
  it('covers more than a year ahead so widgets roll over without the app', () => {
    const s = snap();
    expect(s.days).toHaveLength(SNAPSHOT_DAYS + 2);
    // Three days back, so a 72 hour extra shift that started then is still in the snapshot.
    expect(s.days[0]!.d).toBe('2026-12-29');
    expect(s.days[s.days.length - 1]!.d >= '2028-02-01').toBe(true);
    expect(s.platoon).toBe('A');
    expect(s.rotation).toBe('24/48');
    expect(JSON.stringify(s).length).toBeLessThan(40_000);
  });

  it('stores each day with its code and times', () => {
    const s = snap([{ id: 't', kind: 'trade', date: '2027-01-04', direction: 'gave', counterpart: 'Smith', settled: false }]);
    const byDate = Object.fromEntries(s.days.map((d) => [d.d, d]));
    expect(byDate['2027-01-01']).toEqual({ d: '2027-01-01', on: true, c: '24', s: 420, m: 1440, l: '24 hour tour' });
    expect(byDate['2027-01-02']).toMatchObject({ on: false, c: '', l: 'Off' });
    expect(byDate['2027-01-04']).toMatchObject({ on: false, c: 'T', l: 'Traded away' });
  });
});

describe('widget view (what the widgets show)', () => {
  const s = snap();

  it('ON during a tour, including after midnight', () => {
    expect(widgetView(s, '2027-01-01', 600)).toMatchObject({ ok: true, on: true, status: 'ON', detail: '24 hour tour until 7 AM tomorrow', dateLabel: 'Fri, Jan 1' });
    expect(widgetView(s, '2027-01-02', 180)).toMatchObject({ on: true, detail: '24 hour tour until 7 AM today' });
  });

  it('OFF with the next shift', () => {
    expect(widgetView(s, '2027-01-02', 420)).toMatchObject({ on: false, status: 'OFF', detail: 'Next shift in 2 days' });
    expect(widgetView(s, '2027-01-03', 600)).toMatchObject({ detail: 'Next shift tomorrow' });
    expect(widgetView(s, '2027-01-04', 300)).toMatchObject({ detail: 'Next shift today at 7 AM' });
  });

  it('the week strip starts today and shows 7 days', () => {
    const v = widgetView(s, '2027-01-02', 600);
    expect(v.week.map((d) => [d.weekday, d.dayOfMonth, d.on])).toEqual([
      ['Sat', 2, false],
      ['Sun', 3, false],
      ['Mon', 4, true],
      ['Tue', 5, false],
      ['Wed', 6, false],
      ['Thu', 7, true],
      ['Fri', 8, false],
    ]);
    expect(v.week[0]!.isToday).toBe(true);
  });

  it('rolls over day by day for a whole year from one snapshot', () => {
    let previous = '';
    for (let i = 0; i < 365; i++) {
      const date = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10);
      const v = widgetView(s, date, 12 * 60);
      expect(v.ok).toBe(true);
      expect(v.dateLabel).not.toBe(previous);
      previous = v.dateLabel;
      expect(v.week).toHaveLength(7);
    }
  });

  it('asks you to open the app when the snapshot has run out or is missing', () => {
    expect(widgetView(null, '2027-01-01', 0)).toMatchObject({ ok: false, status: 'Open Rotawise' });
    expect(widgetView(s, '2029-01-01', 0).ok).toBe(false);
  });

  it('uses 24 hour time when the user prefers it', () => {
    const s24 = buildSnapshot({ profile, overrides: [], today: '2027-01-01', hour12: false, background: 'dark' });
    expect(widgetView(s24, '2027-01-01', 600).detail).toBe('24 hour tour until 07:00 tomorrow');
  });

  it('never shows a hyphen', () => {
    for (let m = 0; m < 1440 * 4; m += 90) {
      const day = new Date(Date.UTC(2027, 0, 1 + Math.floor(m / 1440))).toISOString().slice(0, 10);
      const v = widgetView(s, day, m % 1440);
      expect(`${v.status} ${v.detail} ${v.dateLabel}`).not.toMatch(/-/);
    }
  });

  it('widget colors keep text readable on every background', () => {
    expect(widgetColors('light', true, '#C24E00', '#FFFFFF').background).toBe('#FFFFFF');
    expect(widgetColors('dark', false, '#C24E00', '#FFFFFF').background).toBe('#141C25');
    expect(widgetColors('system', true, '#C24E00', '#FFFFFF').background).toBe('#141C25');
    expect(widgetColors('platoon', false, '#E69F00', '#000000')).toMatchObject({ background: '#E69F00', foreground: '#000000' });
  });
});

describe('more than one shift on a day', () => {
  // A works Jan 1, Jan 4 and Jan 7 (24 hour tours from 7 AM).
  const overtime: Override[] = [
    { id: 'am', kind: 'extra', date: '2027-01-02', category: 'overtime', hours: 4, startMinutes: 6 * 60 },
    { id: 'pm', kind: 'extra', date: '2027-01-02', category: 'overtime', hours: 4, startMinutes: 18 * 60 },
  ];
  const hireback: Override[] = [{ id: 'hb', kind: 'extra', date: '2027-01-04', category: 'callback', hours: 4, startMinutes: 3 * 60 }];

  it('stores every working shift of the day, not just the first', () => {
    const s = snap(overtime);
    expect(s.v).toBe(SNAPSHOT_VERSION);
    expect(SNAPSHOT_VERSION).toBe(2);
    const byDate = Object.fromEntries(s.days.map((d) => [d.d, d]));
    expect(byDate['2027-01-02']).toMatchObject({ on: true, s: 360, m: 240, l: 'Extra shift' });
    expect(byDate['2027-01-02']!.sh).toEqual([
      { s: 360, m: 240, l: 'Extra shift' },
      { s: 1080, m: 240, l: 'Extra shift' },
    ]);
    // Days with one shift stay as small as before.
    expect(byDate['2027-01-01']!.sh).toBeUndefined();
    expect(byDate['2027-01-03']!.sh).toBeUndefined();
  });

  it('ON during evening overtime after a morning shift on an off day', () => {
    const s = snap(overtime);
    expect(widgetView(s, '2027-01-02', 7 * 60)).toMatchObject({ on: true, status: 'ON', detail: 'Extra shift until 10 AM today' });
    expect(widgetView(s, '2027-01-02', 12 * 60)).toMatchObject({ on: false, status: 'OFF', detail: 'Next shift today at 6 PM' });
    expect(widgetView(s, '2027-01-02', 19 * 60)).toMatchObject({ on: true, status: 'ON', detail: 'Extra shift until 10 PM today' });
    expect(widgetView(s, '2027-01-02', 22 * 60)).toMatchObject({ on: false, detail: 'Next shift in 2 days' });
  });

  it('ON for the tour after an early hireback that starts before it', () => {
    const s = snap(hireback);
    const day = s.days.find((d) => d.d === '2027-01-04')!;
    expect(day.sh).toEqual([
      { s: 180, m: 240, l: 'Extra shift' },
      { s: 420, m: 1440, l: '24 hour tour' },
    ]);
    expect(widgetView(s, '2027-01-04', 2 * 60)).toMatchObject({ on: false, detail: 'Next shift today at 3 AM' });
    expect(widgetView(s, '2027-01-04', 4 * 60)).toMatchObject({ on: true, detail: 'Extra shift until 7 AM today' });
    expect(widgetView(s, '2027-01-04', 8 * 60)).toMatchObject({ on: true, status: 'ON', detail: '24 hour tour until 7 AM tomorrow' });
    expect(widgetView(s, '2027-01-05', 6 * 60)).toMatchObject({ on: true, detail: '24 hour tour until 7 AM today' });
    // The week strip still shows one cell per day.
    expect(widgetView(s, '2027-01-04', 8 * 60).week[0]).toMatchObject({ date: '2027-01-04', on: true });
  });

  it('still reads a version 1 snapshot that has no list of shifts', () => {
    const s = snap();
    const old: WidgetSnapshot = { ...s, v: 1, days: s.days.map(({ sh: _sh, ...rest }) => rest) };
    expect(widgetView(old, '2027-01-01', 600)).toMatchObject({ on: true, detail: '24 hour tour until 7 AM tomorrow' });
    expect(widgetView(old, '2027-01-02', 420)).toMatchObject({ on: false, detail: 'Next shift in 2 days' });
  });

  it('a shift that ends two or more days later names the day without hyphens', () => {
    const s = snap([{ id: 'long', kind: 'extra', date: '2027-01-02', category: 'extra-shift', hours: 44, startMinutes: 8 * 60 }]);
    const v = widgetView(s, '2027-01-02', 12 * 60);
    expect(v).toMatchObject({ on: true, detail: 'Extra shift until 4 AM on Mon, Jan 4' });
    expect(v.detail).not.toMatch(/-/);
  });
});

describe('the Swift widget mirrors the TypeScript rules', () => {
  const swift = readFileSync(join(__dirname, '../../targets/widget/Snapshot.swift'), 'utf8') + readFileSync(join(__dirname, '../../targets/widget/Widgets.swift'), 'utf8');

  it('uses the same app group, key and strings', () => {
    expect(swift).toContain('group.com.tyjcraw.rotawise');
    expect(swift).toContain('forKey: "snapshot"');
    for (const text of ['Next shift today at', 'Next shift tomorrow', 'Next shift in', 'No shifts scheduled', 'Open Rotawise', 'Open the app to refresh your rotation', ' until ', '"tomorrow"', '"today"']) {
      expect(swift).toContain(text);
    }
    for (const color of ['#141C25', '#F2F5F8', '#A9B5C1', '#1E2832', '#FFFFFF', '#0E1621', '#4F5D6B', '#E9EDF1', '#5BD38A', '#0F7A3F']) {
      expect(swift).toContain(color);
    }
  });

  it('decodes every field the app writes', () => {
    const fields = Object.keys(snap()).concat(Object.keys(snap().days[0]!));
    for (const f of fields) expect(swift).toMatch(new RegExp(`let ${f}: `));
  });

  it('reads every shift of a day, and an older snapshot without the list still decodes', () => {
    const day = snap([{ id: 'hb', kind: 'extra', date: '2027-01-04', category: 'callback', hours: 4, startMinutes: 180 }]).days.find((d) => d.d === '2027-01-04')!;
    for (const f of Object.keys(day.sh![0]!)) expect(swift).toMatch(new RegExp(`struct SnapshotShift: Codable \\{[^}]*let ${f}: `));
    // Optional, so JSONDecoder accepts a version 1 snapshot that has no sh.
    expect(swift).toContain('let sh: [SnapshotShift]?');
    expect(swift).toContain('if let list = sh { return list }');
    // The view model and the timeline both walk every shift.
    expect(swift.match(/for shift in day\.shifts/g)).toHaveLength(2);
    expect(swift).toContain('break scan');
  });

  it('names the end day like "Thu, Nov 19" instead of a raw date', () => {
    expect(swift).not.toContain('Civil.iso(endDay)');
    expect(swift).toContain('"on \\(shortDateLabel(endDay))"');
    expect(swift).toContain('func shortDateLabel(_ n: Int) -> String');
    expect(swift).toContain('monthShort[c.month - 1]');
  });

  it('schedules timeline entries at midnight and at shift changes', () => {
    expect(swift).toContain('Civil.date(day: local.day + offset, minutes: 0');
    expect(swift).toContain('minutes: shift.s + shift.m');
    expect(swift).toContain('policy: .atEnd');
    // A long shift that started days ago still gets an entry when it ends inside the window.
    expect(swift).not.toContain('n >= local.day - 2');
    expect(swift).toContain('end >= now, end <= horizon');
  });
});

describe('day cell labels', () => {
  it('keeps codes readable instead of gluing them to the platoon letter', () => {
    const { dayCellLabel } = jest.requireActual('@/lib/widgetSnapshot') as typeof import('@/lib/widgetSnapshot');
    expect(dayCellLabel('B', true, '24')).toBe('B');
    expect(dayCellLabel('C', true, 'N')).toBe('CN');
    expect(dayCellLabel('B', true, 'OT')).toBe('OT');
    expect(dayCellLabel('B', true, 'T+')).toBe('T+');
    expect(dayCellLabel('B', false, 'K')).toBe('K');
    expect(dayCellLabel('B', false, '')).toBe('off');
  });
});
