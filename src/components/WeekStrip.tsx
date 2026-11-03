import { StyleSheet, View } from 'react-native';

import type { Profile } from '@/lib/model';
import type { Override } from '@/lib/rotation';
import { WEEKDAY_SHORT, localISO, summarizeDays, weekday } from '@/lib/rotation';
import { dayCellLabel } from '@/lib/widgetSnapshot';
import { PLATOON_COLORS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface WeekStripProps {
  profile: Profile;
  overrides: readonly Override[];
  from: string;
  days?: number;
  /** Highlighted with a border; defaults to the device's date. */
  today?: string;
}

const CODE_NAMES: Record<string, string> = { K: 'Kelly day', T: 'traded away', V: 'vacation', S: 'sick', L: 'leave', OT: 'extra shift', 'T+': 'trade shift' };

/** The next days as tall, tappable sized columns with the platoon letter on work days. */
export function WeekStrip({ profile, overrides, from, days = 7, today = localISO() }: WeekStripProps) {
  const { colors, radius, spacing } = useTheme();
  const list = summarizeDays(profile.rotation, profile.platoon, from, days, overrides);
  const pc = PLATOON_COLORS[profile.platoon];
  return (
    <View style={styles.row} testID="week-strip">
      {list.map((d) => {
        const label = d.on || d.code ? dayCellLabel(profile.platoon, d.on, d.code) : 'Off';
        return (
          <View
            key={d.date}
            accessible
            accessibilityLabel={`${WEEKDAY_SHORT[weekday(d.date)]} ${Number(d.date.slice(8))}: ${d.on ? `on, platoon ${profile.platoon}` : CODE_NAMES[d.code] ?? 'off'}`}
            style={[
              styles.day,
              {
                borderRadius: radius.md,
                backgroundColor: d.on ? pc.fill : colors.surface,
                borderColor: d.date === today ? colors.text : colors.border,
                borderWidth: d.date === today ? 2 : StyleSheet.hairlineWidth,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <AppText variant="small" style={{ color: d.on ? pc.text : colors.textMuted }}>
              {WEEKDAY_SHORT[weekday(d.date)]}
            </AppText>
            <AppText variant="bodyBold" style={{ color: d.on ? pc.text : colors.text }}>
              {Number(d.date.slice(8))}
            </AppText>
            <AppText variant="small" style={{ color: d.on ? pc.text : colors.textMuted, fontWeight: '800' }} numberOfLines={1}>
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', minHeight: 72, justifyContent: 'space-between' },
});
