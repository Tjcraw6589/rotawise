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
import { Stepper } from '@/components/Stepper';
import { useActiveProfile, useNow, useProfileOverrides } from '@/hooks/useData';
import { formatHours, formatNumber } from '@/lib/format';
import { defaultShiftHours } from '@/lib/model';
import { leaveBalances } from '@/lib/rotation';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function LeaveScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const now = useNow();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const allowance = useStore((s) => s.settings.leave);
  const updateSettings = useStore((s) => s.updateSettings);
  const year = Number(now.date.slice(0, 4));
  const leave = useMemo(() => overrides.filter((o) => o.kind === 'leave'), [overrides]);
  const b = leaveBalances(leave, year, allowance, defaultShiftHours(profile));

  const tile = (label: string, left: number, used: string, hours: boolean, testID: string) => (
    <Card style={styles.tile} testID={testID}>
      <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
        {label} left
      </AppText>
      <AppText variant="h2" maxFontSizeMultiplier={1.3} style={{ color: left < 0 ? colors.danger : colors.text }}>
        {hours ? formatHours(left) : `${formatNumber(left)} ${Math.abs(left) === 1 ? 'day' : 'days'}`}
      </AppText>
      <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
        {used} used
      </AppText>
    </Card>
  );

  return (
    <Screen scroll testID="leave-screen">
      <Header title="Leave balances" dismiss="back" />
      <AppText variant="caption" tone="muted">
        Balances for {year}. Logging leave on a work day also takes it off your calendar.
      </AppText>
      <View style={[styles.tiles, { marginTop: spacing.md }]}>
        {tile('Vacation', b.vacationLeft, formatHours(b.vacationUsed), true, 'leave-vacation')}
        {tile('Sick', b.sickLeft, formatHours(b.sickUsed), true, 'leave-sick')}
        {tile('Kelly days', b.kellyLeft, `${formatNumber(b.kellyUsed)} ${b.kellyUsed === 1 ? 'day' : 'days'}`, false, 'leave-kelly')}
      </View>
      <Button label="Log leave" fullWidth onPress={() => router.push({ pathname: '/entry', params: { kind: 'leave', date: now.date } })} style={{ marginTop: spacing.lg }} testID="leave-add" />

      <SectionHeader title={`Allowance for ${year}`} />
      <Stepper label="Vacation hours" value={allowance.vacationHours} step={12} min={0} max={1000} onChange={(n) => updateSettings({ leave: { ...allowance, vacationHours: n } })} testID="allow-vacation" />
      <Stepper label="Sick hours" value={allowance.sickHours} step={12} min={0} max={1000} onChange={(n) => updateSettings({ leave: { ...allowance, sickHours: n } })} testID="allow-sick" />
      <Stepper label="Kelly days" value={allowance.kellyDays} min={0} max={60} onChange={(n) => updateSettings({ leave: { ...allowance, kellyDays: n } })} testID="allow-kelly" />

      <SectionHeader title="Entries" />
      <EntryList entries={leave} empty="No leave logged yet." testID="leave-list" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 12 },
});
