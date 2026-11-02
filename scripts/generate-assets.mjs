// Generates every image the app, stores and site need from one vector design:
// app icon, Android adaptive icon layers, splash (light and dark), favicon, widget
// previews for the Android widget picker, and the site's icons.
// Run: npm run assets
import { Buffer } from 'node:buffer';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
const site = join(root, 'site', 'static');
mkdirSync(out, { recursive: true });
mkdirSync(site, { recursive: true });

const NAVY = '#0B2A45';
const BLUE = '#005A8C';
const LIGHT_BG = '#F4F6F8';
const DARK_BG = '#0B1118';
// Okabe and Ito platoon colors (A, B, C, D).
const PA = '#E2611A';
const PB = '#56B4E9';
const PC = '#19B38A';
const PD = '#F0B429';

/** Point on a circle centred at 500,500. Angle 0 is 12 o'clock, clockwise. */
function pt(r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [500 + r * Math.cos(a), 500 + r * Math.sin(a)];
}

/** A thick arc from a to b degrees, ending in an arrowhead that points along the circle. */
function arcArrow(color, a, b, r = 300, w = 92) {
  const end = b - 12;
  const [x1, y1] = pt(r, a);
  const [x2, y2] = pt(r, end);
  const large = end - a > 180 ? 1 : 0;
  // Clockwise tangent at the arc end.
  const t = (end * Math.PI) / 180;
  const [tx, ty] = [Math.cos(t), Math.sin(t)];
  const outer = pt(r + w * 0.85, end);
  const inner = pt(r - w * 0.85, end);
  const tip = [x2 + tx * w * 1.15, y2 + ty * w * 1.15];
  return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="butt"/>
  <path d="M ${outer[0]} ${outer[1]} L ${tip[0]} ${tip[1]} L ${inner[0]} ${inner[1]} Z" fill="${color}"/>`;
}

/** The Rotawise mark: three platoon arrows chasing each other round a day dot. */
function mark(scale = 1, mono = null) {
  const c = (x) => mono ?? x;
  const body = `${arcArrow(c(PA), 8, 112)}${arcArrow(c(PB), 128, 232)}${arcArrow(c(PC), 248, 352)}
  <circle cx="500" cy="500" r="118" fill="${mono ?? '#FFFFFF'}"/>`;
  return `<g transform="translate(500 500) scale(${scale}) translate(-500 -500)">${body}</g>`;
}

const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${NAVY}"/></linearGradient></defs>`;

function svg(size, body, background = 'none') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">${defs}
  ${background === 'none' ? '' : `<rect width="1000" height="1000" fill="${background}"/>`}${body}</svg>`;
}

async function render(file, size, body, background = 'none') {
  await sharp(Buffer.from(svg(size, body, background))).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(file.replace(root, '.'));
}

// App icon (iOS needs no transparency; the store icon is the same 1024 image).
await render(join(out, 'icon.png'), 1024, mark(0.92), 'url(#g)');
// Android adaptive icon: background layer, foreground mark inside the safe 66%, themed monochrome.
await render(join(out, 'android-icon-background.png'), 1024, '', 'url(#g)');
await render(join(out, 'android-icon-foreground.png'), 1024, mark(0.6));
await render(join(out, 'android-icon-monochrome.png'), 1024, mark(0.6, '#FFFFFF'));
// Splash marks (the splash background color comes from app.json).
await render(join(out, 'splash-icon.png'), 512, mark(0.95));
await render(join(out, 'splash-icon-dark.png'), 512, mark(0.95));
// Favicon and site icons.
await render(join(out, 'favicon.png'), 64, mark(0.95), 'url(#g)');
await render(join(site, 'icon-192.png'), 192, mark(0.92), 'url(#g)');
await render(join(site, 'icon-512.png'), 512, mark(0.92), 'url(#g)');
await render(join(site, 'favicon.png'), 64, mark(0.95), 'url(#g)');

// Android widget picker previews: simple drawings of the two widgets.
function widgetPreview(width, height, week) {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const on = [true, false, false, true, false, false, true];
  const cells = week
    ? days
        .map((d, i) => {
          const x = 30 + i * ((width - 60) / 7);
          return `<text x="${x + 22}" y="${height - 70}" font-size="20" fill="#4F5D6B" text-anchor="middle" font-family="Arial">${d}</text>
          <rect x="${x + 4}" y="${height - 56}" width="36" height="30" rx="8" fill="${on[i] ? '#C24E00' : '#E9EDF1'}"/>
          <text x="${x + 22}" y="${height - 34}" font-size="16" font-weight="700" fill="${on[i] ? '#FFFFFF' : '#4F5D6B'}" text-anchor="middle" font-family="Arial">${on[i] ? 'A' : 'off'}</text>`;
        })
        .join('')
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" rx="36" fill="#FFFFFF"/>
  <text x="28" y="48" font-size="${week ? 30 : 22}" font-weight="700" fill="#0F7A3F" font-family="Arial">${week ? 'Today: ON' : 'Mon, Jan 4'}</text>
  <rect x="${width - 70}" y="22" width="44" height="34" rx="9" fill="#C24E00"/>
  <text x="${width - 48}" y="48" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle" font-family="Arial">A</text>
  ${week ? `<text x="28" y="88" font-size="20" fill="#4F5D6B" font-family="Arial">24 hour tour until 7 AM tomorrow</text>${cells}` : `<text x="28" y="${height / 2 + 30}" font-size="72" font-weight="900" fill="#0F7A3F" font-family="Arial">ON</text><text x="28" y="${height - 34}" font-size="20" fill="#0E1621" font-family="Arial">Until 7 AM tomorrow</text>`}
</svg>`;
}
await sharp(Buffer.from(widgetPreview(320, 320, false))).png().toFile(join(out, 'widget-preview-today.png'));
await sharp(Buffer.from(widgetPreview(640, 300, true))).png().toFile(join(out, 'widget-preview-week.png'));
console.log('./assets/widget-preview-today.png\n./assets/widget-preview-week.png');
console.log(`Backgrounds: light ${LIGHT_BG}, dark ${DARK_BG}. Platoon D accent ${PD} is unused in the mark on purpose (three arrows read better).`);

// Google Play feature graphic, 1024 x 500.
mkdirSync(join(root, 'store'), { recursive: true });
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">${defs}
<rect width="1024" height="500" fill="url(#g)"/>
<g transform="translate(40 50) scale(0.4)">${mark(1)}</g>
<text x="470" y="200" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="#FFFFFF">Rotawise</text>
<text x="472" y="260" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#DCEBF5">Your rotation, on your home screen.</text>
<text x="472" y="305" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#F0B429">Pay once. Never a subscription.</text>
</svg>`;
await sharp(Buffer.from(feature)).png().toFile(join(root, 'store', 'feature-graphic.png'));
console.log('./store/feature-graphic.png');
