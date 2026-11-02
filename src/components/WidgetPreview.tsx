import { StyleSheet, View } from 'react-native';

import type { WidgetBackground } from '@/lib/model';
import type { WidgetSnapshot } from '@/lib/widgetSnapshot';
import { dayCellLabel, widgetColors, widgetView } from '@/lib/widgetSnapshot';

import { AppText } from './AppText';

interface WidgetPreviewProps {
  snapshot: WidgetSnapshot;
  date: string;
  minutes: number;
  background: WidgetBackground;
  dark: boolean;
}

/**
 * An in app drawing of the two home screen widgets, built from the same snapshot and
 * rules the real widgets use. It is a preview: the real widgets are native views.
 */
export function WidgetPreview({ snapshot, date, minutes, background, dark }: WidgetPreviewProps) {
  const view = widgetView(snapshot, date, minutes);
  const p = widgetColors(background, dark, snapshot.fill, snapshot.text);
  const onColor = background === 'platoon' ? p.foreground : dark || background === 'dark' ? '#5BD38A' : '#0F7A3F';
  const chip = (
    <View style={[styles.chip, { backgroundColor: view.fill }]}>
      <AppText style={[styles.chipText, { color: view.text }]}>{view.platoon}</AppText>
    </View>
  );
  return (
    <View style={styles.row} testID="widget-preview">
      <View style={[styles.small, { backgroundColor: p.background }]} testID="widget-preview-small">
        <View style={styles.top}>
          <AppText style={{ color: p.muted, fontSize: 12 }}>{view.dateLabel}</AppText>
          {chip}
        </View>
        <AppText style={{ color: view.on ? onColor : p.foreground, fontSize: 38, fontWeight: '900' }}>{view.status}</AppText>
        <AppText style={{ color: p.foreground, fontSize: 12 }} numberOfLines={2}>
          {view.detail}
        </AppText>
      </View>
      <View style={[styles.medium, { backgroundColor: p.background }]} testID="widget-preview-medium">
        <View style={styles.top}>
          <AppText style={{ color: view.on ? onColor : p.foreground, fontSize: 16, fontWeight: '800' }}>Today: {view.status}</AppText>
          {chip}
        </View>
        <AppText style={{ color: p.muted, fontSize: 11 }} numberOfLines={1}>
          {view.detail}
        </AppText>
        <View style={styles.week}>
          {view.week.map((d) => (
            <View key={d.date} style={styles.cell}>
              <AppText style={{ color: p.muted, fontSize: 10, fontWeight: d.isToday ? '800' : '400' }}>{d.weekday.slice(0, 2)}</AppText>
              <AppText style={{ color: p.foreground, fontSize: 12, fontWeight: d.isToday ? '800' : '400' }}>{d.dayOfMonth}</AppText>
              <View style={[styles.pill, { backgroundColor: d.on ? view.fill : p.chipOff }]}>
                <AppText style={{ color: d.on ? view.text : p.muted, fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
                  {dayCellLabel(view.platoon, d.on, d.code)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  small: { width: 158, height: 158, borderRadius: 22, padding: 14, justifyContent: 'space-between' },
  medium: { width: 338, maxWidth: '100%', height: 158, borderRadius: 22, padding: 14, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 1 },
  chipText: { fontSize: 13, fontWeight: '900' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', flex: 1 },
  pill: { marginTop: 2, width: 34, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
