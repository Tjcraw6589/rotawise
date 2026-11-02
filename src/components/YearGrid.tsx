import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Profile } from '@/lib/model';
import type { Override, Platoon , DaySummary } from '@/lib/rotation';
import { MONTH_NAMES, isLeapYear, monthGrid, platoonsOn, summarizeDays, toISO } from '@/lib/rotation';
import { PLATOON_COLORS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface YearGridProps {
  year: number;
  profile: Profile;
  overrides: readonly Override[];
  showAll: boolean;
  weekStartsOn: 0 | 1;
  today: string;
  onMonthPress?: (month: number) => void;
}

/** Twelve mini months. Work days carry the platoon color and letter. */
export function YearGrid({ year, profile, overrides, showAll, weekStartsOn, today, onMonthPress }: YearGridProps) {
  const { colors, radius, spacing } = useTheme();
  const days = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const d of summarizeDays(profile.rotation, profile.platoon, toISO({ year, month: 1, day: 1 }), isLeapYear(year) ? 366 : 365, overrides)) map.set(d.date, d);
    return map;
  }, [profile, overrides, year]);
  const allOn = useMemo(() => {
    const map = new Map<string, Platoon>();
    if (!showAll) return map;
    for (const date of days.keys()) {
      const p = platoonsOn(profile.rotation, date)[0];
      if (p) map.set(date, p);
    }
    return map;
  }, [showAll, days, profile.rotation]);

  return (
    <View style={styles.grid} testID="year-grid">
      {MONTH_NAMES.map((name, mi) => {
        const weeks = monthGrid(year, mi + 1, weekStartsOn);
        const worked = [...days.values()].filter((d) => d.on && Number(d.date.slice(5, 7)) === mi + 1).length;
        return (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`${name} ${year}, ${worked} shifts. Open month`}
            onPress={onMonthPress ? () => onMonthPress(mi + 1) : undefined}
            testID={`year-month-${mi + 1}`}
            style={[styles.month, { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, padding: spacing.sm }]}
          >
            <View style={styles.monthHead}>
              <AppText variant="small">{name.slice(0, 3)}</AppText>
              <AppText variant="small" tone="muted">
                {worked}
              </AppText>
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.week}>
                {week.map((date, di) => {
                  if (!date) return <View key={di} style={styles.day} />;
                  const d = days.get(date);
                  const mineOn = d?.on ?? false;
                  const p: Platoon | undefined = mineOn ? profile.platoon : showAll ? allOn.get(date) : undefined;
                  const c = p ? PLATOON_COLORS[p] : null;
                  const isToday = date === today;
                  return (
                    <View key={date} style={styles.day}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: c ? c.fill : 'transparent',
                            opacity: c && !mineOn ? 0.55 : 1,
                            borderWidth: isToday ? 1.5 : 0,
                            borderColor: colors.text,
                          },
                        ]}
                      >
                        <AppText style={[styles.dotText, { color: c ? c.text : d?.code ? colors.text : colors.textFaint }]}>
                          {p ?? (d?.code || Number(date.slice(8)))}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  month: { width: '32.5%', borderWidth: StyleSheet.hairlineWidth },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  week: { flexDirection: 'row' },
  day: { flex: 1, aspectRatio: 1, padding: 0.5 },
  dot: { flex: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 7, fontWeight: '800', lineHeight: 9 },
});
