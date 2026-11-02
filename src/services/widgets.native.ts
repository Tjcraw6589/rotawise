import { Platform } from 'react-native';

import type { WidgetSnapshot } from '@/lib/widgetSnapshot';

export const APP_GROUP = 'group.com.tyjcraw.rotawise';
export const SNAPSHOT_KEY = 'snapshot';

/**
 * Hands the latest snapshot to the home screen widgets.
 * iOS: writes it to the shared App Group defaults and asks WidgetKit to reload.
 * Android: asks each placed widget to re-render; the widget task handler reads the
 * same SQLite data the app uses, so nothing extra needs storing.
 */
export function publishWidgetSnapshot(snapshot: WidgetSnapshot): void {
  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
      const storage = new ExtensionStorage(APP_GROUP);
      storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
      ExtensionStorage.reloadWidget();
    } else if (Platform.OS === 'android') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { refreshAndroidWidgets } = require('@/widgets/android/refresh') as typeof import('@/widgets/android/refresh');
      void refreshAndroidWidgets();
    }
  } catch {
    // Widgets are a bonus; never let them break the app (Expo Go has no widget modules).
  }
}
