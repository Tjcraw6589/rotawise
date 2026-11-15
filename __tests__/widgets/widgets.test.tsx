import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import { defaultProfile } from '@/lib/model';
import { rotationFromPreset } from '@/lib/rotation';
import { SNAPSHOT_VERSION, buildSnapshot } from '@/lib/widgetSnapshot';
import { useStore } from '@/store/useStore';

import { resetStore } from '../helpers';

interface Tree {
  type: string;
  props: Record<string, unknown>;
  children?: Tree[];
}

function texts(tree: Tree): string[] {
  const own = tree.type === 'TextWidget' ? [String(tree.props.text)] : [];
  return own.concat(...(tree.children ?? []).map(texts));
}

const profile = { ...defaultProfile('2027-01-01'), rotation: rotationFromPreset('24-48', '2027-01-01', null), platoon: 'B' as const };
const snapshot = buildSnapshot({ profile, overrides: [], today: '2027-01-02', hour12: true, background: 'system' });

describe('Android widgets', () => {
  // render.tsx reads the app's database; these tests pass a snapshot directly.
  const { renderWidget } = require('@/widgets/android/render') as typeof import('@/widgets/android/render');

  it('the small widget builds a valid native tree with today\'s status', () => {
    const rep = renderWidget('Today', snapshot, new Date(2027, 0, 2, 9, 0));
    if (!('light' in rep)) throw new Error('expected light and dark versions');
    const light = buildWidgetTree(rep.light) as unknown as Tree;
    expect(light.type).toBe('LinearLayoutWidget');
    expect(texts(light)).toEqual(['Sat, Jan 2', 'B', 'ON', '24 hour tour until 7 AM tomorrow']);
    expect(rep.dark).not.toBeNull();
    const dark = buildWidgetTree(rep.dark!) as unknown as Tree;
    expect(texts(dark)).toEqual(texts(light));
  });

  it('the medium widget shows seven days with the platoon letter on work days', () => {
    const rep = renderWidget('Week', snapshot, new Date(2027, 0, 3, 12, 0));
    if (!('light' in rep)) throw new Error('expected light and dark versions');
    const t = texts(buildWidgetTree(rep.light) as unknown as Tree);
    expect(t.slice(0, 3)).toEqual(['Today: OFF', 'B', 'Next shift in 2 days']);
    // Sun 3 .. Sat 9: B works Jan 5 and Jan 8.
    expect(t.slice(3)).toEqual(['Su', '3', 'off', 'Mo', '4', 'off', 'Tu', '5', 'B', 'We', '6', 'off', 'Th', '7', 'off', 'Fr', '8', 'B', 'Sa', '9', 'off']);
  });

  it('the small widget shows ON for every shift of a day, not just the first', () => {
    // B works Jan 2 and Jan 5. An early hireback on Jan 5 starts before the tour, and
    // Jan 3 has a morning shift and evening overtime.
    const busy = buildSnapshot({
      profile,
      overrides: [
        { id: 'hb', kind: 'extra', date: '2027-01-05', category: 'callback', hours: 4, startMinutes: 3 * 60 },
        { id: 'am', kind: 'extra', date: '2027-01-03', category: 'overtime', hours: 4, startMinutes: 6 * 60 },
        { id: 'pm', kind: 'extra', date: '2027-01-03', category: 'overtime', hours: 4, startMinutes: 18 * 60 },
      ],
      today: '2027-01-02',
      hour12: true,
      background: 'system',
    });
    const small = (at: Date) => {
      const rep = renderWidget('Today', busy, at);
      if (!('light' in rep)) throw new Error('expected light and dark versions');
      return texts(buildWidgetTree(rep.light) as unknown as Tree);
    };
    expect(small(new Date(2027, 0, 3, 19, 0))).toEqual(['Sun, Jan 3', 'B', 'ON', 'Extra shift until 10 PM today']);
    expect(small(new Date(2027, 0, 5, 9, 0))).toEqual(['Tue, Jan 5', 'B', 'ON', '24 hour tour until 7 AM tomorrow']);
  });

  it('a platoon colored widget has no separate dark version', () => {
    const colored = buildSnapshot({ profile, overrides: [], today: '2027-01-02', hour12: true, background: 'platoon' });
    const rep = renderWidget('Today', colored, new Date(2027, 0, 2, 9, 0));
    expect('light' in rep && rep.dark).toBeNull();
  });

  it('the task handler draws from the saved data when Android asks', async () => {
    const { widgetTaskHandler } = require('@/widgets/android/handler') as typeof import('@/widgets/android/handler');
    const renderWidgetFn = jest.fn();
    await widgetTaskHandler({
      widgetAction: 'WIDGET_UPDATE',
      widgetInfo: { widgetName: 'Week', widgetId: 1, width: 300, height: 150, screenInfo: { screenHeightDp: 800, screenWidthDp: 400, density: 3, densityDpi: 480, fontScale: 1 } },
      renderWidget: renderWidgetFn,
    });
    expect(renderWidgetFn).toHaveBeenCalledTimes(1);
    const rep = renderWidgetFn.mock.calls[0][0];
    expect(() => buildWidgetTree(rep.light)).not.toThrow();
    await widgetTaskHandler({
      widgetAction: 'WIDGET_DELETED',
      widgetInfo: { widgetName: 'Week', widgetId: 1, width: 300, height: 150, screenInfo: { screenHeightDp: 800, screenWidthDp: 400, density: 3, densityDpi: 480, fontScale: 1 } },
      renderWidget: renderWidgetFn,
    });
    expect(renderWidgetFn).toHaveBeenCalledTimes(1);
  });

  it('refresh asks both widget kinds to redraw', async () => {
    const lib = require('react-native-android-widget') as { requestWidgetUpdate: jest.Mock };
    lib.requestWidgetUpdate.mockClear();
    const { refreshAndroidWidgets } = require('@/widgets/android/refresh') as typeof import('@/widgets/android/refresh');
    await refreshAndroidWidgets();
    expect(lib.requestWidgetUpdate.mock.calls.map((c) => c[0].widgetName)).toEqual(['Today', 'Week']);
  });
});

