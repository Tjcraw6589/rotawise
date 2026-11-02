import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { PlatoonBadge } from '@/components/PlatoonBadge';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { TodayCard } from '@/components/TodayCard';
import { WeekStrip } from '@/components/WeekStrip';
import { useMoney } from '@/hooks/useCurrency';
import { useActiveProfile, useNow, useProGate, useProfileOverrides, useTimeFormat } from '@/hooks/useData';
import { formatHours } from '@/lib/format';
import { defaultShiftHours } from '@/lib/model';
import { addDays, currentPayPeriod, effectiveShifts, estimateGross, formatShortDate, nextPayday, payPeriods, todayCard, tradeBalances } from '@/lib/rotation';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function TodayScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const now = useNow();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const formatTime = useTimeFormat();
  const money = useMoney();
  const { isPro, requirePro } = useProGate();
  const pay = useStore((s) => s.settings.pay);
  const profiles = useStore((s) => s.profiles);
  const allOverrides = useStore((s) => s.overrides);

  const payInfo = useMemo(() => {
    if (!isPro || !pay || pay.hourlyRate <= 0) return null;
    const payday = nextPayday(pay, now.date);
    const period = payPeriods(pay, addDays(payday, -62), payday).find((p) => p.payday === payday) ?? currentPayPeriod(pay, now.date);
    const shifts = effectiveShifts(profile.rotation, profile.platoon, period.start, period.end, overrides);
    return { payday, gross: estimateGross(shifts, period, pay).gross };
  }, [isPro, pay, now.date, profile, overrides]);

  const owed = useMemo(() => (isPro ? tradeBalances(overrides, defaultShiftHours(profile)) : []), [isPro, overrides, profile]);
  const others = profiles.filter((p) => p.id !== profile.id);

  const log = (kind: 'trade' | 'extra' | 'leave') => {
    const reason = kind === 'trade' ? 'trades' : kind === 'extra' ? 'overtime' : 'leave';
    if (requirePro(reason)) router.push({ pathname: '/entry', params: { kind, date: now.date } });
  };

  return (
    <Screen scroll testID="today-screen">
      <Header title="Today" large />
      <TodayCard profile={profile} overrides={overrides} date={now.date} minutes={now.minutes} formatTime={formatTime} />

      <SectionHeader title="Next 7 days" />
      <WeekStrip profile={profile} overrides={overrides} from={now.date} />

      {others.length > 0 ? (
        <>
          <SectionHeader title="Other rotations" />
          <Card padded={false}>
            {others.map((o, i) => {
              const card = todayCard(
                o.rotation,
                o.platoon,
                now.date,
                now.minutes,
                allOverrides.filter((x) => x.profileId === o.id),
                formatTime,
              );
              return (
                <View key={o.id} style={[styles.otherRow, { padding: spacing.md }, i < others.length - 1 && styles.divider]}>
                  <View style={[styles.dot, { backgroundColor: o.color }]} />
                  <View style={styles.flex}>
                    <AppText variant="bodyBold">{o.name}</AppText>
                    <AppText variant="caption" tone="muted">
                      {card.on ? 'On now' : 'Off now'}. {card.detail}
                    </AppText>
                  </View>
                  <PlatoonBadge platoon={o.platoon} size={26} />
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Log something" />
      <View style={styles.actions}>
        <Button label="Trade" variant="secondary" onPress={() => log('trade')} style={styles.action} testID="log-trade" />
        <Button label="Overtime" variant="secondary" onPress={() => log('extra')} style={styles.action} testID="log-extra" />
        <Button label="Leave" variant="secondary" onPress={() => log('leave')} style={styles.action} testID="log-leave" />
      </View>

      {payInfo ? (
        <Card style={{ marginTop: spacing.lg }} onPress={() => router.push('/pay')} testID="today-pay">
          <AppText variant="caption" tone="muted">
            Next payday, {formatShortDate(payInfo.payday)}
          </AppText>
          <AppText variant="money">{money(payInfo.gross)}</AppText>
          <AppText variant="caption" tone="muted">
            Estimated gross pay
          </AppText>
        </Card>
      ) : null}

      {owed.length > 0 ? (
        <Card style={{ marginTop: spacing.lg }} onPress={() => router.push('/trades')} testID="today-trades">
          <AppText variant="bodyBold">Open trades</AppText>
          {owed.map((b) => (
            <AppText key={b.counterpart} variant="caption" tone="muted">
              {b.hours > 0 ? `${b.counterpart} owes you ${formatHours(b.hours)}` : b.hours < 0 ? `You owe ${b.counterpart} ${formatHours(-b.hours)}` : `Even with ${b.counterpart}`}
            </AppText>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignSelf: 'stretch' },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#8883' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
});
