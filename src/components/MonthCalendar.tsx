import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Profile } from '@/lib/model';
import type { Override, Platoon , DaySummary } from '@/lib/rotation';
import { PLATOONS, WEEKDAY_SHORT, daysInMonth, formatLongDate, monthGrid, platoonsOn, summarizeDays, toISO } from '@/lib/rotation';
import { dayCellLabel } from '@/lib/widgetSnapshot';
import { PLATOON_COLORS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export interface OverlayLayer {
  profile: Profile;
  overrides: readonly Override[];
}

interface MonthCalendarProps {
  year: number;
  month: number;
  profile: Profile;
  overrides: readonly Override[];
  showAll: boolean;
  overlays: OverlayLayer[];
  weekStartsOn: 0 | 1;
  today: string;
  onDayPress?: (date: string) => void;
}

const CODE_NAMES: Record<string, string> = { K: 'Kelly day', T: 'traded away', V: 'vacation', S: 'sick', L: 'leave', OT: 'extra shift', 'T+': 'trade shift' };

export function MonthCalendar({ year, month, profile, overrides, showAll, overlays, weekStartsOn, today, onDayPress }: MonthCalendarProps) {
  const { colors, radius, spacing } = useTheme();
  const weeks = monthGrid(year, month, weekStartsOn);
  const first = toISO({ year, month, day: 1 });
  const count = daysInMonth(year, month);

  const mine = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const d of summarizeDays(profile.rotation, profile.platoon, first, count, overrides)) map.set(d.date, d);
    return map;
  }, [profile, overrides, first, count]);

  const all = useMemo(() => {
    const map = new Map<string, Platoon[]>();
    if (!showAll) return map;
    for (const d of mine.keys()) map.set(d, platoonsOn(profile.rotation, d));
    return map;
  }, [showAll, mine, profile.rotation]);

  const layers = useMemo(
    () =>
      overlays.map((o) => {
        const days = new Map<string, DaySummary>();
        for (const d of summarizeDays(o.profile.rotation, o.profile.platoon, first, count, o.overrides)) days.set(d.date, d);
        return { profile: o.profile, days };
      }),
    [overlays, first, count],
  );

  const heads = Array.from({ length: 7 }, (_, i) => WEEKDAY_SHORT[(i + weekStartsOn) % 7]!);
  const pc = PLATOON_COLORS[profile.platoon];

  return (
    <View testID="month-calendar">
      <View style={styles.row}>
        {heads.map((h) => (
          <View key={h} style={styles.head}>
            <AppText variant="small" tone="muted">
              {h}
            </AppText>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((date, di) => {
            if (!date) return <View key={`e${di}`} style={styles.cell} />;
            const d = mine.get(date);
            const on = d?.on ?? false;
            const code = d?.code ?? '';
            const isToday = date === today;
            const onDuty = all.get(date) ?? [];
            const label = on ? dayCellLabel(profile.platoon, true, code) : '';
            // Your own letter is already the big label on your days; the badge row shows the others.
            const badges = label.startsWith(profile.platoon) ? onDuty.filter((p) => p !== profile.platoon) : onDuty;
            const parts: string[] = [formatLongDate(date)];
            if (on) parts.push(`you're on, platoon ${profile.platoon}${code && code !== '24' ? `, ${CODE_NAMES[code] ?? code}` : ''}`);
            else if (code) parts.push(CODE_NAMES[code] ?? code);
            else parts.push("you're off");
            if (d?.endsToday) parts.push('a tour ends this morning');
            if (showAll && onDuty.length) parts.push(`on duty: ${onDuty.join(' and ')}`);
            for (const l of layers) if (l.days.get(date)?.on) parts.push(`${l.profile.name} works`);
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={parts.join(', ')}
                onPress={onDayPress ? () => onDayPress(date) : undefined}
                testID={`day-${date}`}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.inner,
                    {
                      borderRadius: radius.sm,
                      backgroundColor: on ? pc.fill : colors.surface,
                      borderColor: isToday ? colors.text : colors.border,
                      borderWidth: isToday ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.topLine}>
                    <AppText variant="small" style={{ color: on ? pc.text : colors.text, fontWeight: isToday ? '900' : '600' }}>
                      {Number(date.slice(8))}
                    </AppText>
                    {d?.endsToday && !on ? <View style={[styles.tail, { backgroundColor: pc.fill }]} /> : null}
                  </View>
                  {on ? (
                    <AppText style={[styles.code, { color: pc.text }]} numberOfLines={1}>
                      {label}
                    </AppText>
                  ) : code ? (
                    <AppText style={[styles.code, { color: colors.textMuted }]}>{code}</AppText>
                  ) : null}
                  {showAll && badges.length > 0 ? (
                    <View style={styles.badges}>
                      {badges.map((p) => (
                        <View key={p} style={[styles.mini, { backgroundColor: PLATOON_COLORS[p].fill, borderColor: on ? pc.text : 'transparent' }]}>
                          <AppText style={[styles.miniText, { color: PLATOON_COLORS[p].text }]}>{p}</AppText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {layers.length > 0 ? (
                    <View style={styles.layers}>
                      {layers.map((l) =>
                        l.days.get(date)?.on ? (
                          <View key={l.profile.id} style={[styles.layer, { backgroundColor: l.profile.color }]}>
                            <AppText style={styles.layerText}>{l.profile.name.slice(0, 1).toUpperCase()}</AppText>
                          </View>
                        ) : null,
                      )}
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={[styles.legend, { marginTop: spacing.md }]}>
        {(showAll ? PLATOONS.slice(0, profile.rotation.platoonCount) : [profile.platoon]).map((p) => (
          <View key={p} style={styles.legendItem}>
            <View style={[styles.mini, { backgroundColor: PLATOON_COLORS[p].fill, width: 18, height: 18 }]}>
              <AppText style={[styles.miniText, { color: PLATOON_COLORS[p].text, fontSize: 11 }]}>{p}</AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {p === profile.platoon ? `${p} (you)` : p}
            </AppText>
          </View>
        ))}
        {layers.map((l) => (
          <View key={l.profile.id} style={styles.legendItem}>
            <View style={[styles.layer, { backgroundColor: l.profile.color, width: 18, height: 18, borderRadius: 4 }]}>
              <AppText style={[styles.layerText, { fontSize: 11 }]}>{l.profile.name.slice(0, 1).toUpperCase()}</AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {l.profile.name}
            </AppText>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.tail, { backgroundColor: pc.fill }]} />
          <AppText variant="caption" tone="muted">
            your tour ends that morning
          </AppText>
        </View>
        <AppText variant="caption" tone="muted">
          K Kelly, T traded away, T+ trade shift, OT overtime, V vacation, S sick
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  head: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  cell: { flex: 1, aspectRatio: 0.78, padding: 2 },
  inner: { flex: 1, padding: 3, overflow: 'hidden' },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tail: { width: 8, height: 4, borderRadius: 2 },
  code: { fontSize: 15, fontWeight: '900', lineHeight: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 1 },
  mini: { minWidth: 14, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  miniText: { fontSize: 9, fontWeight: '900', lineHeight: 11 },
  layers: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 2, left: 2 },
  layer: { width: 14, height: 12, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  layerText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', lineHeight: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
