import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';

import { defaultProfile } from '@/lib/model';
import { rotationFromPreset } from '@/lib/rotation';
import { useStore } from '@/store/useStore';

import { resetStore } from '../helpers';

jest.setTimeout(60_000);

// Saturday Jan 2 2027, 9:00 local. A works Jan 1, 4, 7 ... on a 24/48 anchored Jan 1.
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2027, 0, 2, 9, 0), advanceTimers: true });
});
afterEach(() => {
  jest.useRealTimers();
});

async function press(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

/** Every string rendered on screen. */
function visibleText(): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const n = node as { children?: unknown[]; props?: { name?: string } };
    // The icon font mock renders the icon's name as text; that is not user facing copy.
    if (n.props?.name && n.children?.length === 1 && n.children[0] === n.props.name) return;
    if (n.children) n.children.forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

function expectNoHyphens(where: string): void {
  const bad = visibleText().filter((t) => /[A-Za-z]-|-[A-Za-z]| - /.test(t));
  if (bad.length) throw new Error(`Hyphen in user facing text on ${where}: ${JSON.stringify(bad)}`);
}

const proProfile = { ...defaultProfile('2027-01-01'), rotation: rotationFromPreset('24-48', '2027-01-01', null), platoon: 'A' as const };

describe('Rotawise app flow (router)', () => {
  test('onboarding sets up a rotation in a few taps and lands on Today', async () => {
    resetStore({ onboardingComplete: false });
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByTestId('onboarding');
    expectNoHyphens('onboarding');
    await press('preset-48-96');
    await press('platoon-C');
    await press('onboarding-done');
    await screen.findByTestId('today-screen');
    const s = useStore.getState();
    expect(s.settings.onboardingComplete).toBe(true);
    expect(s.profiles[0]!.rotation.presetId).toBe('48-96');
    expect(s.profiles[0]!.platoon).toBe('C');
    // Worked date defaulted to today (Jan 2): C is on Jan 2 and 3.
    expect(screen.getByTestId('today-status').props.children).toBe("You're ON");
    expectNoHyphens('today');
  });

  test('Today shows ON or OFF and the next shift', async () => {
    resetStore({ profile: proProfile });
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByTestId('today-screen');
    // The Jan 1 tour ended at 7 AM; the next one starts Jan 4.
    expect(screen.getByTestId('today-status').props.children).toBe("You're OFF");
    expect(screen.getByTestId('today-detail').props.children).toBe('Next shift in 2 days');
    expect(screen.getByTestId('today-note').props.children).toBe('Enjoy your time off.');
    // January 2027 on 24/48, A platoon: Jan 1, 4, 7 ... 31 is 11 tours, 264 hours, 20 days off.
    expect(screen.getByLabelText('Tours, 11')).toBeTruthy();
    expect(screen.getByLabelText('Hours, 264')).toBeTruthy();
    expect(screen.getByLabelText('Days off, 20')).toBeTruthy();
  });

  test('the Today card wishes you a safe tour while you are on', async () => {
    resetStore({ profile: proProfile });
    jest.setSystemTime(new Date(2027, 0, 4, 9, 0));
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByTestId('today-screen');
    expect(screen.getByTestId('today-status').props.children).toBe("You're ON");
    expect(screen.getByTestId('today-note').props.children).toBe('Stay safe out there.');
  });

  test('free users who tap a Pro feature see the one time purchase screen', async () => {
    resetStore({ profile: proProfile, isPro: false });
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByTestId('today-screen');
    await press('log-trade');
    await screen.findByTestId('pro-screen');
    expect(screen.getByTestId('pro-promise').props.children).toBe('One time purchase. Never a subscription.');
    expect(screen.getByText('Keep track of every trade')).toBeTruthy();
    expect(screen.getByTestId('pro-restore')).toBeTruthy();
    expectNoHyphens('pro');
  });

  test('a Pro user logs a trade and the calendar follows', async () => {
    resetStore({ profile: proProfile, isPro: true });
    await renderRouter('./src/app', { initialUrl: '/entry?kind=trade&date=2027-01-04' });
    await screen.findByTestId('entry-screen');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('entry-counterpart'), 'Smith');
    });
    await press('entry-save');
    await waitFor(() => expect(useStore.getState().overrides).toHaveLength(1));
    expect(useStore.getState().overrides[0]).toMatchObject({ kind: 'trade', date: '2027-01-04', direction: 'gave', counterpart: 'Smith', hours: 24, profileId: 'me' });

    await act(async () => {
      screen.unmount();
    });
    await renderRouter('./src/app', { initialUrl: '/calendar' });
    await screen.findByTestId('calendar-screen');
    expect(screen.getByTestId('day-2027-01-04').props.accessibilityLabel).toContain('traded away');
    expect(screen.getByTestId('day-2027-01-07').props.accessibilityLabel).toContain("you're on, platoon A");
    expect(screen.getByTestId('month-totals').props.children.join('')).toContain('10 tours, 240 hours');
    expectNoHyphens('calendar');

    await press('day-2027-01-04');
    await screen.findByTestId('day-sheet');
    expect(screen.getAllByTestId('day-sheet-status')[0]!.props.children.join('')).toContain('Traded away');
  });

  test('the month view can show all platoons with letters', async () => {
    resetStore({ profile: proProfile });
    await renderRouter('./src/app', { initialUrl: '/calendar' });
    await screen.findByTestId('calendar-screen');
    await press('platoon-filter-all');
    expect(useStore.getState().settings.showAllPlatoons).toBe(true);
    expect(screen.getByTestId('day-2027-01-02').props.accessibilityLabel).toContain('on duty: B');
    expect(screen.getByTestId('day-2027-01-03').props.accessibilityLabel).toContain('on duty: C');
    // On your own days the big letter is enough: no second, smaller A badge in the cell.
    const ownDay = screen.getByTestId('day-2027-01-04');
    expect(within(ownDay).getAllByText('A')).toHaveLength(1);
    expect(within(screen.getByTestId('day-2027-01-02')).getAllByText('B')).toHaveLength(1);
  });

  test('every screen renders for a Pro user, with no hyphens in the copy', async () => {
    resetStore({
      profile: proProfile,
      isPro: true,
      overrides: [
        { id: 't1', kind: 'trade', date: '2027-01-04', direction: 'gave', counterpart: 'Smith', settled: false, profileId: 'me', createdAt: '2027-01-01T00:00:00Z' },
        { id: 'x1', kind: 'extra', date: '2027-01-05', category: 'overtime', hours: 12, profileId: 'me', createdAt: '2027-01-01T00:00:00Z' },
        { id: 'l1', kind: 'leave', date: '2027-01-07', leaveType: 'vacation', profileId: 'me', createdAt: '2027-01-01T00:00:00Z' },
      ],
      settings: { pay: { kind: 'biweekly', anchorStart: '2027-01-03', paydayOffsetDays: 6, hourlyRate: 20, regularHoursPerPeriod: 106, otMultiplier: 1.5 }, leave: { vacationHours: 240, sickHours: 96, kellyDays: 17 } },
    });
    const screens: [string, string][] = [
      ['/', 'today-screen'],
      ['/calendar', 'calendar-screen'],
      ['/year', 'year-screen'],
      ['/tools', 'tools-screen'],
      ['/settings', 'settings-screen'],
      ['/rotation', 'rotation-screen'],
      ['/trades', 'trades-screen'],
      ['/overtime', 'overtime-screen'],
      ['/pay', 'pay-screen'],
      ['/leave', 'leave-screen'],
      ['/export', 'export-screen'],
      ['/profiles', 'profiles-screen'],
      ['/widgets', 'widgets-screen'],
      ['/about?doc=privacy', 'privacy-screen'],
      ['/about?doc=support', 'support-screen'],
      ['/pro', 'pro-screen'],
      ['/entry?id=x1', 'entry-screen'],
    ];
    for (const [url, id] of screens) {
      await renderRouter('./src/app', { initialUrl: url });
      await screen.findByTestId(id);
      expectNoHyphens(url);
      await act(async () => {
        screen.unmount();
      });
    }
  });

  test('Pro details: trades ledger, overtime totals, pay estimate, leave balances', async () => {
    resetStore({
      profile: proProfile,
      isPro: true,
      overrides: [
        { id: 't1', kind: 'trade', date: '2027-01-04', direction: 'gave', counterpart: 'Smith', settled: false, profileId: 'me', createdAt: '2027-01-01T00:00:00Z' },
        { id: 'x1', kind: 'extra', date: '2027-01-05', category: 'overtime', hours: 12, profileId: 'me', createdAt: '2027-01-01T00:00:00Z' },
        { id: 'l1', kind: 'leave', date: '2027-01-07', leaveType: 'vacation', profileId: 'me', createdAt: '2027-01-01T00:00:00Z' },
      ],
      settings: { pay: { kind: 'biweekly', anchorStart: '2027-01-03', paydayOffsetDays: 6, hourlyRate: 20, regularHoursPerPeriod: 106, otMultiplier: 1.5 }, leave: { vacationHours: 240, sickHours: 96, kellyDays: 17 } },
    });
    await renderRouter('./src/app', { initialUrl: '/trades' });
    await screen.findByTestId('trades-balances');
    // Smith works my Jan 4 tour, so I owe Smith.
    expect(screen.getByText('You owe 24 hours')).toBeTruthy();
    await act(async () => screen.unmount());

    await renderRouter('./src/app', { initialUrl: '/overtime' });
    await screen.findByTestId('ot-month');
    expect(screen.getAllByText('12 hours').length).toBeGreaterThan(0);
    await act(async () => screen.unmount());

    await renderRouter('./src/app', { initialUrl: '/pay' });
    await screen.findByTestId('pay-period-1');
    // Dec 20 to Jan 2 (paid Jan 8): tours Dec 20, 23, 26, 29, Jan 1 = 120 h, 106 straight + 14 overtime.
    expect(screen.getByTestId('pay-gross-0').props.children).toBe('$2,540.00');
    // Jan 3 to 16: A is credited 4, 10, 13, 16 (the Jan 4 trade still pays) = 96 h, plus 24 h vacation at straight time
    // and 12 h logged overtime: 120 x 20 + 12 x 30.
    expect(screen.getByTestId('pay-gross-1').props.children).toBe('$2,760.00');
    await act(async () => screen.unmount());

    await renderRouter('./src/app', { initialUrl: '/leave' });
    await screen.findByTestId('leave-vacation');
    expect(screen.getByText('216 hours')).toBeTruthy();
  });

  test('adding a second rotation needs Pro, then works', async () => {
    resetStore({ profile: proProfile, isPro: false });
    await renderRouter('./src/app', { initialUrl: '/profiles' });
    await screen.findByTestId('profiles-screen');
    await press('profiles-add');
    await screen.findByTestId('pro-screen');
    await act(async () => screen.unmount());

    useStore.getState().setPro(true);
    await renderRouter('./src/app', { initialUrl: '/rotation?mode=new' });
    await screen.findByTestId('rotation-screen');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('rotation-name'), 'Partner');
    });
    await press('preset-pitman');
    await press('platoon-D');
    await press('rotation-save');
    await waitFor(() => expect(useStore.getState().profiles).toHaveLength(2));
    expect(useStore.getState().profiles[1]).toMatchObject({ name: 'Partner', platoon: 'D' });
  });

  test('editing the rotation with one day later moves every shift by a day', async () => {
    resetStore({ profile: proProfile });
    await renderRouter('./src/app', { initialUrl: '/rotation' });
    await screen.findByTestId('rotation-screen');
    await press('shift-later');
    await press('rotation-save');
    await waitFor(() => expect(useStore.getState().profiles[0]!.rotation.anchorDate).not.toBe('2027-01-01'));
    const r = useStore.getState().profiles[0]!.rotation;
    const { baseShiftOn } = jest.requireActual('@/lib/rotation') as typeof import('@/lib/rotation');
    expect(baseShiftOn(r, 'A', '2027-01-02')).not.toBeNull();
    expect(baseShiftOn(r, 'A', '2027-01-01')).toBeNull();
  });
});
