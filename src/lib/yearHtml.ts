/**
 * A printable one page year calendar as standalone HTML. Used by the app's year PDF
 * (expo-print) and by the landing site's rotation and department pages.
 */
import { PLATOON_COLORS } from './platoonColors.ts';
import { MONTH_NAMES, WEEKDAY_SHORT, codeFor, effectiveShifts, monthGrid, toISO, PLATOONS, isWorking } from './rotation/index.ts';
import type { Override, Platoon, Rotation, ShiftInstance } from './rotation/index.ts';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface YearCalendarOptions {
  year: number;
  rotation: Rotation;
  /** One platoon highlights that platoon's shifts; several show who is on each day. */
  platoons: Platoon[];
  overrides?: readonly Override[];
  weekStartsOn?: 0 | 1;
  title: string;
  subtitle?: string;
  footer?: string;
}

interface DayInfo {
  platoons: Platoon[];
  code: string;
}

function dayInfo(opts: YearCalendarOptions): Map<string, DayInfo> {
  const from = toISO({ year: opts.year, month: 1, day: 1 });
  const to = toISO({ year: opts.year, month: 12, day: 31 });
  const map = new Map<string, DayInfo>();
  const single = opts.platoons.length === 1;
  for (const p of opts.platoons) {
    const shifts: ShiftInstance[] = effectiveShifts(opts.rotation, p, from, to, single ? (opts.overrides ?? []) : []);
    for (const s of shifts) {
      const entry = map.get(s.date) ?? { platoons: [], code: '' };
      if (isWorking(s)) {
        if (!entry.platoons.includes(p)) entry.platoons.push(p);
        if (single) entry.code = codeFor(s, opts.rotation);
      } else if (single && !entry.code) {
        entry.code = codeFor(s, opts.rotation);
      }
      map.set(s.date, entry);
    }
  }
  return map;
}

/** The calendar block (no page wrapper), for embedding in a site page. */
export function yearCalendarBlock(opts: YearCalendarOptions): string {
  const weekStartsOn = opts.weekStartsOn ?? 0;
  const info = dayInfo(opts);
  const single = opts.platoons.length === 1;
  const heads = Array.from({ length: 7 }, (_, i) => WEEKDAY_SHORT[(i + weekStartsOn) % 7]!.slice(0, 2));
  const months = MONTH_NAMES.map((name, i) => {
    const weeks = monthGrid(opts.year, i + 1, weekStartsOn);
    const rows = weeks
      .map(
        (week) =>
          '<tr>' +
          week
            .map((date) => {
              if (!date) return '<td></td>';
              const day = Number(date.slice(8));
              const d = info.get(date);
              if (!d || (d.platoons.length === 0 && !d.code)) return `<td><span class="n">${day}</span></td>`;
              if (single) {
                const p = opts.platoons[0]!;
                const c = PLATOON_COLORS[p];
                if (d.platoons.length > 0) {
                  return `<td class="on" style="background:${c.fill};color:${c.text}"><span class="n">${day}</span><span class="b">${escapeHtml(p)}</span></td>`;
                }
                return `<td class="off-code"><span class="n">${day}</span><span class="b">${escapeHtml(d.code)}</span></td>`;
              }
              const badges = d.platoons
                .map((p) => `<span class="pb" style="background:${PLATOON_COLORS[p].fill};color:${PLATOON_COLORS[p].text}">${p}</span>`)
                .join('');
              return `<td><span class="n">${day}</span>${badges}</td>`;
            })
            .join('') +
          '</tr>',
      )
      .join('');
    return `<section class="m"><h3>${name}</h3><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
  const legend = (single ? opts.platoons : opts.platoons.length ? opts.platoons : PLATOONS.slice(0, opts.rotation.platoonCount))
    .map((p) => `<span class="lg"><span class="pb" style="background:${PLATOON_COLORS[p].fill};color:${PLATOON_COLORS[p].text}">${p}</span> ${p} platoon</span>`)
    .join('');
  const codes = single ? '<span class="lg"><b>K</b> Kelly day</span><span class="lg"><b>T</b> traded away</span><span class="lg"><b>V</b> vacation</span><span class="lg"><b>S</b> sick</span>' : '';
  return `<div class="yc"><div class="yc-head"><h2>${escapeHtml(opts.title)}</h2>${opts.subtitle ? `<p>${escapeHtml(opts.subtitle)}</p>` : ''}</div><div class="grid">${months}</div><div class="legend">${legend}${codes}</div>${opts.footer ? `<p class="foot">${escapeHtml(opts.footer)}</p>` : ''}</div>`;
}

export const YEAR_CALENDAR_CSS = `
.yc{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0E1621}
.yc-head h2{margin:0 0 2px;font-size:20px}
.yc-head p{margin:0 0 8px;color:#4F5D6B;font-size:12px}
.yc .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 10px}
.yc .m h3{margin:0 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.yc table{width:100%;border-collapse:collapse;table-layout:fixed}
.yc th{font-size:8px;color:#4F5D6B;font-weight:600;padding:1px 0}
.yc td{height:22px;border:1px solid #D9E0E6;font-size:9px;vertical-align:top;padding:1px 2px;position:relative}
.yc td .n{display:block;font-weight:600;line-height:10px}
.yc td .b{display:block;font-weight:800;font-size:9px;line-height:10px}
.yc td.on{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.yc td.off-code .b{color:#4F5D6B}
.yc .pb{display:inline-block;min-width:10px;padding:0 2px;margin-right:1px;border-radius:3px;font-weight:800;font-size:8px;line-height:10px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.yc .legend{margin-top:8px;font-size:11px;display:flex;flex-wrap:wrap;gap:6px 14px}
.yc .lg .pb{font-size:10px;line-height:13px;min-width:13px}
.yc .foot{font-size:10px;color:#4F5D6B;margin:6px 0 0}
@media (max-width:760px){.yc .grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:420px){.yc .grid{grid-template-columns:1fr}.yc td{height:26px;font-size:11px}}
@media print{@page{size:landscape;margin:10mm}.yc .grid{grid-template-columns:repeat(4,1fr)}}
`;

/** A complete printable page. */
export function yearCalendarDocument(opts: YearCalendarOptions): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.title)}</title><style>body{margin:12px;background:#fff}${YEAR_CALENDAR_CSS}</style></head><body>${yearCalendarBlock(opts)}</body></html>`;
}
