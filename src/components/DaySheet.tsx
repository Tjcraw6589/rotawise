import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Profile, StoredOverride } from '@/lib/model';
import { addDays, codeFor, effectiveShifts, formatLongDate, platoonsOn } from '@/lib/rotation';
import { useProGate, useTimeFormat } from '@/hooks/useData';
import { formatHours } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { PlatoonBadge } from './PlatoonBadge';
import { Sheet } from './Sheet';

const STATUS_TEXT: Record<string, string> = {
  scheduled: 'Working',
  kelly: 'Kelly day off',
  'traded-away': 'Traded away',
  vacation: 'Vacation',
  sick: 'Sick day',
  'other-leave': 'Leave',
};

function overrideLine(o: StoredOverride): string {
  if (o.kind === 'trade') return `${o.direction === 'gave' ? 'Gave this shift to' : 'Worked for'} ${o.counterpart || 'someone'}${o.hours ? `, ${formatHours(o.hours)}` : ''}${o.settled ? ', settled' : ''}`;
  if (o.kind === 'extra') return `${o.category === 'overtime' ? 'Overtime' : o.category === 'callback' ? 'Callback' : o.category === 'training' ? 'Training' : 'Extra shift'}, ${formatHours(o.hours)}`;
  return `${o.leaveType === 'vacation' ? 'Vacation' : o.leaveType === 'sick' ? 'Sick' : o.leaveType === 'kelly' ? 'Kelly day' : 'Leave'}${o.hours ? `, ${formatHours(o.hours)}` : ''}`;
}

interface DaySheetProps {
  date: string | null;
  profile: Profile;
  overrides: StoredOverride[];
  onClose: () => void;
}

/** Everything about one day, and the shortcuts to log a trade, overtime or leave on it. */
export function DaySheet({ date, profile, overrides, onClose }: DaySheetProps) {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const formatTime = useTimeFormat();
  const { requirePro } = useProGate();
  if (!date) return null;
  const shifts = effectiveShifts(profile.rotation, profile.platoon, date, date, overrides);
  const dayOverrides = overrides.filter((o) => o.date === date);
  const onDuty = platoonsOn(profile.rotation, date);
  const go = (kind: 'trade' | 'extra' | 'leave') => {
    const reason = kind === 'trade' ? 'trades' : kind === 'extra' ? 'overtime' : 'leave';
    onClose();
    if (requirePro(reason)) router.push({ pathname: '/entry', params: { kind, date } });
  };
  return (
    <Sheet visible onClose={onClose} title={formatLongDate(date)} testID="day-sheet">
      <ScrollView style={{ paddingHorizontal: spacing.lg }}>
        {shifts.length === 0 ? (
          <AppText variant="h3" testID="day-sheet-status">
            You&apos;re off
          </AppText>
        ) : (
          shifts.map((s) => {
            const type = profile.rotation.shiftTypes.find((t) => t.id === s.shiftTypeId);
            const ends = s.endDate === date ? formatTime(s.endMinutes) : s.endDate === addDays(date, 1) ? `${formatTime(s.endMinutes)} next day` : `${formatTime(s.endMinutes)} on ${formatLongDate(s.endDate)}`;
            return (
              <View key={s.id} style={[styles.shift, { marginBottom: spacing.md }]}>
                <PlatoonBadge platoon={s.platoon} size={36} suffix={codeFor(s, profile.rotation) === '24' ? undefined : codeFor(s, profile.rotation)} />
                <View style={styles.flex}>
                  <AppText variant="h3" testID="day-sheet-status">
                    {STATUS_TEXT[s.status] ?? 'Working'}
                    {s.source === 'extra' ? ', extra shift' : s.source === 'trade-in' ? ', trade' : ''}
                  </AppText>
                  <AppText variant="body" tone="muted">
                    {type?.label ?? 'Shift'}, {formatTime(s.startMinutes)} to {ends}
                  </AppText>
                </View>
              </View>
            );
          })
        )}
        <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.md }}>
          On duty this day: {onDuty.length ? onDuty.map((p) => `${p} platoon`).join(', ') : 'nobody on this pattern'}
        </AppText>
        {dayOverrides.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            {dayOverrides.map((o) => (
              <Button
                key={o.id}
                label={`${overrideLine(o)}. Edit`}
                variant="ghost"
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/entry', params: { id: o.id } });
                }}
                testID={`day-override-${o.id}`}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button label="Trade" variant="secondary" onPress={() => go('trade')} style={styles.action} testID="day-add-trade" />
          <Button label="Overtime" variant="secondary" onPress={() => go('extra')} style={styles.action} testID="day-add-extra" />
          <Button label="Leave" variant="secondary" onPress={() => go('leave')} style={styles.action} testID="day-add-leave" />
        </View>
        <View style={{ height: spacing.md, backgroundColor: colors.surface }} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  shift: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignSelf: 'stretch' },
});
