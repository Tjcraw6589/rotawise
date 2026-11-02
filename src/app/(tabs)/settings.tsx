import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Header } from '@/components/Header';
import { Notice } from '@/components/Notice';
import { OptionSheet } from '@/components/OptionSheet';
import { PlatoonBadge } from '@/components/PlatoonBadge';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { APP_VERSION } from '@/config/monetization';
import { useActiveProfile, useProGate } from '@/hooks/useData';
import type { PaletteId } from '@/lib/model';
import { PLATOONS, presetInfo } from '@/lib/rotation';
import type { Platoon } from '@/lib/rotation';
import { successHaptic } from '@/services/haptics';
import { restorePro, usePurchasesStatus } from '@/services/purchases';
import { useStore } from '@/store/useStore';
import { PALETTES } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function SettingsScreen() {
  const { colors, spacing, scheme } = useTheme();
  const router = useRouter();
  const profile = useActiveProfile();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setPlatoon = useStore((s) => s.setPlatoon);
  const setPro = useStore((s) => s.setPro);
  const resetAll = useStore((s) => s.resetAll);
  const { isPro, requirePro } = useProGate();
  const storeStatus = usePurchasesStatus();
  const [sheet, setSheet] = useState<null | 'platoon' | 'palette' | 'erase'>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'info' | 'warning'; text: string } | null>(null);
  const rotationName = profile.rotation.presetId === 'custom' ? 'Custom pattern' : presetInfo(profile.rotation.presetId).name;

  const restore = async () => {
    const outcome = await restorePro();
    if (outcome === 'restored') {
      setPro(true);
      successHaptic();
      setMessage({ tone: 'success', text: 'Pro restored. Thank you!' });
    } else if (outcome === 'none') {
      setMessage({ tone: 'info', text: 'No earlier Pro purchase was found for this store account.' });
    } else {
      setMessage({ tone: 'warning', text: storeStatus === 'unavailable' ? 'Purchases work in the iPhone and Android apps.' : 'The store could not be reached. Try again later.' });
    }
  };

  return (
    <Screen scroll testID="settings-screen">
      <Header title="Settings" large />
      {message ? <Notice tone={message.tone} message={message.text} testID="settings-message" /> : null}

      <SectionHeader title="Rotation" first />
      <Card padded={false}>
        <Row title="Schedule" value={rotationName} onPress={() => router.push('/rotation')} testID="settings-rotation" />
        <Row title="My platoon" right={<PlatoonBadge platoon={profile.platoon} size={28} />} onPress={() => setSheet('platoon')} testID="settings-platoon" />
        <Row
          title="Show all platoons"
          subtitle="In the month and year views"
          toggle={{ value: settings.showAllPlatoons, onValueChange: (v) => updateSettings({ showAllPlatoons: v }) }}
          last
          testID="settings-show-all"
        />
      </Card>

      <SectionHeader title="Display" />
      <Card>
        <AppText variant="small" tone="muted" style={{ marginBottom: spacing.xs }}>
          Appearance
        </AppText>
        <SegmentedControl
          options={[
            { key: 'system', label: 'Automatic' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
          value={settings.theme}
          onChange={(k) => updateSettings({ theme: k })}
          testID="settings-theme"
        />
        <AppText variant="small" tone="muted" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          Weeks start on
        </AppText>
        <SegmentedControl
          options={[
            { key: '0', label: 'Sunday' },
            { key: '1', label: 'Monday' },
          ]}
          value={String(settings.weekStartsOn) as '0' | '1'}
          onChange={(k) => updateSettings({ weekStartsOn: k === '1' ? 1 : 0 })}
          testID="settings-week-start"
        />
      </Card>
      <Card padded={false} style={{ marginTop: spacing.md }}>
        <Row title="24 hour clock" toggle={{ value: !settings.hour12, onValueChange: (v) => updateSettings({ hour12: !v }) }} testID="settings-24h" />
        <Row
          title="Color theme"
          value={isPro ? PALETTES[settings.palette].name : 'Pro'}
          left={<View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary }} />}
          onPress={() => {
            if (requirePro('themes')) setSheet('palette');
          }}
          testID="settings-palette"
        />
        <Row title="Widgets" subtitle="How to add them, and their colors" onPress={() => router.push('/widgets')} last testID="settings-widgets" />
      </Card>

      <SectionHeader title="Rotawise Pro" />
      <Card padded={false}>
        <Row
          title={isPro ? 'Pro is unlocked' : 'Get Pro'}
          subtitle="One time purchase. Never a subscription."
          left={<Ionicons name="sparkles" size={20} color={colors.pro} />}
          onPress={() => router.push({ pathname: '/pro', params: { reason: 'general' } })}
          testID="settings-pro"
        />
        <Row title="Restore purchases" onPress={() => void restore()} last testID="settings-restore" />
      </Card>

      <SectionHeader title="About" />
      <Card padded={false}>
        <Row title="Privacy" subtitle="Data not collected. No account, ads or tracking." onPress={() => router.push({ pathname: '/about', params: { doc: 'privacy' } })} testID="settings-privacy" />
        <Row title="Help and support" onPress={() => router.push({ pathname: '/about', params: { doc: 'support' } })} testID="settings-support" />
        <Row title="Version" value={APP_VERSION} last />
      </Card>
      <Card padded={false} style={{ marginTop: spacing.md }}>
        <Row title="Erase all data" destructive onPress={() => setSheet('erase')} last testID="settings-erase" />
      </Card>

      <OptionSheet<Platoon>
        visible={sheet === 'platoon'}
        onClose={() => setSheet(null)}
        title="My platoon"
        value={profile.platoon}
        options={PLATOONS.slice(0, profile.rotation.platoonCount).map((p) => ({ key: p, label: `${p} platoon`, left: <PlatoonBadge platoon={p} size={30} /> }))}
        onSelect={(p) => setPlatoon(profile.id, p)}
        testID="platoon-sheet"
      />
      <OptionSheet<PaletteId>
        visible={sheet === 'palette'}
        onClose={() => setSheet(null)}
        title="Color theme"
        value={settings.palette}
        options={(Object.keys(PALETTES) as PaletteId[]).map((k) => ({
          key: k,
          label: PALETTES[k].name,
          left: <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: scheme === 'dark' ? PALETTES[k].dark : PALETTES[k].light }} />,
        }))}
        onSelect={(k) => updateSettings({ palette: k })}
        testID="palette-sheet"
      />
      <ConfirmSheet
        visible={sheet === 'erase'}
        title="Erase all data?"
        message="Your rotations, trades, overtime and leave will be deleted from this phone. Pro stays unlocked."
        confirmLabel="Erase everything"
        destructive
        onConfirm={() => {
          setSheet(null);
          resetAll();
        }}
        onCancel={() => setSheet(null)}
        testID="erase-sheet"
      />
    </Screen>
  );
}
