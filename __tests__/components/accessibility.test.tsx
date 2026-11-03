import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen, within } from 'expo-router/testing-library';
import { Dimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { Sheet } from '@/components/Sheet';
import { WidgetPreview } from '@/components/WidgetPreview';
import { defaultProfile } from '@/lib/model';
import { rotationFromPreset } from '@/lib/rotation';
import { buildSnapshot } from '@/lib/widgetSnapshot';

import { resetStore } from '../helpers';

jest.setTimeout(60_000);

const metrics = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const profile = { ...defaultProfile('2027-01-01'), rotation: rotationFromPreset('24-48', '2027-01-01', null), platoon: 'A' as const };

describe('accessibility basics', () => {
  beforeEach(() => resetStore({ profile }));

  it('keeps every button size at least 44 points tall and lets it grow with large text', async () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      await render(<Button label="Restore purchases" size={size} onPress={() => undefined} testID={`b-${size}`} />);
      const style = StyleSheet.flatten(screen.getByTestId(`b-${size}`).props.style as never) as { height?: number; minHeight?: number };
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it('lets body text follow the text size setting but caps the biggest headings', async () => {
    await render(
      <>
        <AppText testID="body">Body</AppText>
        <AppText variant="hero" testID="hero">
          ON
        </AppText>
      </>,
    );
    expect(screen.getByTestId('body').props.maxFontSizeMultiplier).toBeUndefined();
    expect(screen.getByTestId('hero').props.maxFontSizeMultiplier).toBe(1.3);
  });

  it('marks section titles as headings for VoiceOver', async () => {
    await render(
      <>
        <SectionHeader title="Rotation" inset />
        <SectionHeader title="Your schedule" />
      </>,
    );
    expect(screen.getByText('Rotation').props.accessibilityRole).toBe('header');
    expect(screen.getByText('Your schedule').props.accessibilityRole).toBe('header');
  });

  it('closes a sheet with the VoiceOver escape gesture and the close button', async () => {
    const onClose = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Sheet visible onClose={onClose} title="My platoon" testID="sheet">
          <AppText>Pick one</AppText>
        </Sheet>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('sheet-grabber')).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByTestId('sheet'), 'accessibilityEscape');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(screen.getByTestId('sheet-close'));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('reads each widget preview as one summary', async () => {
    const snapshot = buildSnapshot({ profile, overrides: [], today: '2027-01-01', hour12: true, background: 'system', days: 10 });
    await render(<WidgetPreview snapshot={snapshot} date="2027-01-01" minutes={9 * 60} background="system" dark={false} />);
    const small = screen.getByTestId('widget-preview-small');
    expect(small.props.accessible).toBe(true);
    expect(small.props.accessibilityLabel).toMatch(/^Today widget preview: Fri, Jan 1, ON, platoon A\./);
    const medium = screen.getByTestId('widget-preview-medium').props.accessibilityLabel as string;
    expect(medium).toContain('Next 7 days widget preview: today ON.');
    expect(medium).toContain('Mon 4 on');
    expect(medium).not.toMatch(/[A-Za-z]-|-[A-Za-z]/);
  });
});

describe('Pro screen layout', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2027, 0, 2, 9, 0), advanceTimers: true });
    resetStore({ profile, isPro: false });
  });
  afterEach(() => jest.useRealTimers());

  it('pins the buy button, Restore purchases and Not now below the scrolling list', async () => {
    await renderRouter('./src/app', { initialUrl: '/pro?reason=general' });
    await routerScreen.findByTestId('pro-screen');
    const scroll = routerScreen.getByTestId('pro-screen-scroll');
    expect(within(scroll).getByText('Trades and swaps ledger')).toBeTruthy();
    for (const id of ['pro-buy', 'pro-restore', 'pro-not-now']) {
      expect(routerScreen.getByTestId(id)).toBeTruthy();
      expect(within(scroll).queryByTestId(id)).toBeNull();
    }
  });

  it('lets the buy area scroll with the page at the largest text sizes', async () => {
    const real = Dimensions.get('window');
    const spy = jest.spyOn(Dimensions, 'get').mockReturnValue({ ...real, fontScale: 3.1 });
    try {
      await renderRouter('./src/app', { initialUrl: '/pro?reason=general' });
      await routerScreen.findByTestId('pro-screen');
      const scroll = routerScreen.getByTestId('pro-screen-scroll');
      expect(within(scroll).getByTestId('pro-buy')).toBeTruthy();
      expect(within(scroll).getByTestId('pro-restore')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});
