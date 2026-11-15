import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { successHaptic } from '@/services/haptics';
import {
  billingStoreName,
  fetchProOffer,
  type ProOffer,
  purchasePro,
  purchasesSupported,
  refreshPurchases,
  restorePro,
  storeAccountName,
  usePurchasesStatus,
} from '@/services/purchases';
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
  general: { title: 'Rotawise Pro', body: 'Every Pro tool, yours forever.' },
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

/** iOS text sizes up to AX2 report a font scale below this; AX3 and larger are above it. */
const PIN_FOOTER_BELOW_FONT_SCALE = 2.2;

export default function ProScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const isPro = useStore((s) => s.meta.isPro);
  const setPro = useStore((s) => s.setPro);
  const storeStatus = usePurchasesStatus();
  const [offer, setOffer] = useState<ProOffer | null>(null);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'warning' | 'info'; text: string } | null>(null);
  const headline = HEADLINES[reason ?? 'general'] ?? HEADLINES.general!;
  const { fontScale } = useWindowDimensions();
  // At the largest accessibility text sizes a pinned footer would cover most of the screen, so it scrolls with the page instead.
  const pinFooter = fontScale < PIN_FOOTER_BELOW_FONT_SCALE;
  // A pending purchase can be approved later (Ask to Buy); once Pro arrives the old notice no longer applies.
  const shownMessage = isPro && message && message.tone !== 'success' ? null : message;

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
    } else if (outcome === 'pending') {
      setMessage({ tone: 'info', text: `${billingStoreName()} is still confirming your purchase. Pro unlocks as soon as it does. If it does not, tap Restore purchases.` });
    } else {
      // A failure can happen after the payment went through, so never promise the user was not charged.
      setMessage({ tone: 'warning', text: 'Pro could not be confirmed. If you were charged, tap Restore purchases or try again in a minute.' });
    }
  };

  const retryStore = async () => {
    setChecking(true);
    const nextStatus = await refreshPurchases();
    const nextOffer = nextStatus === 'ready' ? await fetchProOffer() : null;
    setOffer(nextOffer);
    setChecking(false);
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
      const account = storeAccountName();
      setMessage({ tone: 'info', text: `No Pro purchase was found for this ${account}. Make sure this device uses the ${account} you bought Pro with, then try again.` });
    } else {
      setMessage({ tone: 'warning', text: 'The store could not be reached. Check your connection and try again.' });
    }
  };

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const storeReady = storeStatus === 'ready' && offer !== null;
  const connecting = storeStatus === 'loading' || checking;
  const unavailableText = !purchasesSupported
    ? 'Purchases work in the iPhone and Android apps. Everything in the free version works here.'
    : connecting
      ? 'Connecting to the store…'
      : 'The store is unavailable right now. Everything in the free version keeps working.';
  // On the phone the store can come back (a connection returns), so offer a way to check again.
  const canRetry = purchasesSupported && !connecting;

  // The price, the buy button and Restore stay pinned at the bottom, so nobody has to scroll to find them.
  const footer = (
    <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopColor: colors.border, backgroundColor: colors.background }]}>
      {shownMessage ? (
        <View style={{ marginBottom: spacing.md }}>
          <Notice tone={shownMessage.tone} message={shownMessage.text} testID="pro-message" />
        </View>
      ) : null}
      {isPro ? (
        <Button label="Done" fullWidth size="lg" onPress={dismiss} testID="pro-done" />
      ) : (
        <>
          {!storeReady ? (
            <View style={{ marginBottom: spacing.md }}>
              <Notice
                tone="info"
                message={unavailableText}
                actionLabel={canRetry ? 'Try again' : undefined}
                onAction={canRetry ? () => void retryStore() : undefined}
                testID="store-unavailable"
              />
            </View>
          ) : null}
          <Button
            label={storeReady ? `Unlock Pro for ${offer.priceString}` : 'Unlock Pro'}
            variant="pro"
            size="lg"
            fullWidth
            disabled={!storeReady || busy === 'restore'}
            loading={busy === 'buy'}
            onPress={() => void buy()}
            testID="pro-buy"
          />
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
            Pay once. No subscription, no renewals. Billed by {billingStoreName()}.
          </AppText>
          <View style={styles.links}>
            <Button
              label="Restore purchases"
              variant="ghost"
              disabled={storeStatus !== 'ready' || busy === 'buy'}
              loading={busy === 'restore'}
              onPress={() => void restore()}
              style={styles.link}
              testID="pro-restore"
            />
            <Button label="Not now" variant="ghost" onPress={dismiss} style={styles.link} testID="pro-not-now" />
          </View>
        </>
      )}
    </View>
  );

  return (
    <Screen scroll edges={['top', 'bottom']} footer={pinFooter ? footer : undefined} testID="pro-screen">
      <Header title="" dismiss="close" />
      <View style={styles.hero}>
        <View style={[styles.badge, { backgroundColor: colors.proSoft, borderRadius: radius.xl }]}>
          <Ionicons name="sparkles" size={44} color={colors.pro} />
        </View>
        <AppText variant="title" align="center" accessibilityRole="header" style={{ marginTop: spacing.lg }}>
          {headline.title}
        </AppText>
        <AppText variant="body" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
          {headline.body}
        </AppText>
        <View style={[styles.promise, { backgroundColor: colors.proSoft, borderRadius: radius.pill, marginTop: spacing.md }]}>
          <AppText variant="bodyBold" align="center" style={{ color: colors.pro }} testID="pro-promise">
            One time purchase. Never a subscription.
          </AppText>
        </View>
      </View>

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

      <View style={{ marginTop: spacing.lg }}>
        {isPro ? (
          <Notice tone="success" title="You have Pro" message="Every feature above is unlocked, for good." />
        ) : (
          <AppText variant="caption" tone="muted" align="center">
            Restore Pro on any device signed in to the same {storeAccountName()}.
          </AppText>
        )}
      </View>
      {pinFooter ? null : <View style={{ marginTop: spacing.lg }}>{footer}</View>}
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
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  links: { flexDirection: 'row', gap: 8 },
  link: { flex: 1, paddingHorizontal: 8 },
});
