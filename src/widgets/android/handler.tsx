'use no memo';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { currentSnapshot, renderWidget } from './render';

/**
 * Runs in the background when Android asks a widget to draw: when it is added, resized,
 * and on the update period (every 30 minutes, the shortest Android allows), so the
 * widget rolls over to the new day on its own.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      props.renderWidget(renderWidget(props.widgetInfo.widgetName, currentSnapshot()));
      break;
    default:
      break;
  }
}
