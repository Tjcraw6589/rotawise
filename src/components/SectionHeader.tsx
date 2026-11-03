import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  right?: ReactNode;
  first?: boolean;
  /** Small gray heading lined up with the rows of a grouped list, like the iPhone Settings app. */
  inset?: boolean;
}

export function SectionHeader({ title, right, first = false, inset = false }: SectionHeaderProps) {
  const { spacing } = useTheme();
  if (inset) {
    return (
      <View style={[styles.row, { marginTop: first ? spacing.sm : spacing.xl, marginBottom: spacing.xs, paddingHorizontal: spacing.lg }]}>
        <AppText variant="caption" tone="muted" accessibilityRole="header" style={styles.inset}>
          {title}
        </AppText>
        {right}
      </View>
    );
  }
  return (
    <View style={[styles.row, { marginTop: first ? spacing.sm : spacing.xl, marginBottom: spacing.sm }]}>
      <AppText variant="h3" accessibilityRole="header">
        {title}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inset: { textTransform: 'uppercase', letterSpacing: 0.4 },
});
