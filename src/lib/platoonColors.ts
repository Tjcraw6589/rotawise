import type { Platoon } from './rotation/index.ts';

/**
 * Platoon colors from the Okabe and Ito palette, darkened where needed so the letter on
 * top keeps at least 4.5:1 contrast. They stay distinct for the common kinds of color
 * blindness, and every platoon is ALWAYS shown with its letter so color is never the
 * only signal.
 */
export const PLATOON_COLORS: Record<Platoon, { fill: string; text: string; name: string }> = {
  A: { fill: '#C24E00', text: '#FFFFFF', name: 'Vermilion' },
  B: { fill: '#0067A3', text: '#FFFFFF', name: 'Blue' },
  C: { fill: '#007559', text: '#FFFFFF', name: 'Bluish green' },
  D: { fill: '#E69F00', text: '#000000', name: 'Orange' },
};

/** WCAG relative luminance of a #RRGGBB color. */
export function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
