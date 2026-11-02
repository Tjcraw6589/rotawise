'use no memo';
// Android home screen widgets. These are plain functions (no hooks): the widget library
// turns the returned tree into native Android views.
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';

import type { WidgetView } from '@/lib/widgetSnapshot';
import { dayCellLabel } from '@/lib/widgetSnapshot';

export interface WidgetPalette {
  background: string;
  foreground: string;
  muted: string;
  chipOff: string;
}

const c = (hex: string) => hex as ColorProp;

function PlatoonChip({ view }: { view: WidgetView }) {
  if (!view.platoon) return null;
  return (
    <FlexWidget style={{ backgroundColor: c(view.fill), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
      <TextWidget text={view.platoon} style={{ fontSize: 13, fontWeight: 'bold', color: c(view.text) }} />
    </FlexWidget>
  );
}

/** Small widget: today's status. */
export function TodayWidget({ view, palette }: { view: WidgetView; palette: WidgetPalette }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c(palette.background),
        borderRadius: 22,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={view.dateLabel} style={{ fontSize: 13, color: c(palette.muted) }} />
        <PlatoonChip view={view} />
      </FlexWidget>
      <TextWidget
        text={view.status}
        style={{ fontSize: view.ok ? 40 : 18, fontWeight: 'bold', color: c(view.on ? '#0F7A3F' : palette.foreground) }}
      />
      <TextWidget text={view.detail} maxLines={2} truncate="END" style={{ fontSize: 13, color: c(palette.foreground) }} />
    </FlexWidget>
  );
}

/** Medium widget: the next 7 days. */
export function WeekWidget({ view, palette }: { view: WidgetView; palette: WidgetPalette }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c(palette.background),
        borderRadius: 22,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text={`Today: ${view.status}`} style={{ fontSize: 17, fontWeight: 'bold', color: c(view.on ? '#0F7A3F' : palette.foreground) }} />
        </FlexWidget>
        <PlatoonChip view={view} />
      </FlexWidget>
      <TextWidget text={view.detail} maxLines={1} truncate="END" style={{ fontSize: 13, color: c(palette.muted) }} />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        {view.week.map((d) => (
          <FlexWidget key={d.date} style={{ flexDirection: 'column', alignItems: 'center', width: 38 }}>
            <TextWidget text={d.weekday.slice(0, 2)} style={{ fontSize: 11, color: c(palette.muted), fontWeight: d.isToday ? 'bold' : 'normal' }} />
            <TextWidget text={String(d.dayOfMonth)} style={{ fontSize: 13, color: c(palette.foreground), fontWeight: d.isToday ? 'bold' : 'normal' }} />
            <FlexWidget
              style={{
                marginTop: 3,
                width: 34,
                height: 24,
                borderRadius: 7,
                backgroundColor: c(d.on ? view.fill : palette.chipOff),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget text={dayCellLabel(view.platoon, d.on, d.code)} style={{ fontSize: 11, fontWeight: 'bold', color: c(d.on ? view.text : palette.muted) }} />
            </FlexWidget>
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
