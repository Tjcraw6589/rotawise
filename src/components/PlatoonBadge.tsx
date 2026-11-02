import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { Platoon } from '@/lib/rotation';
import { PLATOON_COLORS } from '@/theme/tokens';

interface PlatoonBadgeProps {
  platoon: Platoon;
  size?: number;
  /** Extra text after the letter, e.g. a shift code. */
  suffix?: string;
  style?: ViewStyle;
  testID?: string;
}

/** A platoon is always its color AND its letter, so it reads for color blind users too. */
export function PlatoonBadge({ platoon, size = 28, suffix, style, testID }: PlatoonBadgeProps) {
  const c = PLATOON_COLORS[platoon];
  return (
    <View
      accessible
      accessibilityLabel={`Platoon ${platoon}${suffix ? `, ${suffix}` : ''}`}
      testID={testID}
      style={[styles.badge, { minWidth: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: c.fill, paddingHorizontal: suffix ? 6 : 0 }, style]}
    >
      <Text style={[styles.letter, { color: c.text, fontSize: Math.round(size * 0.55), lineHeight: Math.round(size * 0.7) }]}>
        {platoon}
        {suffix ? <Text style={{ fontSize: Math.round(size * 0.4) }}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '900', textAlign: 'center' },
});
