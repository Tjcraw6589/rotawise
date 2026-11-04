import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/AppText';
import { DaySheet } from '@/components/DaySheet';
import { Header } from '@/components/Header';
import { MonthCalendar, type OverlayLayer } from '@/components/MonthCalendar';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useActiveProfile, useNow, useProfileOverrides } from '@/hooks/useData';
import { formatHours, formatNumber } from '@/lib/format';
import { shiftWord } from '@/lib/model';
import { MONTH_NAMES, monthTotals, parseISO } from '@/lib/rotation';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();
  const now = useNow();
  const params = useLocalSearchParams<{ y?: string; m?: string }>();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const showAll = useStore((s) => s.settings.showAllPlatoons);
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);
  const updateSettings = useStore((s) => s.updateSettings);
  const isPro = useStore((s) => s.meta.isPro);
  const profiles = useStore((s) => s.profiles);
  const overlayIds = useStore((s) => s.settings.overlayProfileIds);
  const allOverrides = useStore((s) => s.overrides);
  const t = parseISO(now.date);
  const [cursor, setCursor] = useState(() => ({ year: Number(params.y) || t.year, month: Number(params.m) || t.month }));
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  // Opening from the year view passes the month in the route.
  const [lastParams, setLastParams] = useState(`${params.y}-${params.m}`);
  if (`${params.y}-${params.m}` !== lastParams) {
    setLastParams(`${params.y}-${params.m}`);
    if (params.y && params.m) setCursor({ year: Number(params.y), month: Number(params.m) });
  }

  const overlays: OverlayLayer[] = useMemo(
    () =>
      isPro
        ? profiles
            .filter((p) => overlayIds.includes(p.id) && p.id !== profile.id)
            .map((p) => ({ profile: p, overrides: allOverrides.filter((o) => o.profileId === p.id) }))
        : [],
    [isPro, profiles, overlayIds, profile.id, allOverrides],
  );
  const totals = monthTotals(profile.rotation, profile.platoon, cursor.year, cursor.month, overrides);
  const move = (delta: number) => {
    const total = cursor.year * 12 + cursor.month - 1 + delta;
    setCursor({ year: Math.floor(total / 12), month: (total % 12) + 1 });
  };
  const isCurrent = cursor.year === t.year && cursor.month === t.month;

  return (
    <Screen scroll testID="calendar-screen">
      <Header title="Month" large />
      <View style={[styles.nav, { marginBottom: spacing.md }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} hitSlop={8} style={styles.navBtn} testID="month-prev">
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to this month" onPress={() => setCursor({ year: t.year, month: t.month })} style={styles.title}>
          <AppText variant="h2" align="center" testID="month-title">
            {MONTH_NAMES[cursor.month - 1]} {cursor.year}
          </AppText>
          {!isCurrent ? (
            <AppText variant="small" tone="primary" align="center">
              Tap for this month
            </AppText>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} hitSlop={8} style={styles.navBtn} testID="month-next">
          <Ionicons name="chevron-forward" size={28} color={colors.text} />
        </Pressable>
      </View>
      <SegmentedControl
        options={[
          { key: 'mine', label: `My platoon (${profile.platoon})` },
          { key: 'all', label: 'All platoons' },
        ]}
        value={showAll ? 'all' : 'mine'}
        onChange={(k) => updateSettings({ showAllPlatoons: k === 'all' })}
        testID="platoon-filter"
      />
      <View style={{ height: spacing.md }} />
      <MonthCalendar
        year={cursor.year}
        month={cursor.month}
        profile={profile}
        overrides={overrides}
        showAll={showAll}
        overlays={overlays}
        weekStartsOn={weekStartsOn}
        today={now.date}
        onDayPress={setDayOpen}
      />
      <AppText variant="bodyBold" style={{ marginTop: spacing.lg }} testID="month-totals">
        {formatNumber(totals.shifts)} {shiftWord(profile.rotation, totals.shifts)}, {formatHours(totals.hours)}
      </AppText>
      <DaySheet date={dayOpen} profile={profile} overrides={overrides} onClose={() => setDayOpen(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
