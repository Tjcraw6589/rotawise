import { useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { PRIVACY_URL, SITE_URL, SUPPORT_EMAIL } from '@/config/monetization';
import { useTheme } from '@/theme/useTheme';

const PRIVACY: { title: string; body: string }[] = [
  { title: 'Your schedule stays on your phone', body: 'Rotawise never sends your schedule, trades, pay or leave anywhere. Everything stays in a database on this phone.' },
  { title: 'No account', body: 'There is nothing to sign up for and nothing to log in to.' },
  { title: 'No ads, analytics or tracking', body: 'Rotawise has no advertising, no analytics and no tracking of any kind.' },
  {
    title: 'Purchases',
    body: 'Each time Rotawise opens, it checks with RevenueCat whether Pro is unlocked. That sends an anonymous app ID plus basic device and app version details. If you buy Pro, Apple or Google handles the payment and RevenueCat also gets the purchase receipt so Pro can be confirmed and restored. None of this includes your schedule, and it is never linked to your name.',
  },
  { title: 'Calendar', body: 'Only if you use Share with a calendar, Rotawise adds your shifts to the calendar you pick. It does not read your other events.' },
  {
    title: 'Deleting your data',
    body: 'Settings, Erase all data removes everything. While calendar access is on, it also takes the shifts Rotawise added back out of your calendar. Deleting the app removes your data from this phone, but shifts already added to a calendar stay there until you delete them in your Calendar app.',
  },
];

export default function AboutScreen() {
  const { spacing } = useTheme();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc !== 'support';
  return (
    <Screen scroll testID={isPrivacy ? 'privacy-screen' : 'support-screen'}>
      <Header title={isPrivacy ? 'Privacy' : 'Help and support'} dismiss="back" />
      {isPrivacy ? (
        <>
          {PRIVACY.map((p) => (
            <Card key={p.title} style={{ marginBottom: spacing.md }}>
              <AppText variant="bodyBold">{p.title}</AppText>
              <AppText variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
                {p.body}
              </AppText>
            </Card>
          ))}
          <Button label="Full privacy policy" variant="ghost" onPress={() => void Linking.openURL(PRIVACY_URL)} />
        </>
      ) : (
        <>
          <SectionHeader title="Common questions" first />
          <Card style={{ marginBottom: spacing.md }}>
            <AppText variant="bodyBold">My calendar is one day off</AppText>
            <AppText variant="body" tone="muted">
              Settings, Schedule, then use One day earlier or One day later until the preview matches.
            </AppText>
          </Card>
          <Card style={{ marginBottom: spacing.md }}>
            <AppText variant="bodyBold">Is Pro a subscription?</AppText>
            <AppText variant="body" tone="muted">
              No. Pro is a one time purchase. Pay once and keep it forever. Use Restore purchases on a new phone.
            </AppText>
          </Card>
          <Card style={{ marginBottom: spacing.md }}>
            <AppText variant="bodyBold">Is this my department&apos;s official schedule?</AppText>
            <AppText variant="body" tone="muted">
              Rotawise calculates the rotation you set up. Always check your department&apos;s official schedule.
            </AppText>
          </Card>
          <Button label={`Email ${SUPPORT_EMAIL}`} fullWidth onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Rotawise`)} testID="support-email" />
          <Button label="Website" variant="ghost" fullWidth onPress={() => void Linking.openURL(SITE_URL)} style={{ marginTop: spacing.sm }} />
        </>
      )}
    </Screen>
  );
}
