import type { PaletteId } from '@/lib/model';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  tabBar: string;
  input: string;
  pro: string;
  proSoft: string;
  on: string;
  onSoft: string;
}

// Rotawise: cool neutrals, a strong station blue, amber for Pro.
export const lightColors: ThemeColors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#E9EDF1',
  text: '#0E1621',
  textMuted: '#4F5D6B',
  textFaint: '#8693A0',
  border: '#D9E0E6',
  primary: '#005A8C',
  onPrimary: '#FFFFFF',
  primarySoft: '#DCEBF5',
  success: '#0F7A3F',
  successSoft: '#DCF3E5',
  warning: '#B4530A',
  warningSoft: '#FDEBD9',
  danger: '#C62828',
  dangerSoft: '#FCE4E4',
  overlay: 'rgba(14, 22, 33, 0.5)',
  tabBar: '#FFFFFF',
  input: '#FFFFFF',
  pro: '#A15C00',
  proSoft: '#FCEFD9',
  on: '#0F7A3F',
  onSoft: '#DCF3E5',
};

export const darkColors: ThemeColors = {
  background: '#0B1118',
  surface: '#141C25',
  surfaceAlt: '#1E2832',
  text: '#F2F5F8',
  textMuted: '#A9B5C1',
  textFaint: '#6E7C8A',
  border: '#27323D',
  primary: '#5FB4EE',
  onPrimary: '#0B1118',
  primarySoft: '#13324A',
  success: '#5BD38A',
  successSoft: '#123222',
  warning: '#F5B26B',
  warningSoft: '#3A2611',
  danger: '#FF7B7B',
  dangerSoft: '#3E1A1A',
  overlay: 'rgba(0, 0, 0, 0.65)',
  tabBar: '#10171F',
  input: '#18212B',
  pro: '#F5C06A',
  proSoft: '#3A2E12',
  on: '#5BD38A',
  onSoft: '#123222',
};

/** Pro themes swap the primary color. Each has a light and dark variant with readable contrast. */
export const PALETTES: Record<PaletteId, { name: string; light: string; lightSoft: string; dark: string; darkSoft: string }> = {
  station: { name: 'Station blue', light: '#005A8C', lightSoft: '#DCEBF5', dark: '#5FB4EE', darkSoft: '#13324A' },
  engine: { name: 'Engine red', light: '#B3261E', lightSoft: '#F9DEDC', dark: '#FF8A80', darkSoft: '#3E1916' },
  midnight: { name: 'Midnight', light: '#4B3FB5', lightSoft: '#E5E2FA', dark: '#A99CFF', darkSoft: '#26214A' },
  forest: { name: 'Forest', light: '#1B6B3A', lightSoft: '#DCEFE2', dark: '#6FD39A', darkSoft: '#123222' },
  graphite: { name: 'Graphite', light: '#37474F', lightSoft: '#E3E8EB', dark: '#B0BEC5', darkSoft: '#263238' },
};

export { PLATOON_COLORS } from '@/lib/platoonColors';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const typography = {
  hero: { fontSize: 44, fontWeight: '900', letterSpacing: -1, lineHeight: 50 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  small: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  money: { fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 38 },
} as const;

export type TypographyVariant = keyof typeof typography;

export function colorsFor(scheme: 'light' | 'dark', palette: PaletteId): ThemeColors {
  const base = scheme === 'dark' ? darkColors : lightColors;
  const p = PALETTES[palette] ?? PALETTES.station;
  return scheme === 'dark' ? { ...base, primary: p.dark, primarySoft: p.darkSoft } : { ...base, primary: p.light, primarySoft: p.lightSoft };
}
