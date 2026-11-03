import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { selectionHaptic } from '@/services/haptics';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface StepperProps {
  label: string;
  value: number;
  display?: string;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  testID?: string;
}

/** Big minus and plus buttons around a value. Easier than typing with gloves on. */
export function Stepper({ label, value, display, onChange, step = 1, min = -Infinity, max = Infinity, testID }: StepperProps) {
  const { colors, radius, spacing } = useTheme();
  const set = (n: number) => {
    const next = Math.min(max, Math.max(min, n));
    if (next !== value) {
      selectionHaptic();
      onChange(next);
    }
  };
  return (
    <View style={[styles.row, { marginBottom: spacing.md }]} testID={testID}>
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        onPress={() => set(value - step)}
        disabled={value <= min}
        testID={testID ? `${testID}-minus` : undefined}
        style={[styles.btn, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, opacity: value <= min ? 0.4 : 1 }]}
      >
        <Ionicons name="remove" size={22} color={colors.text} />
      </Pressable>
      <AppText variant="bodyBold" style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} testID={testID ? `${testID}-value` : undefined} accessibilityLiveRegion="polite">
        {display ?? String(value)}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        onPress={() => set(value + step)}
        disabled={value >= max}
        testID={testID ? `${testID}-plus` : undefined}
        style={[styles.btn, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, opacity: value >= max ? 0.4 : 1 }]}
      >
        <Ionicons name="add" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  btn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  value: { width: 96, textAlign: 'center' },
});
