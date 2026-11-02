// Checks STORE_LISTING.md text against store limits and the no hyphen rule.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'STORE_LISTING.md'), 'utf8');

const row = (label) => {
  const line = md.split('\n').find((l) => l.startsWith(`| ${label} |`));
  if (!line) throw new Error(`Missing row: ${label}`);
  return line.split('|')[2].trim();
};
const block = (heading) => {
  const start = md.indexOf(heading);
  const open = md.indexOf('```', start);
  const close = md.indexOf('```', open + 3);
  return md.slice(md.indexOf('\n', open) + 1, close).trim();
};

const checks = [
  ['App Store name', row('App Store name'), 30],
  ['App Store subtitle', row('App Store subtitle'), 30],
  ['Google Play title', row('Google Play title'), 30],
  ['Google Play short description', row('Google Play short description'), 80],
  ['App Store promotional text', row('App Store promotional text'), 170],
  ['App Store keywords', block('## App Store keywords'), 100],
  ['Description', block('## Description'), 4000],
];

let failed = false;
for (const [name, text, limit] of checks) {
  const hyphen = /[A-Za-z0-9]-[A-Za-z0-9]|\s-\s|—|–/.test(text);
  const ok = text.length <= limit && !hyphen;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok ' : 'BAD'} ${name}: ${text.length}/${limit}${hyphen ? ' (has a hyphen)' : ''}`);
}
if (/\s/.test(block('## App Store keywords'))) {
  failed = true;
  console.log('BAD keywords contain spaces');
}
process.exit(failed ? 1 : 0);
