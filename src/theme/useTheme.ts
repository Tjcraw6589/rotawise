import { useColorScheme } from 'react-native';

import { useStore } from '@/store/useStore';

import { colorsFor, radius, spacing, type ThemeColors, typography } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export function useTheme(): Theme {
  const preference = useStore((s) => s.settings.theme);
  // Pro themes fall back to the default palette if Pro is ever lost.
  const palette = useStore((s) => (s.meta.isPro ? s.settings.palette : 'station'));
  const system = useColorScheme();
  const scheme: 'light' | 'dark' = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return { scheme, colors: colorsFor(scheme, palette), spacing, radius, typography };
}
