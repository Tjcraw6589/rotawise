import type { Platoon, PresetId, Rotation } from '@/lib/rotation';
import { PLATOONS, rotationFromPreset } from '@/lib/rotation';

export const ALL_PRESETS: Exclude<PresetId, 'custom'>[] = ['24-48', '48-96', '24-72', 'kelly', 'pitman', 'dupont', '2-2-3', '4-on-4-off', '3-twelves'];

/** Independent oracle: whole days between two ISO dates using JS Date in UTC. */
export function utcDays(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = to.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Independent oracle for consecutive ISO dates. */
export function utcDateList(from: string, count: number): string[] {
  const [y, m, d] = from.split('-').map(Number) as [number, number, number];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(Date.UTC(y, m - 1, d + i));
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
}

export function platoonsOf(rotation: Rotation): Platoon[] {
  return PLATOONS.slice(0, rotation.platoonCount);
}

/** Preset with Kelly days turned off, for pure pattern checks. */
export function plain(id: Exclude<PresetId, 'custom'>, anchor: string): Rotation {
  return rotationFromPreset(id, anchor, null);
}
