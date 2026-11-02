'use no memo';
import type { WidgetRepresentation } from 'react-native-android-widget';

import { buildSnapshot, widgetColors, widgetView } from '@/lib/widgetSnapshot';
import type { WidgetSnapshot } from '@/lib/widgetSnapshot';
import { localISO, localMinutes } from '@/lib/rotation';
import { docStore } from '@/store/storage';
import { loadData } from '@/store/useStore';

import { TodayWidget, WeekWidget } from './RotawiseWidgets';

export const WIDGET_NAMES = ['Today', 'Week'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

/** Fresh snapshot straight from the app's SQLite data (works when the app is closed). */
export function currentSnapshot(now: Date = new Date()): WidgetSnapshot {
  const data = loadData(docStore);
  const profile = data.profiles.find((p) => p.id === data.settings.activeProfileId) ?? data.profiles[0]!;
  const overrides = data.overrides.filter((o) => o.profileId === profile.id);
  const background = data.meta.isPro ? data.settings.widgetBackground : 'system';
  return buildSnapshot({ profile, overrides, today: localISO(now), hour12: data.settings.hour12, background, days: 14 });
}

/** Light and dark versions; Android picks the one matching the launcher's theme. */
export function renderWidget(name: string, snapshot: WidgetSnapshot, now: Date = new Date()): WidgetRepresentation {
  const view = widgetView(snapshot, localISO(now), localMinutes(now));
  const Component = name === 'Week' ? WeekWidget : TodayWidget;
  const light = widgetColors(snapshot.bg, false, snapshot.fill, snapshot.text);
  const dark = widgetColors(snapshot.bg, true, snapshot.fill, snapshot.text);
  return {
    light: <Component view={view} palette={light} />,
    dark: snapshot.bg === 'system' ? <Component view={view} palette={dark} /> : null,
  };
}
