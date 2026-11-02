import { useMemo } from 'react';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { WidgetPreview } from '@/components/WidgetPreview';
import { useActiveProfile, useNow, useProGate, useProfileOverrides } from '@/hooks/useData';
import type { WidgetBackground } from '@/lib/model';
import { buildSnapshot } from '@/lib/widgetSnapshot';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function WidgetsScreen() {
  const { spacing, scheme } = useTheme();
  const now = useNow();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const hour12 = useStore((s) => s.settings.hour12);
  const saved = useStore((s) => s.settings.widgetBackground);
  const updateSettings = useStore((s) => s.updateSettings);
  const { isPro, requirePro } = useProGate();
  const background: WidgetBackground = isPro ? saved : 'system';
  const snapshot = useMemo(() => buildSnapshot({ profile, overrides, today: now.date, hour12, background, days: 10 }), [profile, overrides, now.date, hour12, background]);

  return (
    <Screen scroll testID="widgets-screen">
      <Header title="Home screen widgets" dismiss="back" />
      <AppText variant="body" tone="muted">
        Two widgets: Today (small) shows whether you are on or off and when your next shift is. Next 7 days (medium) shows the week ahead. They update by themselves at midnight and at every shift change.
      </AppText>
      <SectionHeader title="Preview" />
      <WidgetPreview snapshot={snapshot} date={now.date} minutes={now.minutes} background={background} dark={scheme === 'dark'} />

      <SectionHeader title="Widget color" />
      <SegmentedControl<WidgetBackground>
        options={[
          { key: 'system', label: 'Automatic' },
          { key: 'light', label: 'Light' },
          { key: 'dark', label: 'Dark' },
          { key: 'platoon', label: 'Platoon' },
        ]}
        value={background}
        onChange={(k) => {
          if (requirePro('widgets')) updateSettings({ widgetBackground: k });
        }}
        testID="widget-background"
      />
      {!isPro ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          Widget colors are part of Pro. Automatic follows light and dark mode.
        </AppText>
      ) : null}

      <SectionHeader title="How to add one" />
      <Card>
        {Platform.OS === 'android' ? (
          <View>
            <AppText variant="body">1. Touch and hold an empty spot on your home screen.</AppText>
            <AppText variant="body">2. Tap Widgets and find Rotawise.</AppText>
            <AppText variant="body">3. Drag Rotawise Today or Rotawise Next 7 Days onto the screen.</AppText>
          </View>
        ) : (
          <View>
            <AppText variant="body">1. Touch and hold an empty spot on your home screen until the apps jiggle.</AppText>
            <AppText variant="body">2. Tap Edit, then Add Widget, and search for Rotawise.</AppText>
            <AppText variant="body">3. Pick Today (small) or Next 7 days (medium) and tap Add Widget.</AppText>
          </View>
        )}
      </Card>
    </Screen>
  );
}
