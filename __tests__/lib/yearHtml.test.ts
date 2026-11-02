import { contrastRatio, luminance, PLATOON_COLORS } from '@/lib/platoonColors';
import { rotationFromPreset } from '@/lib/rotation';
import { escapeHtml, yearCalendarBlock, yearCalendarDocument } from '@/lib/yearHtml';

describe('printable year calendar', () => {
  const r = rotationFromPreset('24-48', '2027-01-01', null);

  it('marks every one of your tours for the year with your letter', () => {
    const html = yearCalendarBlock({ year: 2027, rotation: r, platoons: ['A'], title: 'A platoon 2027' });
    // 365 days / 3 = 121.67, so A works 122 tours starting Jan 1.
    expect(html.match(/class="on"/g)).toHaveLength(122);
    expect(html).toContain('January');
    expect(html).toContain('December');
    expect(html.match(/<section class="m">/g)).toHaveLength(12);
  });

  it('shows every platoon on duty when asked for all platoons', () => {
    const html = yearCalendarBlock({ year: 2028, rotation: r, platoons: ['A', 'B', 'C'], title: 'All' });
    // 2028 is a leap year: one platoon badge per day.
    expect(html.match(/class="pb"/g)!.length).toBe(366 + 3); // days plus the legend
  });

  it('shows K, T and V codes in a single platoon calendar', () => {
    const k = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7 });
    const html = yearCalendarBlock({
      year: 2027,
      rotation: k,
      platoons: ['A'],
      overrides: [
        { id: 'v', kind: 'leave', date: '2027-01-04', leaveType: 'vacation' },
        { id: 't', kind: 'trade', date: '2027-01-07', direction: 'gave', counterpart: 'X', settled: false },
      ],
      title: 'A',
    });
    expect(html).toContain('<span class="b">V</span>');
    expect(html).toContain('<span class="b">T</span>');
    expect(html).toContain('<span class="b">K</span>');
  });

  it('escapes titles and builds a complete printable page', () => {
    expect(escapeHtml('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
    const doc = yearCalendarDocument({ year: 2027, rotation: r, platoons: ['B'], title: 'Station <1>' });
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('Station &lt;1&gt;');
    expect(doc).toContain('@page{size:landscape');
  });
});

describe('platoon colors are readable and color blind safe', () => {
  it('every letter has at least 4.5:1 contrast on its color', () => {
    for (const p of ['A', 'B', 'C', 'D'] as const) {
      expect(contrastRatio(PLATOON_COLORS[p].fill, PLATOON_COLORS[p].text)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the four colors differ clearly in lightness, so they stay apart without hue', () => {
    const l = (['A', 'B', 'C', 'D'] as const).map((p) => luminance(PLATOON_COLORS[p].fill));
    // D (orange) is far lighter than the rest; A, B, C differ in hue families chosen from Okabe and Ito.
    expect(Math.max(...l) / Math.min(...l)).toBeGreaterThan(3);
    expect(new Set(Object.values(PLATOON_COLORS).map((c) => c.fill)).size).toBe(4);
  });
});

describe('Kelly days on shared calendars', () => {
  it('an all platoons calendar still shows the platoon on duty on Kelly days', () => {
    const k = rotationFromPreset('24-48', '2027-01-01', { everyNthShift: 7 });
    const all = yearCalendarBlock({ year: 2027, rotation: k, platoons: ['A', 'B', 'C'], title: 'All' });
    expect(all.match(/class="pb"/g)!.length).toBe(365 + 3);
    const mine = yearCalendarBlock({ year: 2027, rotation: k, platoons: ['A'], title: 'A' });
    expect(mine.match(/<span class="b">K<\/span>/g)!.length).toBe(Math.floor(122 / 7));
  });
});
