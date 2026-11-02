// Store screenshots at exact store pixel sizes, rendered from the exported web build
// (the same React Native screens through React Native Web).
// Requires: npm run export:web first (dist/), Playwright Chromium installed.
// Output: store/screenshots/<device>/NN-<screen>.png
// Optional: npm run screenshots -- --only=iphone-6.9
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4393;
const BASE = `http://127.0.0.1:${PORT}`;

const DEVICES = [
  { name: 'iphone-6.9', width: 440, height: 956, scale: 3, note: '1320x2868' },
  { name: 'iphone-6.3', width: 402, height: 874, scale: 3, note: '1206x2622' },
  { name: 'iphone-6.5', width: 428, height: 926, scale: 3, note: '1284x2778' },
  { name: 'ipad-13', width: 1032, height: 1376, scale: 2, note: '2064x2752' },
  { name: 'android-phone', width: 360, height: 640, scale: 3, note: '1080x1920' },
  { name: 'android-tablet-10', width: 800, height: 1280, scale: 2, note: '1600x2560' },
];

// A fixed, believable moment: Tuesday March 16 2027, 10:30, on shift.
const NOW = new Date(2027, 2, 16, 10, 30);

const tour = { id: 'tour24', label: '24 hour tour', short: '24', kind: 'tour', startMinutes: 420, durationMinutes: 1440 };
const me = {
  id: 'me',
  name: 'Me',
  color: '#0072B2',
  platoon: 'B',
  createdAt: '1970-01-01T00:00:00.000Z',
  rotation: { presetId: '24-48', cycle: ['tour24', null, null], shiftTypes: [tour], platoonCount: 3, platoonOffsetDays: 1, anchorDate: '2027-03-15', kelly: { everyNthShift: 9, phase: 4 } },
};
const partner = {
  id: 'p_partner',
  name: 'Sam',
  color: '#CC79A7',
  platoon: 'A',
  createdAt: '2027-01-01T00:00:00.000Z',
  rotation: {
    presetId: 'pitman',
    cycle: ['day12', 'day12', null, null, 'day12', 'day12', 'day12', null, null, 'day12', 'day12', null, null, null],
    shiftTypes: [
      { id: 'day12', label: '12 hour day', short: 'D', kind: 'day', startMinutes: 420, durationMinutes: 720 },
      { id: 'night12', label: '12 hour night', short: 'N', kind: 'night', startMinutes: 1140, durationMinutes: 720 },
    ],
    platoonCount: 4,
    platoonOffsetDays: 7,
    anchorDate: '2027-03-01',
    kelly: null,
  },
};
const o = (id, rest) => ({ id, profileId: 'me', createdAt: '2027-03-01T00:00:00.000Z', ...rest });
const overrides = [
  o('t1', { kind: 'trade', date: '2027-03-22', direction: 'gave', counterpart: 'Martinez', hours: 24, settled: false }),
  o('t2', { kind: 'trade', date: '2027-03-27', direction: 'took', counterpart: 'Okafor', hours: 24, settled: false }),
  o('t3', { kind: 'trade', date: '2027-03-04', direction: 'took', counterpart: 'Martinez', hours: 12, settled: false }),
  o('x1', { kind: 'extra', date: '2027-03-09', category: 'overtime', hours: 12, startMinutes: 420 }),
  o('x2', { kind: 'extra', date: '2027-03-12', category: 'callback', hours: 4, startMinutes: 1260 }),
  o('l1', { kind: 'leave', date: '2027-03-31', leaveType: 'vacation', hours: 24 }),
];

function settings(theme, extra = {}) {
  return {
    theme,
    palette: 'station',
    weekStartsOn: 0,
    hour12: true,
    showAllPlatoons: false,
    activeProfileId: 'me',
    overlayProfileIds: [],
    onboardingComplete: true,
    pay: { kind: 'biweekly', anchorStart: '2027-03-07', paydayOffsetDays: 6, hourlyRate: 32.5, regularHoursPerPeriod: 106, otMultiplier: 1.5 },
    leave: { vacationHours: 240, sickHours: 144, kellyDays: 14 },
    widgetBackground: 'system',
    calendarExport: { calendarId: null, eventIds: [], lastExportAt: null, monthsAhead: 12 },
    ...extra,
  };
}

const SHOTS = [
  { file: '01-today', path: '/', theme: 'light', wait: 'today-screen' },
  { file: '02-month-all', path: '/calendar', theme: 'light', wait: 'calendar-screen', settings: { showAllPlatoons: true } },
  { file: '03-widgets', path: '/widgets', theme: 'light', wait: 'widgets-screen' },
  { file: '04-year', path: '/year', theme: 'light', wait: 'year-screen' },
  { file: '05-trades', path: '/trades', theme: 'light', wait: 'trades-screen' },
  { file: '06-pay', path: '/pay', theme: 'light', wait: 'pay-screen' },
  { file: '07-dark-month', path: '/calendar', theme: 'dark', wait: 'calendar-screen', settings: { overlayProfileIds: ['p_partner'] } },
  { file: '08-pro', path: '/pro?reason=general', theme: 'dark', wait: 'pro-screen', pro: false },
  { file: '09-setup', path: '/', theme: 'light', wait: 'onboarding', fresh: true },
];

function storage(shot) {
  const s = settings(shot.theme, shot.settings);
  return {
    'rotawise:profiles': JSON.stringify({ me, p_partner: partner }),
    'rotawise:overrides': JSON.stringify(Object.fromEntries(overrides.map((x) => [x.id, x]))),
    'rotawise:kv': JSON.stringify({ settings: s, meta: { isPro: shot.pro !== false, installedAt: '2027-01-01T00:00:00.000Z' } }),
  };
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start at ${url}`);
}

const server = spawn(process.execPath, [join(root, 'scripts', 'serve-dist.mjs'), String(PORT)], { stdio: 'inherit' });
try {
  await waitForServer(BASE);
  const browser = await chromium.launch();
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
  for (const device of DEVICES.filter((d) => !only || d.name === only)) {
    const dir = join(root, 'store', 'screenshots', device.name);
    mkdirSync(dir, { recursive: true });
    for (const shot of SHOTS) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.scale,
        isMobile: device.width < 700,
        hasTouch: true,
        colorScheme: shot.theme,
      });
      const page = await context.newPage();
      await page.clock.setFixedTime(NOW);
      const store = device.name.startsWith('android') ? 'google' : 'apple';
      await page.addInitScript((s) => {
        window.__ROTAWISE_STORE_PREVIEW__ = { priceString: '$4.99', store: s };
      }, store);
      if (!shot.fresh) {
        await page.addInitScript((entries) => {
          for (const [k, v] of Object.entries(entries)) window.localStorage.setItem(k, v);
        }, storage(shot));
      }
      await page.goto(`${BASE}${shot.path}`);
      await page.getByTestId(shot.wait).waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(dir, `${shot.file}.png`), fullPage: false });
      await context.close();
      console.log(`${device.name}/${shot.file}.png (${device.note})`);
    }
  }
  await browser.close();
} finally {
  server.kill();
}
