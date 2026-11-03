import { StyleSheet, View } from 'react-native';

import type { WidgetBackground } from '@/lib/model';
import type { WidgetSnapshot } from '@/lib/widgetSnapshot';
import { dayCellLabel, widgetColors, widgetView } from '@/lib/widgetSnapshot';

import { AppText, type AppTextProps } from './AppText';

interface WidgetPreviewProps {
  snapshot: WidgetSnapshot;
  date: string;
  minutes: number;
  background: WidgetBackground;
  dark: boolean;
}

/** The preview is a fixed size drawing of a widget, so its text grows only a little with the text size setting. */
function T(props: AppTextProps) {
  return <AppText maxFontSizeMultiplier={1.2} {...props} />;
}

/**
 * An in app drawing of the two home screen widgets, built from the same snapshot and
 * rules the real widgets use. It is a preview: the real widgets are native views.
 * VoiceOver reads each widget as one summary instead of a dozen fragments.
 */
export function WidgetPreview({ snapshot, date, minutes, background, dark }: WidgetPreviewProps) {
  const view = widgetView(snapshot, date, minutes);
  const p = widgetColors(background, dark, snapshot.fill, snapshot.text);
  const onColor = background === 'platoon' ? p.foreground : dark || background === 'dark' ? '#5BD38A' : '#0F7A3F';
  const platoon = view.platoon ? `, platoon ${view.platoon}` : '';
  const smallLabel = `Today widget preview: ${view.dateLabel}, ${view.status}${platoon}. ${view.detail}`;
  const weekLabel = view.week.map((d) => `${d.weekday} ${d.dayOfMonth} ${d.on ? 'on' : 'off'}`).join(', ');
  const mediumLabel = `Next 7 days widget preview: today ${view.status}. ${view.detail}. ${weekLabel}`;
  const chip = (
    <View style={[styles.chip, { backgroundColor: view.fill }]}>
      <T style={[styles.chipText, { color: view.text }]}>{view.platoon}</T>
    </View>
  );
  return (
    <View style={styles.row} testID="widget-preview">
      <View style={[styles.small, { backgroundColor: p.background }]} accessible accessibilityLabel={smallLabel} testID="widget-preview-small">
        <View style={styles.top}>
          <T style={{ color: p.muted, fontSize: 12 }}>{view.dateLabel}</T>
          {chip}
        </View>
        <T style={{ color: view.on ? onColor : p.foreground, fontSize: 38, fontWeight: '900' }}>{view.status}</T>
        <T style={{ color: p.foreground, fontSize: 12 }} numberOfLines={2}>
          {view.detail}
        </T>
      </View>
      <View style={[styles.medium, { backgroundColor: p.background }]} accessible accessibilityLabel={mediumLabel} testID="widget-preview-medium">
        <View style={styles.top}>
          <T style={{ color: view.on ? onColor : p.foreground, fontSize: 16, fontWeight: '800' }}>Today: {view.status}</T>
          {chip}
        </View>
        <T style={{ color: p.muted, fontSize: 11 }} numberOfLines={1}>
          {view.detail}
        </T>
        <View style={styles.week}>
          {view.week.map((d) => (
            <View key={d.date} style={styles.cell}>
              <T style={{ color: p.muted, fontSize: 10, fontWeight: d.isToday ? '800' : '400' }}>{d.weekday.slice(0, 2)}</T>
              <T style={{ color: p.foreground, fontSize: 12, fontWeight: d.isToday ? '800' : '400' }}>{d.dayOfMonth}</T>
              <View style={[styles.pill, { backgroundColor: d.on ? view.fill : p.chipOff }]}>
                <T style={{ color: d.on ? view.text : p.muted, fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
                  {dayCellLabel(view.platoon, d.on, d.code)}
                </T>
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
  small: { width: 158, height: 158, borderRadius: 22, padding: 14, justifyContent: 'space-between', borderWidth: 1, borderColor: '#8A96A355' },
  medium: { width: 338, maxWidth: '100%', height: 158, borderRadius: 22, padding: 14, justifyContent: 'space-between', borderWidth: 1, borderColor: '#8A96A355' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 1 },
  chipText: { fontSize: 13, fontWeight: '900' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', flex: 1 },
  pill: { marginTop: 2, width: 34, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
