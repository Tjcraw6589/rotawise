import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { useMoney } from '@/hooks/useCurrency';
import { useActiveProfile, useNow, useProfileOverrides } from '@/hooks/useData';
import { formatHours, parseAmount } from '@/lib/format';
import { defaultPaySettings } from '@/lib/model';
import type { PayPeriodKind, PaySettings } from '@/lib/rotation';
import { addDays, effectiveShifts, estimateGross, formatShortDate, payPeriods } from '@/lib/rotation';
import { successHaptic } from '@/services/haptics';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function PayScreen() {
  const { spacing } = useTheme();
  const now = useNow();
  const money = useMoney();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const saved = useStore((s) => s.settings.pay);
  const updateSettings = useStore((s) => s.updateSettings);
  const [pay, setPay] = useState<PaySettings>(() => saved ?? defaultPaySettings(now.date));
  const [rateText, setRateText] = useState(() => (saved && saved.hourlyRate > 0 ? String(saved.hourlyRate) : ''));
  const set = (patch: Partial<PaySettings>) => setPay((p) => ({ ...p, ...patch }));
  const dirty = JSON.stringify(pay) !== JSON.stringify(saved);

  const upcoming = useMemo(() => {
    const periods = payPeriods(pay, now.date, addDays(now.date, 70)).slice(0, 4);
    return periods.map((p) => ({ period: p, estimate: estimateGross(effectiveShifts(profile.rotation, profile.platoon, p.start, p.end, overrides), p, pay) }));
  }, [pay, now.date, profile, overrides]);

  return (
    <Screen scroll testID="pay-screen">
      <Header title="Pay and paydays" dismiss="back" />
      <AppText variant="caption" tone="muted">
        Estimates are before taxes and deductions, from your scheduled hours, trades, leave and logged overtime.
      </AppText>

      <SectionHeader title="Pay period" />
      <SegmentedControl
        options={[
          { key: 'weekly', label: 'Weekly' },
          { key: 'biweekly', label: 'Biweekly' },
          { key: 'semimonthly', label: 'Twice a month' },
          { key: 'custom', label: 'Custom' },
        ]}
        value={pay.kind === 'monthly' ? 'custom' : pay.kind}
        onChange={(k: PayPeriodKind) => set({ kind: k, regularHoursPerPeriod: k === 'weekly' ? 53 : k === 'custom' ? 212 : 106, customLengthDays: k === 'custom' ? 28 : pay.customLengthDays })}
        testID="pay-kind"
      />
      <View style={{ height: spacing.lg }} />
      {pay.kind !== 'semimonthly' && pay.kind !== 'monthly' ? (
        <DateField label="First day of any pay period" value={pay.anchorStart} onChange={(d) => set({ anchorStart: d })} testID="pay-anchor" />
      ) : null}
      {pay.kind === 'custom' ? <Stepper label="Days in a period" value={pay.customLengthDays ?? 28} min={1} max={62} onChange={(n) => set({ customLengthDays: n })} testID="pay-length" /> : null}
      <Stepper
        label="Paid after period ends"
        value={pay.paydayOffsetDays}
        display={pay.paydayOffsetDays === 0 ? 'Same day' : `${pay.paydayOffsetDays} ${pay.paydayOffsetDays === 1 ? 'day' : 'days'}`}
        min={0}
        max={30}
        onChange={(n) => set({ paydayOffsetDays: n })}
        testID="pay-offset"
      />

      <SectionHeader title="Rates" />
      <TextField
        label="Hourly rate"
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={rateText}
        onChangeText={(t) => {
          setRateText(t);
          set({ hourlyRate: parseAmount(t) ?? 0 });
        }}
        testID="pay-rate"
      />
      <Stepper label="Straight time hours per period" value={pay.regularHoursPerPeriod} display={formatHours(pay.regularHoursPerPeriod)} min={1} max={400} onChange={(n) => set({ regularHoursPerPeriod: n })} testID="pay-regular" />
      <AppText variant="caption" tone="muted" style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>
        Hours paid at your normal rate before overtime starts. Firefighters on a 14 day period often use 106; most others use 80 for two weeks or 40 for one.
      </AppText>
      <Stepper label="Overtime multiplier" value={pay.otMultiplier} display={`${pay.otMultiplier.toFixed(2)}x`} step={0.25} min={1} max={3} onChange={(n) => set({ otMultiplier: n })} testID="pay-ot" />
      <Button
        label={dirty ? 'Save pay settings' : 'Saved'}
        fullWidth
        disabled={!dirty}
        onPress={() => {
          updateSettings({ pay });
          successHaptic();
        }}
        testID="pay-save"
      />

      <SectionHeader title="Coming paydays" />
      {upcoming.map(({ period, estimate }, i) => (
        <Card key={period.start} style={{ marginBottom: spacing.sm }} testID={`pay-period-${i}`}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="bodyBold">Payday {formatShortDate(period.payday)}</AppText>
              <AppText variant="caption" tone="muted">
                {formatShortDate(period.start)} to {formatShortDate(period.end)}: {formatHours(estimate.regularHours)} straight, {formatHours(estimate.overtimeHours)} overtime
              </AppText>
            </View>
            <AppText variant="h3" testID={`pay-gross-${i}`}>
              {pay.hourlyRate > 0 ? money(estimate.gross) : 'Add a rate'}
            </AppText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
