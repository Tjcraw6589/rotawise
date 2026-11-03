/**
 * Builds the static landing site into site/dist. Plain HTML and CSS, no framework.
 * Run: npm run site      Preview: npm run site:serve (http://127.0.0.1:4180)
 *
 * Pages:
 *   index.html                         home, store links, the never a subscription promise
 *   rotations/<preset>/index.html      a template page per rotation with a 2027 calendar per platoon
 *   departments/<slug>/index.html      one page per row of departments.csv
 *   privacy.html, support.html, sitemap.xml, robots.txt
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLATOON_COLORS } from '../src/lib/platoonColors.ts';
import { PLATOONS, PRESETS, isValidISO, presetInfo, rotationFromPreset, addDays } from '../src/lib/rotation/index.ts';
import type { Platoon, PresetId, Rotation } from '../src/lib/rotation/index.ts';
import { YEAR_CALENDAR_CSS, escapeHtml, yearCalendarBlock } from '../src/lib/yearHtml.ts';

import { parseCsv, slugify } from './csv.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'dist');
const config = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8')) as {
  siteUrl: string;
  appStoreUrl: string;
  playStoreUrl: string;
  supportEmail: string;
  year: number;
};
const YEAR = config.year;
const SITE = config.siteUrl.endsWith('/') ? config.siteUrl : `${config.siteUrl}/`;
/** App Store ID of "Shift Calendar: Rotawise"; used for Safari's app banner once the app is live (config appStoreUrl set). */
const APP_STORE_ID = '6829975398';

type Preset = Exclude<PresetId, 'custom'>;
const TEMPLATE_PRESETS = PRESETS.filter((p) => p.id !== 'custom').map((p) => p.id as Preset);

function platoonLetters(n: number): string {
  return PLATOONS.slice(0, n).join(' ');
}

const STYLES = `
:root{--bg:#F4F6F8;--surface:#FFFFFF;--text:#0E1621;--muted:#4F5D6B;--border:#D9E0E6;--primary:#005A8C;--primary-soft:#DCEBF5;--pro:#A15C00;--warn-bg:#FDEBD9;--warn:#7A3A00}
@media (prefers-color-scheme:dark){:root{--bg:#0B1118;--surface:#141C25;--text:#F2F5F8;--muted:#A9B5C1;--border:#27323D;--primary:#5FB4EE;--primary-soft:#13324A;--pro:#F5C06A;--warn-bg:#3A2611;--warn:#F5B26B}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--primary)}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header.top{background:var(--surface);border-bottom:1px solid var(--border)}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;min-height:60px;gap:12px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;color:var(--text);text-decoration:none}
.brand img{width:34px;height:34px;border-radius:8px}
nav a{margin-left:16px;text-decoration:none;font-weight:600}
.hero{padding:56px 0 32px}
.hero h1{font-size:40px;line-height:1.1;margin:0 0 12px;letter-spacing:-.5px}
.hero p.lead{font-size:20px;color:var(--muted);margin:0 0 24px;max-width:720px}
.promise{display:inline-block;background:var(--primary-soft);color:var(--primary);font-weight:800;padding:8px 16px;border-radius:999px;margin-bottom:20px}
.stores{display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 22px;border-radius:12px;font-weight:700;text-decoration:none;background:var(--text);color:var(--bg)}
.btn.soon{background:var(--surface);color:var(--muted);border:1px dashed var(--border)}
.btn.secondary{background:var(--surface);color:var(--text);border:1px solid var(--border)}
section{padding:28px 0}
h2{font-size:28px;margin:0 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px}
.card h3{margin:0 0 6px;font-size:18px}
.card p{margin:0;color:var(--muted)}
.card a.cover{text-decoration:none;color:inherit;display:block}
table.compare{width:100%;border-collapse:collapse;background:var(--surface);border-radius:16px;overflow:hidden}
table.compare th,table.compare td{border-bottom:1px solid var(--border);padding:10px 12px;text-align:left}
.banner{background:var(--warn-bg);color:var(--warn);border-radius:12px;padding:14px 16px;font-weight:600;margin:16px 0}
.crumbs{margin:20px 0 0;font-size:15px;color:var(--muted)}
.crumbs a{color:inherit}
.badges{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.lgb{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:7px;font-weight:900;padding:0 6px}
.cal{background:#fff;color:#0E1621;border-radius:16px;padding:16px;margin:18px 0;border:1px solid var(--border);overflow-x:auto}
.print{margin:8px 0}
footer{border-top:1px solid var(--border);margin-top:40px;padding:24px 0;color:var(--muted);font-size:14px}
footer a{margin-right:16px}
@media (max-width:600px){.hero h1{font-size:30px}.hero p.lead{font-size:17px}nav a{margin-left:10px}}
@media print{header.top,footer,.no-print,.stores,.print{display:none}body{background:#fff;color:#000}.cal{border:none;padding:0;page-break-after:always}}
${YEAR_CALENDAR_CSS}
`;

