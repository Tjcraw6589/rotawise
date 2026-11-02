import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { successHaptic } from '@/services/haptics';
import { billingStoreName, fetchProOffer, type ProOffer, purchasePro, purchasesSupported, restorePro, storeAccountName, usePurchasesStatus } from '@/services/purchases';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

const HEADLINES: Record<string, { title: string; body: string }> = {
  trades: { title: 'Keep track of every trade', body: 'Log who you traded with and when. Your calendar updates, and the ledger shows who owes whom.' },
  overtime: { title: 'Count every extra hour', body: 'Log overtime, callbacks and extra shifts, with totals for the month, the year and each pay period.' },
  pay: { title: 'Know your next paycheck', body: 'Weekly, biweekly, semimonthly or custom pay periods with estimated gross pay including overtime.' },
  leave: { title: 'Never lose track of leave', body: 'Vacation, sick and Kelly days with balances that update as you log them.' },
  export: { title: 'Let your family see your shifts', body: 'Send your shifts to Apple or Google Calendar and share that calendar with a partner.' },
  profiles: { title: 'Two rotations, one calendar', body: 'Add a second job or a partner and see both rotations overlaid in different colors.' },
  print: { title: 'Print the whole year', body: 'A one page year calendar as a PDF or an image, ready for the fridge or the station.' },
  themes: { title: 'Make it yours', body: 'Choose a color theme for the app.' },
  widgets: { title: 'Widgets your way', body: 'Pick the widget background: light, dark or your platoon color.' },
  general: { title: 'Rotawise Pro', body: 'Pay once. Yours forever. Never a subscription.' },
};

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'swap-horizontal', title: 'Trades and swaps ledger', body: 'Who owes whom, and the calendar follows.' },
  { icon: 'time', title: 'Overtime log', body: 'Extra shifts and callbacks with hour totals.' },
  { icon: 'cash', title: 'Pay periods and paydays', body: 'Estimated gross pay with your overtime rate.' },
  { icon: 'airplane', title: 'Vacation, sick and Kelly days', body: 'Balances that keep themselves up to date.' },
  { icon: 'share-social', title: 'Share with a calendar', body: 'Apple or Google Calendar, so a partner can see.' },
  { icon: 'people', title: 'More rotations', body: 'A second job or a partner, overlaid in color.' },
  { icon: 'print', title: 'Year PDF and image', body: 'Print or share the whole year.' },
  { icon: 'color-palette', title: 'Themes and widget colors', body: 'Make the app and widgets yours.' },
];

export default function ProScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const isPro = useStore((s) => s.meta.isPro);
  const setPro = useStore((s) => s.setPro);
  const storeStatus = usePurchasesStatus();
  const [offer, setOffer] = useState<ProOffer | null>(null);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'warning' | 'info'; text: string } | null>(null);
  const headline = HEADLINES[reason ?? 'general'] ?? HEADLINES.general!;

  useEffect(() => {
    let cancelled = false;
    if (storeStatus === 'ready') {
      void fetchProOffer().then((o) => {
        if (!cancelled) setOffer(o);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [storeStatus]);

  const buy = async () => {
    setBusy('buy');
    const outcome = await purchasePro();
    setBusy(null);
    if (outcome === 'purchased') {
      setPro(true);
      successHaptic();
      setMessage({ tone: 'success', text: 'Pro is unlocked for good. Thank you!' });
    } else if (outcome === 'cancelled') {
      setMessage({ tone: 'info', text: 'No problem. Everything in the free version keeps working.' });
    } else {
      setMessage({ tone: 'warning', text: 'The purchase could not be completed. You were not charged.' });
    }
  };

  const restore = async () => {
    setBusy('restore');
    const outcome = await restorePro();
    setBusy(null);
    if (outcome === 'restored') {
      setPro(true);
      successHaptic();
      setMessage({ tone: 'success', text: 'Pro restored. Thank you!' });
    } else if (outcome === 'none') {
      setMessage({ tone: 'info', text: 'No earlier Pro purchase was found for this store account.' });
    } else {
      setMessage({ tone: 'warning', text: 'The store could not be reached. Check your connection and try again.' });
    }
  };

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const storeReady = storeStatus === 'ready' && offer !== null;
  const unavailableText = !purchasesSupported
    ? 'Purchases work in the iPhone and Android apps. Everything in the free version works here.'
    : storeStatus === 'loading'
      ? 'Connecting to the store...'
      : 'The store is unavailable right now. The free version keeps working; try again later.';

  return (
    <Screen scroll edges={['top', 'bottom']} testID="pro-screen">
      <Header title="" dismiss="close" />
      <View style={styles.hero}>
        <View style={[styles.badge, { backgroundColor: colors.proSoft, borderRadius: radius.xl }]}>
          <Ionicons name="sparkles" size={44} color={colors.pro} />
        </View>
        <AppText variant="title" align="center" style={{ marginTop: spacing.lg }}>
          {headline.title}
        </AppText>
        <AppText variant="body" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
          {headline.body}
        </AppText>
        <View style={[styles.promise, { backgroundColor: colors.proSoft, borderRadius: radius.pill, marginTop: spacing.md }]}>
          <AppText variant="bodyBold" style={{ color: colors.pro }} testID="pro-promise">
            One time purchase. Never a subscription.
          </AppText>
        </View>
      </View>

      {message ? (
        <View style={{ marginTop: spacing.lg }}>
          <Notice tone={message.tone} message={message.text} testID="pro-message" />
        </View>
      ) : null}

      <Card style={{ marginTop: spacing.xl }} padded={false}>
        {FEATURES.map((f, i) => (
          <View
            key={f.title}
            style={[
              styles.feature,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
              i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: colors.proSoft, borderRadius: radius.md }]}>
              <Ionicons name={f.icon} size={20} color={colors.pro} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyBold">{f.title}</AppText>
              <AppText variant="caption" tone="muted">
                {f.body}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: spacing.xl }}>
        {isPro ? (
          <>
            <Notice tone="success" title="You have Pro" message="Every feature above is unlocked, for good." />
            <Button label="Done" fullWidth size="lg" onPress={dismiss} style={{ marginTop: spacing.lg }} testID="pro-done" />
          </>
        ) : (
          <>
            {!storeReady ? <Notice tone="info" message={unavailableText} testID="store-unavailable" /> : null}
            <Button
              label={storeReady ? `Unlock Pro for ${offer.priceString}` : 'Unlock Pro'}
              variant="pro"
              size="lg"
              fullWidth
              disabled={!storeReady}
              loading={busy === 'buy'}
              onPress={() => void buy()}
              style={{ marginTop: spacing.lg }}
              testID="pro-buy"
            />
            <AppText variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
              Pay once and keep Pro forever. No subscription, no renewals. Billed by {billingStoreName()}. Restore it on any device signed in to the same {storeAccountName()}.
            </AppText>
            <Button
              label="Restore purchases"
              variant="ghost"
              fullWidth
              disabled={storeStatus !== 'ready'}
              loading={busy === 'restore'}
              onPress={() => void restore()}
              style={{ marginTop: spacing.sm }}
              testID="pro-restore"
            />
            <Button label="Not now" variant="ghost" fullWidth onPress={dismiss} testID="pro-not-now" />
          </>
        )}
      </View>
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  badge: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  promise: { paddingHorizontal: 16, paddingVertical: 8 },
  feature: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  flex: { flex: 1 },
});
