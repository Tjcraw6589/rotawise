import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EntryList } from '@/components/EntryList';
import { Header } from '@/components/Header';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useActiveProfile, useProfileOverrides } from '@/hooks/useData';
import { formatHours } from '@/lib/format';
import { defaultShiftHours } from '@/lib/model';
import { localISO, tradeBalances } from '@/lib/rotation';
import { useTheme } from '@/theme/useTheme';

export default function TradesScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const trades = useMemo(() => overrides.filter((o) => o.kind === 'trade'), [overrides]);
  const balances = useMemo(() => tradeBalances(trades, defaultShiftHours(profile)), [trades, profile]);

  return (
    <Screen scroll testID="trades-screen">
      <Header title="Trades and swaps" dismiss="back" />
      <AppText variant="body" tone="muted">
        Every trade changes your calendar. Give a shift and that day turns off; work someone else&apos;s and it turns on.
      </AppText>
      <Button label="Log a trade" fullWidth onPress={() => router.push({ pathname: '/entry', params: { kind: 'trade', date: localISO() } })} style={{ marginTop: spacing.lg }} testID="trades-add" />

      <SectionHeader title="Who owes whom" />
      {balances.length === 0 ? (
        <AppText variant="body" tone="muted" testID="trades-even">
          All square. No open trades.
        </AppText>
      ) : (
        <Card padded={false} testID="trades-balances">
          {balances.map((b, i) => (
            <Row
              key={b.counterpart}
              title={b.counterpart}
              subtitle={`${b.open} open ${b.open === 1 ? 'trade' : 'trades'}`}
              value={b.hours > 0 ? `Owes you ${formatHours(b.hours)}` : b.hours < 0 ? `You owe ${formatHours(-b.hours)}` : 'Even'}
              last={i === balances.length - 1}
            />
          ))}
        </Card>
      )}

      <SectionHeader title="All trades" />
      <EntryList entries={trades} empty="No trades yet." testID="trades-list" />
    </Screen>
  );
}
