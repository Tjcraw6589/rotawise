import { StyleSheet, View } from 'react-native';

import type { Profile } from '@/lib/model';
import type { Override } from '@/lib/rotation';
import { formatLongDate, presetInfo, todayCard } from '@/lib/rotation';
import { PLATOON_COLORS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { PlatoonBadge } from './PlatoonBadge';

interface TodayCardProps {
  profile: Profile;
  overrides: readonly Override[];
  date: string;
  minutes: number;
  formatTime: (m: number) => string;
}

/** The big, readable at a glance answer: are you on or off, and when is the next shift. */
export function TodayCard({ profile, overrides, date, minutes, formatTime }: TodayCardProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const card = todayCard(profile.rotation, profile.platoon, date, minutes, overrides, formatTime);
  const platoonColor = PLATOON_COLORS[profile.platoon];
  const rotationName = profile.rotation.presetId === 'custom' ? 'Custom pattern' : presetInfo(profile.rotation.presetId).name;
  const bg = card.on ? platoonColor.fill : colors.surface;
  const fg = card.on ? platoonColor.text : colors.text;
  return (
    <View
      testID="today-card"
      accessible
      accessibilityLabel={`${formatLongDate(date)}. ${card.headline}. ${card.detail}. Platoon ${profile.platoon}.`}
      style={[styles.card, { backgroundColor: bg, borderRadius: radius.xl, padding: spacing.xl, borderColor: card.on ? bg : colors.border }]}
    >
      <View style={styles.top}>
        <AppText variant="bodyBold" style={{ color: fg, opacity: 0.9 }}>
          Today, {formatLongDate(date)}
        </AppText>
        <PlatoonBadge platoon={profile.platoon} size={34} style={card.on ? { borderWidth: 2, borderColor: platoonColor.text } : undefined} />
      </View>
      <AppText testID="today-status" style={[typography.hero, { color: fg, marginTop: spacing.md }]}>
        {card.headline}
      </AppText>
      <AppText testID="today-detail" variant="h3" style={{ color: fg, marginTop: spacing.xs }}>
        {card.detail}
      </AppText>
      <AppText variant="caption" style={{ color: fg, opacity: 0.85, marginTop: spacing.md }}>
        {profile.platoon} platoon on {rotationName}
        {profile.name !== 'Me' ? `, ${profile.name}` : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