describe('iOS widget data', () => {
  it('the app writes the snapshot to the App Group and reloads the widgets on every change', () => {
    resetStore({ onboardingComplete: true });
    const targets = require('@bacons/apple-targets') as { ExtensionStorage: { reloadWidget: jest.Mock }; __store: Map<string, unknown> };
    targets.ExtensionStorage.reloadWidget.mockClear();
    const { syncWidgets } = require('@/services/widgetSync') as typeof import('@/services/widgetSync');
    syncWidgets(true);
    const raw = targets.__store.get('snapshot') as string;
    const parsed = JSON.parse(raw);
    expect(parsed.v).toBe(SNAPSHOT_VERSION);
    expect(parsed.platoon).toBe('A');
    expect(targets.ExtensionStorage.reloadWidget).toHaveBeenCalledTimes(1);

    // No change: no extra reload.
    syncWidgets();
    expect(targets.ExtensionStorage.reloadWidget).toHaveBeenCalledTimes(1);

    // Changing the platoon republishes.
    useStore.getState().setPlatoon('me', 'C');
    syncWidgets();
    expect(JSON.parse(targets.__store.get('snapshot') as string).platoon).toBe('C');
    expect(targets.ExtensionStorage.reloadWidget).toHaveBeenCalledTimes(2);
  });

  it('free users get the automatic widget background even if a Pro color was saved', () => {
    resetStore({ onboardingComplete: true, isPro: false, settings: { widgetBackground: 'platoon' } });
    const targets = require('@bacons/apple-targets') as { __store: Map<string, unknown> };
    const { syncWidgets } = require('@/services/widgetSync') as typeof import('@/services/widgetSync');
    syncWidgets(true);
    expect(JSON.parse(targets.__store.get('snapshot') as string).bg).toBe('system');
  });
});
