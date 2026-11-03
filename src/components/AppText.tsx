import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import type { TypographyVariant } from '@/theme/tokens';

export type TextTone = 'text' | 'muted' | 'faint' | 'primary' | 'danger' | 'success' | 'warning' | 'onPrimary' | 'pro';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
}

/**
 * Text follows the phone's text size setting. Body text grows freely; headings that are
 * already big grow less, so the largest sizes stay readable instead of filling the screen.
 */
const MAX_SCALE: Partial<Record<TypographyVariant, number>> = { hero: 1.3, title: 1.5, money: 1.5, h2: 2 };

export function AppText({ variant = 'body', tone = 'text', align, style, maxFontSizeMultiplier, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  const color = {
    text: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
    onPrimary: colors.onPrimary,
    pro: colors.pro,
  }[tone];
  return <Text {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_SCALE[variant]} style={[typography[variant], { color, textAlign: align }, style]} />;
}
