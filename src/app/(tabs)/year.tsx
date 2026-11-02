import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { YearGrid } from '@/components/YearGrid';
import { useActiveProfile, useNow, useProGate, useProfileOverrides } from '@/hooks/useData';
import { formatHours } from '@/lib/format';
import { effectiveShifts, isWorking, parseISO, presetInfo, PLATOONS } from '@/lib/rotation';
import { yearCalendarDocument } from '@/lib/yearHtml';
import { shareViewImage, shareYearPdf } from '@/services/share';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function YearScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const now = useNow();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const showAll = useStore((s) => s.settings.showAllPlatoons);
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);
  const updateSettings = useStore((s) => s.updateSettings);
  const { requirePro } = useProGate();
  const [year, setYear] = useState(() => parseISO(now.date).year);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'pdf' | 'image'>(null);
  const shotRef = useRef<ComponentRef<typeof View>>(null);

  const working = effectiveShifts(profile.rotation, profile.platoon, `${year}-01-01`, `${year}-12-31`, overrides).filter(isWorking);
  const hours = working.reduce((h, s) => h + s.durationMinutes / 60, 0);
  const rotationName = profile.rotation.presetId === 'custom' ? 'Custom pattern' : presetInfo(profile.rotation.presetId).name;

  const pdf = async () => {
    if (!requirePro('print')) return;
    setBusy('pdf');
    try {
      const html = yearCalendarDocument({
        year,
        rotation: profile.rotation,
        platoons: showAll ? PLATOONS.slice(0, profile.rotation.platoonCount) : [profile.platoon],
        overrides,
        weekStartsOn,
        title: showAll ? `${rotationName} ${year}, all platoons` : `${profile.platoon} platoon ${year}, ${rotationName}`,
        subtitle: profile.name !== 'Me' ? profile.name : undefined,
        footer: 'Made with Rotawise. Check your department schedule for official dates.',
      });
      setMessage(await shareYearPdf(html, year));
    } catch {
      setMessage('The PDF could not be created. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const image = async () => {
    if (!requirePro('print')) return;
    setBusy('image');
    try {
      setMessage(await shareViewImage(shotRef, year));
    } catch {
      setMessage('The image could not be created. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll testID="year-screen">
      <Header title="Year" large />
      <View style={[styles.nav, { marginBottom: spacing.md }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => setYear(year - 1)} style={styles.navBtn} testID="year-prev">
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <AppText variant="h2" align="center" style={styles.flex} testID="year-title">
          {year}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Next year" onPress={() => setYear(year + 1)} style={styles.navBtn} testID="year-next">
          <Ionicons name="chevron-forward" size={28} color={colors.text} />
        </Pressable>
      </View>
      <SegmentedControl
        options={[
          { key: 'mine', label: `My platoon (${profile.platoon})` },
          { key: 'all', label: 'All platoons' },
        ]}
        value={showAll ? 'all' : 'mine'}
        onChange={(k) => updateSettings({ showAllPlatoons: k === 'all' })}
        testID="year-filter"
      />
      <View ref={shotRef} collapsable={false} style={{ backgroundColor: colors.background, paddingVertical: spacing.md }}>
        <AppText variant="bodyBold" style={{ marginBottom: spacing.sm }} testID="year-summary">
          {profile.platoon} platoon, {rotationName}: {working.length} shifts, {formatHours(hours)}
        </AppText>
        <YearGrid
          year={year}
          profile={profile}
          overrides={overrides}
          showAll={showAll}
          weekStartsOn={weekStartsOn}
          today={now.date}
          onMonthPress={(m) => router.navigate({ pathname: '/calendar', params: { y: String(year), m: String(m) } })}
        />
      </View>
      {message ? <Notice tone="info" message={message} testID="year-message" /> : null}
      <View style={[styles.buttons, { marginTop: spacing.md }]}>
        <Button label="Print PDF" onPress={() => void pdf()} loading={busy === 'pdf'} style={styles.flexBtn} testID="year-pdf" />
        <Button label="Share image" variant="secondary" onPress={() => void image()} loading={busy === 'image'} style={styles.flexBtn} testID="year-image" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  buttons: { flexDirection: 'row', gap: 8 },
  flexBtn: { flex: 1, alignSelf: 'stretch' },
});
