import { requestWidgetUpdate } from 'react-native-android-widget';

import { WIDGET_NAMES, currentSnapshot, renderWidget } from './render';

/** Redraw every placed widget now (called by the app after any change). */
export async function refreshAndroidWidgets(): Promise<void> {
  const snapshot = currentSnapshot();
  for (const widgetName of WIDGET_NAMES) {
    await requestWidgetUpdate({ widgetName, renderWidget: () => renderWidget(widgetName, snapshot) });
  }
}
