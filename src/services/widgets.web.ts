import type { WidgetSnapshot } from '@/lib/widgetSnapshot';

export const APP_GROUP = 'group.com.tyjcraw.rotawise';
export const SNAPSHOT_KEY = 'snapshot';

/** The web preview has no home screen widgets. The latest snapshot is kept for the in-app preview and tests. */
export function publishWidgetSnapshot(snapshot: WidgetSnapshot): void {
  (globalThis as { __ROTAWISE_WIDGET_SNAPSHOT__?: WidgetSnapshot }).__ROTAWISE_WIDGET_SNAPSHOT__ = snapshot;
}
