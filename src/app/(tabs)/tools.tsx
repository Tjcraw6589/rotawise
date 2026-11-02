import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { useProGate, type ProReason } from '@/hooks/useData';
import { useTheme } from '@/theme/useTheme';

type IconName = keyof typeof Ionicons.glyphMap;

const TOOLS: { title: string; subtitle: string; icon: IconName; href: Href; reason: ProReason; free?: boolean }[] = [
  { title: 'Trades and swaps', subtitle: 'Who owes whom, and your calendar follows', icon: 'swap-horizontal', href: '/trades', reason: 'trades' },
  { title: 'Overtime', subtitle: 'Extra shifts and callbacks with hour totals', icon: 'time', href: '/overtime', reason: 'overtime' },
  { title: 'Pay and paydays', subtitle: 'Pay periods and estimated gross pay', icon: 'cash', href: '/pay', reason: 'pay' },
  { title: 'Leave balances', subtitle: 'Vacation, sick and Kelly days', icon: 'airplane', href: '/leave', reason: 'leave' },
  { title: 'Share with a calendar', subtitle: 'Send shifts to Apple or Google Calendar', icon: 'share-social', href: '/export', reason: 'export' },
  { title: 'More rotations', subtitle: 'A second job or a partner, overlaid in color', icon: 'people', href: '/profiles', reason: 'profiles' },
  { title: 'Home screen widgets', subtitle: 'How to add them, and widget colors', icon: 'apps', href: '/widgets', reason: 'widgets', free: true },
];

export default function ToolsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { isPro, requirePro } = useProGate();
  return (
    <Screen scroll testID="tools-screen">
      <Header title="Tools" large />
      {!isPro ? (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.proSoft, borderColor: colors.proSoft }} testID="tools-pro-card">
          <AppText variant="h3">Rotawise Pro</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
            Everything below for one payment. Pay once, yours forever. Never a subscription.
          </AppText>
          <Button label="See Pro" variant="pro" onPress={() => router.push({ pathname: '/pro', params: { reason: 'general' } })} style={{ marginTop: spacing.md }} testID="tools-see-pro" />
        </Card>
      ) : null}
      <Card padded={false}>
        {TOOLS.map((t, i) => (
          <Row
            key={t.title}
            title={t.title}
            subtitle={t.subtitle}
            left={<Ionicons name={t.icon} size={22} color={colors.primary} />}
            right={!isPro && !t.free ? <Ionicons name="lock-closed" size={16} color={colors.pro} style={{ marginLeft: 6 }} /> : undefined}
            onPress={() => {
              if (t.free || requirePro(t.reason)) router.push(t.href);
            }}
            last={i === TOOLS.length - 1}
            testID={`tool-${t.reason}`}
          />
        ))}
      </Card>
    </Screen>
  );
}