interface PageArgs {
  path: string; // output path relative to dist, e.g. "rotations/24-48/index.html"
  title: string;
  description: string;
  body: string;
  noindex?: boolean;
  /** Schema.org structured data, written as JSON-LD in the head. */
  jsonLd?: object[];
}

/** Search results cut titles after about 60 characters and descriptions after about 160. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

/** Title case for preset names in titles and headings: "Kelly schedule" becomes "Kelly Schedule"; "4 on 4 off" stays. */
function headingName(name: string): string {
  return name
    .split(' ')
    .map((w) => (w === 'on' || w === 'off' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** The first description that fits in a search result. */
function fitDescription(...candidates: string[]): string {
  return candidates.find((c) => c.length <= DESCRIPTION_MAX) ?? candidates[candidates.length - 1]!;
}

function jsonLdTag(data: object): string {
  // A "<" inside JSON could close the script tag early, so it is written as its unicode escape.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, String.fromCharCode(92) + 'u003c')}</script>`;
}

function breadcrumbs(items: [string, string][]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}

const pages: { path: string; noindex: boolean }[] = [];

function rel(path: string): string {
  const depth = path.split('/').length - 1;
  return depth === 0 ? './' : '../'.repeat(depth);
}

function storeButtons(): string {
  const ios = config.appStoreUrl
    ? `<a class="btn" href="${escapeHtml(config.appStoreUrl)}">Download on the App Store</a>`
    : '<span class="btn soon" title="Coming soon">App Store: coming soon</span>';
  const android = config.playStoreUrl
    ? `<a class="btn" href="${escapeHtml(config.playStoreUrl)}">Get it on Google Play</a>`
    : '<span class="btn soon" title="Coming soon">Google Play: coming soon</span>';
  return `<div class="stores">${ios}${android}</div>`;
}

function page({ path, title, description, body, noindex, jsonLd = [] }: PageArgs): void {
  if (!noindex && (title.length > TITLE_MAX || description.length > DESCRIPTION_MAX)) {
    throw new Error(`${path}: title ${title.length}/${TITLE_MAX} or description ${description.length}/${DESCRIPTION_MAX} characters is too long for search results`);
  }
  const r = rel(path);
  const canonical = SITE + path.replace(/index\.html$/, '');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${escapeHtml(canonical)}">`}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}static/icon-512.png">
<meta property="og:site_name" content="Rotawise">
${noindex ? '' : `<meta property="og:url" content="${escapeHtml(canonical)}">`}
<meta name="twitter:card" content="summary">
${config.appStoreUrl ? `<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}">` : ''}
${jsonLd.map(jsonLdTag).join('\n')}
<link rel="icon" href="${r}static/favicon.png">
<link rel="stylesheet" href="${r}styles.css">
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${r}"><img src="${r}static/icon-192.png" alt="" width="34" height="34">Rotawise</a>
<nav><a href="${r}#rotations">Rotations</a><a href="${r}#departments">Departments</a><a href="${r}support.html">Support</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
<a href="${r}privacy.html">Privacy</a><a href="${r}support.html">Support</a><a href="${r}">Home</a>
<p>Rotawise is a shift calendar for firefighters, EMS, police and every rotating shift worker. Pay once. Never a subscription. Calendars here are calculated from the pattern shown. Always check your department's official schedule.</p>
</div></footer>
</body>
</html>
`;
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  pages.push({ path, noindex: Boolean(noindex) });
}

function legend(n: number): string {
  return `<div class="badges">${PLATOONS.slice(0, n)
    .map((p) => `<span class="lgb" style="background:${PLATOON_COLORS[p].fill};color:${PLATOON_COLORS[p].text}">${p}</span>`)
    .join('')}</div>`;
}

function calendarsFor(rotation: Rotation, title: string, footer: string): string {
  const all = yearCalendarBlock({ year: YEAR, rotation, platoons: PLATOONS.slice(0, rotation.platoonCount), title: `${title}: all platoons, ${YEAR}`, footer });
  const per = PLATOONS.slice(0, rotation.platoonCount)
    .map(
      (p: Platoon) =>
        `<div class="cal" id="platoon-${p.toLowerCase()}">${yearCalendarBlock({ year: YEAR, rotation, platoons: [p], title: `${title}: ${p} platoon, ${YEAR}`, footer })}</div>`,
    )
    .join('');
  const jump = PLATOONS.slice(0, rotation.platoonCount)
    .map((p) => `<a class="btn secondary" href="#platoon-${p.toLowerCase()}">${p} platoon</a>`)
    .join(' ');
  return `<p class="no-print stores">${jump}</p><button class="btn print no-print" onclick="window.print()">Print these calendars</button><div class="cal">${all}</div>${per}`;
}

// ---------- build ----------
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'static'), { recursive: true });
writeFileSync(join(out, 'styles.css'), STYLES);
for (const f of ['icon-192.png', 'icon-512.png', 'favicon.png']) {
  const src = join(here, 'static', f);
  if (existsSync(src)) copyFileSync(src, join(out, 'static', f));
}
writeFileSync(join(out, '.nojekyll'), '');

// Rotation template pages.
for (const id of TEMPLATE_PRESETS) {
  const info = presetInfo(id);
  const rotation = rotationFromPreset(id, `${YEAR}-01-01`);
  const letters = platoonLetters(rotation.platoonCount);
  const kellyNote = rotation.kelly ? ` Kelly days are shown every ${rotation.kelly.everyNthShift}th tour; departments differ, so set your own interval in the app.` : '';
  const name = headingName(info.name);
  page({
    path: `rotations/${id}/index.html`,
    title: `${name} Shift Calendar ${YEAR} (Printable, ${letters})`,
    description: fitDescription(
      `Printable ${info.name} shift calendar for ${YEAR}, one for each platoon (${letters}). ${info.tagline}. Free in the Rotawise app, offline, no account.`,
      `Printable ${info.name} shift calendar for ${YEAR}, one for each platoon (${letters}). ${info.tagline}.`,
      `Printable ${info.name} shift calendar for ${YEAR}, one for each platoon (${letters}).`,
    ),
    jsonLd: [
      breadcrumbs([
        ['Rotawise', SITE],
        [`${name} Shift Calendar ${YEAR}`, `${SITE}rotations/${id}/`],
      ]),
    ],
    body: `<nav class="crumbs no-print" aria-label="Breadcrumb"><a href="../../">Home</a> › <a href="../../#rotations">Rotations</a> › ${escapeHtml(name)}</nav>
<div class="hero"><h1>${escapeHtml(name)} Shift Calendar ${YEAR}</h1>
<p class="lead">${escapeHtml(info.description)} Used by ${escapeHtml(info.usedBy.charAt(0).toLowerCase() + info.usedBy.slice(1))}. About ${info.hoursPerWeekAverage} hours a week on average.</p>
${legend(rotation.platoonCount)}
<p class="banner">Template: platoon A starts its cycle on January 1, ${YEAR}. Your department's start date is probably different.${escapeHtml(kellyNote)} The Rotawise app lines it up with your real dates in a few taps.</p>
${storeButtons()}</div>
${calendarsFor(rotation, `${info.name} rotation`, `Template calendar: platoon A starts January 1, ${YEAR}. Made with Rotawise.`)}`,
  });
}

// Department pages from the CSV.
interface Department {
  slug: string;
  name: string;
  city: string;
  state: string;
  rotation: Rotation;
  presetName: string;
  verified: boolean;
  note: string;
}
const rows = parseCsv(readFileSync(join(here, 'departments.csv'), 'utf8'));
const departments: Department[] = [];
const problems: string[] = [];
rows.forEach((row, i) => {
  const line = i + 2;
  const name = row.department ?? '';
  const preset = (row.rotation ?? '') as Preset;
  const anchor = row.anchor_date ?? '';
  const anchorPlatoon = ((row.anchor_platoon || 'A').toUpperCase() as Platoon) ?? 'A';
  if (!name) return problems.push(`line ${line}: department is empty`);
  if (!TEMPLATE_PRESETS.includes(preset)) return problems.push(`line ${line}: rotation "${row.rotation}" is not one of ${TEMPLATE_PRESETS.join(', ')}`);
  if (!isValidISO(anchor)) return problems.push(`line ${line}: anchor_date "${anchor}" is not a YYYY-MM-DD date`);
  const base = rotationFromPreset(preset, anchor, row.kelly_every ? { everyNthShift: Number(row.kelly_every) } : undefined);
  const idx = PLATOONS.indexOf(anchorPlatoon);
  if (idx < 0 || idx >= base.platoonCount) return problems.push(`line ${line}: anchor_platoon "${row.anchor_platoon}" does not exist on ${preset}`);
  // anchor_date is a day the anchor platoon started its cycle; shift so platoon A is at cycle day 0.
  const rotation = { ...base, anchorDate: addDays(anchor, -idx * base.platoonOffsetDays) };
  const status = (row.status ?? '').toUpperCase();
  departments.push({
    slug: slugify(`${name} ${row.city ?? ''} ${row.state ?? ''}`),
    name,
    city: row.city ?? '',
    state: row.state ?? '',
    rotation,
    presetName: presetInfo(preset).name,
    verified: status === 'VERIFIED',
    note: row.note ?? '',
  });
  return undefined;
});
if (problems.length) {
  console.error(`departments.csv has problems:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
}

for (const d of departments) {
  const letters = platoonLetters(d.rotation.platoonCount);
  const place = [d.city, d.state].filter(Boolean).join(', ');
  page({
    path: `departments/${d.slug}/index.html`,
    title: `${d.name} ${letters} Shift Calendar ${YEAR}`,
    description: d.verified
      ? `${d.name} ${letters} shift calendar for ${YEAR}${place ? ` (${place})` : ''}: ${d.presetName} rotation with a printable calendar for every platoon.`
      : `Unverified example: ${d.name} ${letters} shift calendar for ${YEAR}. Not an official schedule.`,
    noindex: !d.verified,
    body: `<div class="hero"><h1>${escapeHtml(d.name)} ${letters} Shift Calendar ${YEAR}</h1>
<p class="lead">${escapeHtml(d.presetName)} rotation${place ? ` in ${escapeHtml(place)}` : ''}. ${escapeHtml(presetInfo(d.rotation.presetId).tagline)}.</p>
${
  d.verified
    ? '<p class="banner">Calculated from the published rotation. If anything looks wrong, tell us from the support page and check your department\'s official schedule.</p>'
    : `<p class="banner"><strong>UNVERIFIED EXAMPLE.</strong> This is not an official schedule and has not been confirmed with ${escapeHtml(d.name)}. Do not rely on it. ${escapeHtml(d.note)}</p>`
}
${legend(d.rotation.platoonCount)}
${storeButtons()}</div>
${calendarsFor(d.rotation, d.name, d.verified ? `${d.name}, ${d.presetName}. Made with Rotawise.` : `UNVERIFIED EXAMPLE, not an official ${d.name} schedule. Made with Rotawise.`)}`,
  });
}

// Home page.
const rotationCards = TEMPLATE_PRESETS.map((id) => {
  const info = presetInfo(id);
  return `<div class="card"><a class="cover" href="rotations/${id}/"><h3>${escapeHtml(info.name)}</h3><p>${escapeHtml(info.tagline)}. ${info.platoonCount} platoons.</p></a></div>`;
}).join('');
const departmentCards = departments
  .map(
    (d) =>
      `<div class="card"><a class="cover" href="departments/${d.slug}/"><h3>${escapeHtml(d.name)}</h3><p>${escapeHtml(d.presetName)}${d.verified ? '' : '. Unverified example'}</p></a></div>`,
  )
  .join('');
page({
  path: 'index.html',
  title: 'Rotawise: Shift Calendar for Firefighters, EMS and Police',
  description: 'Shift calendar app for firefighters, EMS and police: 24/48, 48/96, Kelly, Pitman, DuPont and custom rotations, with home screen widgets. Pay once, no renewals.',
  jsonLd: [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Rotawise', url: SITE },
    {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'Rotawise',
      alternateName: 'Shift Calendar: Rotawise',
      description: 'Shift calendar for firefighters, EMS, police and rotating shift workers, with home screen widgets. Works offline with no account.',
      operatingSystem: 'iOS',
      applicationCategory: 'UtilitiesApplication',
      url: SITE,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
  body: `<div class="hero">
<span class="promise">Pay once. Never a subscription.</span>
<h1>Your rotation, on your home screen.</h1>
<p class="lead">Rotawise is the shift calendar for firefighters, EMS, police and anyone on a rotating schedule. Set up your rotation in under a minute and see at a glance whether you're on or off today. Fully offline. No account.</p>
${storeButtons()}
</div>
<section><h2>Free, and genuinely useful</h2><div class="grid">
<div class="card"><h3>Every common rotation</h3><p>24/48, 48/96, 24/72, Kelly, Pitman, DuPont, 2 2 3, 4 on 4 off, 3 twelves, or build your own pattern.</p></div>
<div class="card"><h3>A B C and D platoons</h3><p>High contrast colors that work for color blind eyes, always with a letter. Show your platoon or all of them.</p></div>
<div class="card"><h3>24 hour tours done right</h3><p>A tour is one shift across two dates, not two day shifts.</p></div>
<div class="card"><h3>Home screen widgets</h3><p>Today: on or off and your next shift. Next 7 days at a glance. They update themselves.</p></div>
<div class="card"><h3>Month and year views</h3><p>Big, readable at a glance, with dark mode.</p></div>
<div class="card"><h3>Private by design</h3><p>No account, no ads, no analytics, no tracking. Your schedule never leaves your phone.</p></div>
</div></section>
<section><h2>Pro: one payment, yours forever</h2>
<table class="compare"><tr><th>Pro feature</th><th>What it does</th></tr>
<tr><td>Trades and swaps</td><td>A ledger of who owes whom. Your calendar updates with every trade.</td></tr>
<tr><td>Overtime</td><td>Log extra shifts and callbacks with hour totals.</td></tr>
<tr><td>Pay periods</td><td>Weekly, biweekly, twice a month or custom, with estimated gross pay.</td></tr>
<tr><td>Leave</td><td>Vacation, sick and Kelly day balances.</td></tr>
<tr><td>Share with a calendar</td><td>Send shifts to Apple or Google Calendar so a partner can see them.</td></tr>
<tr><td>More rotations</td><td>A second job or a partner's rotation, overlaid in color.</td></tr>
<tr><td>Print the year</td><td>A one page year calendar as a PDF or an image.</td></tr>
<tr><td>Themes</td><td>Color themes and widget colors.</td></tr>
</table>
<p>Pro is a one time purchase. Not a subscription, no renewals. Restore it on any phone signed in to the same store account.</p></section>
<section id="rotations"><h2>Printable ${YEAR} rotation calendars</h2><div class="grid">${rotationCards}</div></section>
<section id="departments"><h2>Department shift calendars ${YEAR}</h2>
<p>Pages marked unverified are examples that have not been confirmed with the department.</p>
<div class="grid">${departmentCards}</div></section>`,
});

// Privacy and support.
page({
  path: 'privacy.html',
  title: 'Rotawise Privacy Policy',
  description: 'Your schedule never leaves your phone. No account, no ads, no analytics, no tracking.',
  body: `<div class="hero"><h1>Privacy Policy</h1><p class="lead">Short version: your schedule never leaves your phone. The only thing that leaves it is an anonymous purchase receipt, and only if you buy Pro.</p></div>
<div class="card">
<h3>What stays on your phone</h3><p>Your rotation, platoon, trades, overtime, pay settings and leave are stored only in a database on your device. They are never sent to us or anyone else. Deleting the app deletes them.</p>
<h3 style="margin-top:16px">No account, ads, analytics or tracking</h3><p>Rotawise has no sign in, shows no ads, contains no analytics and does not track you across apps or websites.</p>
<h3 style="margin-top:16px">Purchases</h3><p>Rotawise Pro is a one time in app purchase handled by Apple (App Store) or Google (Google Play). To confirm and restore the purchase, the app uses RevenueCat, which receives an anonymous app user ID and the store's purchase receipt. This is not linked to your name, email or schedule. See RevenueCat's privacy policy at revenuecat.com.</p>
<h3 style="margin-top:16px">Calendar</h3><p>Only if you use Share with a calendar, the app asks for calendar access and adds your shifts to the calendar you pick. It does not read your other events.</p>
<h3 style="margin-top:16px">Widgets</h3><p>Home screen widgets read a copy of your schedule that the app keeps on your device for them.</p>
<h3 style="margin-top:16px">Children</h3><p>Rotawise is not directed at children and collects no personal information from anyone.</p>
<h3 style="margin-top:16px">Contact</h3><p>Questions: <a href="mailto:${escapeHtml(config.supportEmail)}">${escapeHtml(config.supportEmail)}</a>. Last updated November 2, 2026.</p>
</div>`,
});
page({
  path: 'support.html',
  title: 'Rotawise Support',
  description: 'Help with Rotawise, the shift calendar for firefighters, EMS and police.',
  body: `<div class="hero"><h1>Support</h1><p class="lead">Email <a href="mailto:${escapeHtml(config.supportEmail)}?subject=Rotawise">${escapeHtml(config.supportEmail)}</a>. A real person reads every message.</p></div>
<div class="grid">
<div class="card"><h3>My calendar is one day off</h3><p>Settings, Schedule, then tap One day earlier or One day later until the two week preview matches.</p></div>
<div class="card"><h3>How do I add the widget?</h3><p>iPhone: touch and hold the home screen, tap Edit, Add Widget, and search for Rotawise. Android: touch and hold the home screen, tap Widgets, and find Rotawise.</p></div>
<div class="card"><h3>Is Pro a subscription?</h3><p>No. Pro is a one time purchase. Pay once, keep it forever.</p></div>
<div class="card"><h3>New phone?</h3><p>Install Rotawise, open Settings and tap Restore purchases while signed in to the same Apple or Google account.</p></div>
<div class="card"><h3>Kelly days</h3><p>In your rotation settings, turn on Kelly days, set every Nth shift, and tap your next Kelly day.</p></div>
<div class="card"><h3>Is this my official schedule?</h3><p>Rotawise calculates the rotation you set up. Always check your department's official schedule.</p></div>
</div>`,
});

// Sitemap and robots. Unverified department pages stay out of search until confirmed.
const urls = pages.filter((p) => !p.noindex).map((p) => `<url><loc>${SITE}${p.path.replace(/index\.html$/, '')}</loc></url>`);
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);

console.log(`Built ${pages.length} pages into site/dist (${departments.length} departments, ${departments.filter((d) => !d.verified).length} unverified).`);
