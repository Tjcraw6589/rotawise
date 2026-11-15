import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';

import { defaultProfile } from '@/lib/model';
import { rotationFromPreset } from '@/lib/rotation';
import * as purchases from '@/services/purchases';
import { useStore } from '@/store/useStore';

import { resetStore } from '../helpers';

jest.mock('@/services/purchases', () => {
  const { createStatusStore } = jest.requireActual('@/services/statusStore') as typeof import('@/services/statusStore');
  const status = createStatusStore<string>('ready');
  return {
    __esModule: true,
    __status: status,
    usePurchasesStatus: status.use,
    getPurchasesStatus: status.get,
    configurePurchases: jest.fn(async () => undefined),
    refreshPurchases: jest.fn(async () => status.get()),
    fetchProOffer: jest.fn(),
    purchasePro: jest.fn(),
    restorePro: jest.fn(),
    purchasesSupported: true,
    billingStoreName: () => 'Apple',
    storeAccountName: () => 'Apple Account',
  };
});

jest.setTimeout(60_000);

type Mocked = Omit<typeof purchases, 'purchasesSupported'> & {
  __status: { set: (s: purchases.StoreStatus) => void };
  purchasesSupported: boolean;
  fetchProOffer: jest.Mock;
  purchasePro: jest.Mock;
  restorePro: jest.Mock;
  refreshPurchases: jest.Mock;
};
const store = purchases as unknown as Mocked;
const OFFER = { priceString: '$9.99', productId: 'rotawise_pro_lifetime', title: 'Rotawise Pro' };
const profile = { ...defaultProfile('2027-01-01'), rotation: rotationFromPreset('24-48', '2027-01-01', null), platoon: 'A' as const };

/** Sets the store status before a screen is rendered. */
function setStatus(s: purchases.StoreStatus): void {
  store.__status.set(s);
}

async function press(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

/** The Notice with this testID shows exactly this message. */
function expectMessage(testID: string, text: string): void {
  expect(within(screen.getByTestId(testID)).getByText(text)).toBeTruthy();
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2027, 0, 2, 9, 0), advanceTimers: true });
  resetStore({ profile, isPro: false });
  store.__status.set('ready');
  store.purchasesSupported = true;
  store.fetchProOffer.mockReset().mockResolvedValue(OFFER);
  store.purchasePro.mockReset();
  store.restorePro.mockReset();
  store.refreshPurchases.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('Pro screen purchase messages', () => {
  async function openPro(): Promise<void> {
    await renderRouter('./src/app', { initialUrl: '/pro?reason=general' });
    await screen.findByTestId('pro-screen');
    await waitFor(() => expect(screen.getByText('Unlock Pro for $9.99')).toBeTruthy());
  }

  it('says Apple is still confirming when the payment is pending, never that it failed', async () => {
    store.purchasePro.mockResolvedValue('pending');
    await openPro();
    await press('pro-buy');
    expectMessage('pro-message', 'Apple is still confirming your purchase. Pro unlocks as soon as it does. If it does not, tap Restore purchases.');
    expect(screen.queryByText(/did not go through|not charged/)).toBeNull();
    expect(useStore.getState().meta.isPro).toBe(false);
  });

  it('never claims the user was not charged when Pro could not be confirmed', async () => {
    store.purchasePro.mockResolvedValue('failed');
    await openPro();
    await press('pro-buy');
    expectMessage('pro-message', 'Pro could not be confirmed. If you were charged, tap Restore purchases or try again in a minute.');
    expect(screen.queryByText(/not charged/)).toBeNull();
  });

  it('keeps the friendly cancelled message', async () => {
    store.purchasePro.mockResolvedValue('cancelled');
    await openPro();
    await press('pro-buy');
    expectMessage('pro-message', 'No problem. Everything in the free version keeps working.');
  });
});

describe('Pro screen when the store is unavailable', () => {
  it('offers Try again, which reconnects and loads the price', async () => {
    store.__status.set('unavailable');
    store.refreshPurchases.mockImplementation(async () => {
      store.__status.set('ready');
      return 'ready';
    });
    await renderRouter('./src/app', { initialUrl: '/pro?reason=general' });
    await screen.findByTestId('pro-screen');
    expect(screen.getByTestId('store-unavailable')).toBeTruthy();
    expect(screen.getByTestId('pro-buy').props.accessibilityState?.disabled).toBe(true);

    await press('store-unavailable-action');
    await waitFor(() => expect(screen.getByText('Unlock Pro for $9.99')).toBeTruthy());
    expect(store.refreshPurchases).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('store-unavailable')).toBeNull();
    for (const id of ['pro-buy', 'pro-restore', 'pro-not-now']) expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('offers Try again when the store is up but the offer did not load', async () => {
    store.fetchProOffer.mockResolvedValueOnce(null);
    await renderRouter('./src/app', { initialUrl: '/pro?reason=general' });
    await screen.findByTestId('pro-screen');
    await waitFor(() => expect(store.fetchProOffer).toHaveBeenCalled());
    await press('store-unavailable-action');
    await waitFor(() => expect(screen.getByText('Unlock Pro for $9.99')).toBeTruthy());
  });

  it('has no Try again on the web, where there is no store', async () => {
    store.purchasesSupported = false;
    store.__status.set('unavailable');
    await renderRouter('./src/app', { initialUrl: '/pro?reason=general' });
    await screen.findByTestId('pro-screen');
    expect(screen.getByTestId('store-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('store-unavailable-action')).toBeNull();
  });
});

describe('Settings restore messages', () => {
  async function restoreFromSettings(): Promise<void> {
    await renderRouter('./src/app', { initialUrl: '/settings' });
    await screen.findByTestId('settings-screen');
    await press('settings-restore');
    await screen.findByTestId('settings-message');
  }

  it('asks iPhone users to check their connection, not to use the iPhone app', async () => {
    store.restorePro.mockResolvedValue('failed');
    setStatus('unavailable');
    await restoreFromSettings();
    expectMessage('settings-message', 'The store could not be reached. Check your connection and try again.');
    expect(screen.queryByText(/iPhone and Android apps/)).toBeNull();
    expect(store.refreshPurchases).toHaveBeenCalledTimes(1);
  });

  it('says it is still connecting while the store loads', async () => {
    store.restorePro.mockResolvedValue('failed');
    setStatus('loading');
    await restoreFromSettings();
    expectMessage('settings-message', 'Still connecting to the App Store. Try again in a moment.');
  });

  it('only mentions the phone apps on the web', async () => {
    store.restorePro.mockResolvedValue('failed');
    store.purchasesSupported = false;
    setStatus('unavailable');
    await restoreFromSettings();
    expectMessage('settings-message', 'Purchases work in the iPhone and Android apps.');
    expect(store.refreshPurchases).not.toHaveBeenCalled();
  });
});
