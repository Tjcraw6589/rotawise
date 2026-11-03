import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Profile } from '@/lib/model';
import { PLATOONS, PRESETS, SHIFT_TYPE_LIBRARY, addDays, formatMinutes, formatShortDate, localISO } from '@/lib/rotation';
import type { Platoon, PresetId } from '@/lib/rotation';
import type { SetupState } from '@/lib/setup';
import { CUSTOM_STEPS, kellyChoices, platoonCountFor, rotationFromSetup, workedDateHelp } from '@/lib/setup';
import { selectionHaptic } from '@/services/haptics';
import { PLATOON_COLORS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { DateField } from './DateField';
import { Row } from './Row';
import { SectionHeader } from './SectionHeader';
import { Stepper } from './Stepper';
import { WeekStrip } from './WeekStrip';

interface RotationSetupProps {
  value: SetupState;
  onChange: (next: SetupState) => void;
  hour12: boolean;
}

/** Every rotation choice on one scrolling page, with a live preview of your next two weeks. */
export function RotationSetup({ value, onChange, hour12 }: RotationSetupProps) {
  const { colors, radius, spacing } = useTheme();
  const set = (patch: Partial<SetupState>) => onChange({ ...value, ...patch });
  const today = localISO();
  const count = platoonCountFor(value);
  const preview = useMemo(() => {
    const { rotation, platoon } = rotationFromSetup(value);
    const profile: Profile = { id: 'preview', name: 'Me', color: '#000000', rotation, platoon, createdAt: '' };
    return profile;
  }, [value]);
  const choices = useMemo(() => (value.kellyEnabled ? kellyChoices(value, today, Math.max(2, value.kellyEvery)) : []), [value, today]);
  const label = (id: string | null) => (id === null ? 'Off' : (SHIFT_TYPE_LIBRARY.find((t) => t.id === id)?.short ?? '?'));

  return (
    <View testID="rotation-setup">
      <SectionHeader title="1. Your schedule" first />
      <View style={styles.presetGrid}>
        {PRESETS.map((p) => {
          const selected = p.id === value.presetId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${p.name}: ${p.tagline}`}
              testID={`preset-${p.id}`}
              onPress={() => {
                selectionHaptic();
                const patch: Partial<SetupState> = { presetId: p.id as PresetId };
                if (p.id === 'kelly') patch.kellyEnabled = true;
                if (p.id === '24-48' || p.id === '48-96' || p.id === '24-72' || p.id === 'kelly') patch.startMinutes = value.startMinutes;
                if (p.id === 'dupont' || p.id === 'pitman' || p.id === '4-on-4-off') patch.startMinutes = 7 * 60;
                set(patch);
              }}
              style={[
                styles.preset,
                {
                  borderRadius: radius.md,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  padding: spacing.md,
                },
              ]}
            >
              <AppText variant="bodyBold">{p.name}</AppText>
              <AppText variant="caption" tone="muted">
                {p.tagline}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {value.presetId === 'custom' ? (
        <View style={{ marginTop: spacing.lg }} testID="custom-builder">
          <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>
            Tap a day to change it: Off, 24 hour tour, 12 hour Day, 12 hour Night, 8 hour day.
          </AppText>
          <View style={styles.chips}>
            {value.customCycle.map((id, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Cycle day ${i + 1}: ${id === null ? 'off' : (SHIFT_TYPE_LIBRARY.find((t) => t.id === id)?.label ?? id)}. Tap to change`}
                testID={`cycle-day-${i}`}
                onPress={() => {
                  const next = [...value.customCycle];
                  const pos = CUSTOM_STEPS.indexOf(id);
                  next[i] = CUSTOM_STEPS[(pos + 1) % CUSTOM_STEPS.length] ?? null;
                  set({ customCycle: next });
                }}
                style={[styles.chip, { borderRadius: radius.sm, backgroundColor: id ? colors.primary : colors.surfaceAlt }]}
              >
                <AppText variant="small" tone="muted">
                  {i + 1}
                </AppText>
                <AppText variant="bodyBold" style={{ color: id ? colors.onPrimary : colors.text }}>
                  {label(id)}
                </AppText>
              </Pressable>
            ))}
          </View>
          <View style={[styles.rowButtons, { marginTop: spacing.sm }]}>
            <Button label="Add day" size="sm" variant="secondary" onPress={() => set({ customCycle: [...value.customCycle, null] })} disabled={value.customCycle.length >= 56} testID="cycle-add" />
            <Button
              label="Remove day"
              size="sm"
              variant="secondary"
              onPress={() => set({ customCycle: value.customCycle.slice(0, -1) })}
              disabled={value.customCycle.length <= 1}
              testID="cycle-remove"
            />
          </View>
          <Stepper label="Platoons" value={value.customPlatoons} min={1} max={4} onChange={(n) => set({ customPlatoons: n, platoon: PLATOONS.indexOf(value.platoon) < n ? value.platoon : 'A' })} testID="custom-platoons" />
        </View>
      ) : null}

      <SectionHeader title="2. Your platoon" />
      <View style={styles.platoonRow}>
        {PLATOONS.slice(0, count).map((p: Platoon) => {
          const selected = p === value.platoon;
          const c = PLATOON_COLORS[p];
          return (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Platoon ${p}`}
              testID={`platoon-${p}`}
              onPress={() => {
                selectionHaptic();
                set({ platoon: p });
              }}
              style={[styles.platoon, { backgroundColor: c.fill, borderRadius: radius.md, borderColor: selected ? colors.text : 'transparent', borderWidth: 3 }]}
            >
              <AppText style={[styles.platoonLetter, { color: c.text }]}>{p}</AppText>
              {selected ? <AppText style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>Mine</AppText> : null}
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="3. A day you started a run of shifts" />
      <DateField label="Date" value={value.workedDate} onChange={(d) => set({ workedDate: d })} helper={workedDateHelp(value.presetId)} testID="worked-date" />
      <View style={styles.rowButtons}>
        <Button label="One day earlier" variant="secondary" onPress={() => set({ workedDate: addDays(value.workedDate, -1) })} style={styles.half} testID="shift-earlier" />
        <Button label="One day later" variant="secondary" onPress={() => set({ workedDate: addDays(value.workedDate, 1) })} style={styles.half} testID="shift-later" />
      </View>

      <SectionHeader title="Your next two weeks" />
      <WeekStrip profile={preview} overrides={[]} from={today} />
      <View style={{ height: spacing.sm }} />
      <WeekStrip profile={preview} overrides={[]} from={addDays(today, 7)} />
      <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
        Not right? Use one day earlier or later until it matches your calendar.
      </AppText>

      <SectionHeader title="Shift start time" />
      <Stepper
        label="Starts at"
        value={value.startMinutes}
        display={formatMinutes(value.startMinutes, hour12)}
        step={30}
        min={0}
        max={1410}
        onChange={(m) => set({ startMinutes: m })}
        testID="start-time"
      />

      <SectionHeader title="Kelly days" />
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }}>
        <Row
          title="Use Kelly days"
          subtitle="An extra day off every few shifts"
          toggle={{ value: value.kellyEnabled, onValueChange: (v) => set({ kellyEnabled: v }) }}
          last
          testID="kelly-toggle"
        />
      </View>
      {value.kellyEnabled ? (
        <View style={{ marginTop: spacing.md }}>
          <Stepper label="Every Nth shift" value={value.kellyEvery} min={2} max={30} onChange={(n) => set({ kellyEvery: n, kellyPhase: value.kellyPhase % n })} testID="kelly-every" />
          <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>
            Which of these shifts is your next Kelly day?
          </AppText>
          <View style={styles.chips}>
            {choices.map((c) => {
              const selected = c.phase === value.kellyPhase % value.kellyEvery;
              return (
                <Pressable
                  key={c.date}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`kelly-next-${c.date}`}
                  onPress={() => set({ kellyPhase: c.phase })}
                  style={[styles.kellyChip, { borderRadius: radius.sm, backgroundColor: selected ? colors.primary : colors.surfaceAlt }]}
                >
                  <AppText variant="small" style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {formatShortDate(c.date)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  preset: { width: '49%', minHeight: 72 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: 48, minHeight: 52, paddingHorizontal: 4, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  kellyChip: { paddingHorizontal: 12, minHeight: 44, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  rowButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  half: { flex: 1, alignSelf: 'stretch', paddingHorizontal: 8 },
  platoonRow: { flexDirection: 'row', gap: 10 },
  platoon: { flex: 1, minHeight: 72, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  platoonLetter: { fontSize: 30, fontWeight: '900', lineHeight: 34 },
});
