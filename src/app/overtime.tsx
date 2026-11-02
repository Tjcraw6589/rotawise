import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EntryList } from '@/components/EntryList';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useActiveProfile, useNow, useProfileOverrides } from '@/hooks/useData';
import { formatHours } from '@/lib/format';
import { currentPayPeriod, endOfMonth, extraHoursBetween, startOfMonth } from '@/lib/rotation';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function OvertimeScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const now = useNow();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const pay = useStore((s) => s.settings.pay);
  const extras = useMemo(() => overrides.filter((o) => o.kind === 'extra'), [overrides]);
  const year = now.date.slice(0, 4);
  const month = extraHoursBetween(extras, startOfMonth(now.date), endOfMonth(now.date));
  const ytd = extraHoursBetween(extras, `${year}-01-01`, `${year}-12-31`);
  const period = pay ? currentPayPeriod(pay, now.date) : null;
  const inPeriod = period ? extraHoursBetween(extras, period.start, period.end) : null;

  const tile = (label: string, hours: number, testID: string) => (
    <Card style={styles.tile} testID={testID}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="h2">{formatHours(hours)}</AppText>
    </Card>
  );

  return (
    <Screen scroll testID="overtime-screen">
      <Header title="Overtime" dismiss="back" />
      <View style={styles.tiles}>
        {tile('This month', month.hours, 'ot-month')}
        {tile(`In ${year}`, ytd.hours, 'ot-year')}
      </View>
      {inPeriod ? <View style={{ marginTop: spacing.sm }}>{tile('This pay period', inPeriod.hours, 'ot-period')}</View> : null}
      <Button label="Log overtime" fullWidth onPress={() => router.push({ pathname: '/entry', params: { kind: 'extra', date: now.date } })} style={{ marginTop: spacing.lg }} testID="ot-add" />
      <SectionHeader title="Entries" />
      <EntryList entries={extras} empty="No overtime logged yet." testID="ot-list" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1 },
});
