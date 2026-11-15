/**
 * The native purchases service, run against the RevenueCat mock from jest.setup.ts.
 * Each test loads a fresh copy so the "configure once" state does not leak between tests.
 */
jest.mock('@/config/monetization', () => ({
  IS_EXPO_GO: false,
  PRO_ENTITLEMENT: 'pro',
  PRO_PRODUCT_ID: 'rotawise_pro_lifetime',
  revenueCatApiKey: () => 'appl_test_key',
}));

type Service = typeof import('@/services/purchases.native');
type RevenueCatMock = {
  default: Record<string, jest.Mock>;
  PURCHASES_ERROR_CODE: Record<string, string>;
};

const PRO = { entitlements: { active: { pro: { identifier: 'pro' } } } };
const FREE = { entitlements: { active: {} } };
const PACKAGE = { identifier: '$rc_lifetime', product: { identifier: 'rotawise_pro_lifetime', priceString: '$9.99', title: 'Rotawise Pro' } };

// The service requires RevenueCat lazily, after isolateModules has returned, so it always gets this shared mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rc = require('react-native-purchases') as RevenueCatMock;

beforeEach(() => {
  jest.clearAllMocks();
  rc.default.getOfferings!.mockResolvedValue({ current: { availablePackages: [PACKAGE], lifetime: PACKAGE }, all: {} });
});
afterEach(() => {
  delete rc.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR;
});

function load(): { service: Service; rc: RevenueCatMock } {
  let service!: Service;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('@/services/purchases.native') as Service;
  });
  return { service, rc };
}

describe('configurePurchases', () => {
  it('is ready once configured, even when the first customer check fails offline', async () => {
    const { service, rc } = load();
    rc.default.getCustomerInfo!.mockRejectedValueOnce(new Error('offline'));
    const onPro = jest.fn();
    await service.configurePurchases(onPro);
    expect(rc.default.configure).toHaveBeenCalledWith({ apiKey: 'appl_test_key' });
    expect(service.getPurchasesStatus()).toBe('ready');
    expect(onPro).not.toHaveBeenCalled();
  });

  it('reports Pro from the first customer check', async () => {
    const { service, rc } = load();
    rc.default.getCustomerInfo!.mockResolvedValueOnce(PRO);
    const onPro = jest.fn();
    await service.configurePurchases(onPro);
    expect(onPro).toHaveBeenCalledWith(true);
  });

  it('is unavailable when configuring throws, and Try again can recover it', async () => {
    const { service, rc } = load();
    rc.default.configure!.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const onPro = jest.fn();
    await service.configurePurchases(onPro);
    expect(service.getPurchasesStatus()).toBe('unavailable');

    rc.default.getCustomerInfo!.mockResolvedValueOnce(PRO);
    await expect(service.refreshPurchases()).resolves.toBe('ready');
    expect(service.getPurchasesStatus()).toBe('ready');
    expect(rc.default.configure).toHaveBeenCalledTimes(2);
    expect(onPro).toHaveBeenCalledWith(true);
  });
});

describe('refreshPurchases', () => {
  it('checks the customer again once the connection is back', async () => {
    const { service, rc } = load();
    rc.default.getCustomerInfo!.mockRejectedValueOnce(new Error('offline'));
    const onPro = jest.fn();
    await service.configurePurchases(onPro);
    rc.default.getCustomerInfo!.mockResolvedValueOnce(PRO);
    await expect(service.refreshPurchases()).resolves.toBe('ready');
    expect(onPro).toHaveBeenCalledWith(true);
    expect(rc.default.configure).toHaveBeenCalledTimes(1);
  });

  it('does nothing before the app has configured purchases', async () => {
    const { service, rc } = load();
    await expect(service.refreshPurchases()).resolves.toBe('unconfigured');
    expect(rc.default.configure).not.toHaveBeenCalled();
  });
});

describe('purchasePro', () => {
  async function ready(): Promise<{ service: Service; rc: RevenueCatMock }> {
    const loaded = load();
    await loaded.service.configurePurchases(jest.fn());
    return loaded;
  }

  it('is purchased when the Pro entitlement is active', async () => {
    const { service, rc } = await ready();
    rc.default.purchasePackage!.mockResolvedValueOnce({ customerInfo: PRO });
    await expect(service.purchasePro()).resolves.toBe('purchased');
  });

  it('is pending, not failed, when the store finished but Pro is not active yet', async () => {
    const { service, rc } = await ready();
    rc.default.purchasePackage!.mockResolvedValueOnce({ customerInfo: FREE });
    await expect(service.purchasePro()).resolves.toBe('pending');
  });

  it('is pending while the payment waits for approval (Ask to Buy)', async () => {
    const { service, rc } = await ready();
    rc.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR = '20';
    rc.default.purchasePackage!.mockRejectedValueOnce({ code: '20', userCancelled: false });
    await expect(service.purchasePro()).resolves.toBe('pending');
  });

  it('is cancelled when the user backs out', async () => {
    const { service, rc } = await ready();
    rc.default.purchasePackage!.mockRejectedValueOnce({ code: '1', userCancelled: true });
    await expect(service.purchasePro()).resolves.toBe('cancelled');
  });

  it('is failed for other store errors, including ones without a code', async () => {
    const { service, rc } = await ready();
    rc.default.purchasePackage!.mockRejectedValueOnce({ code: '10', userCancelled: false });
    await expect(service.purchasePro()).resolves.toBe('failed');
    rc.default.purchasePackage!.mockRejectedValueOnce(new Error('no code'));
    await expect(service.purchasePro()).resolves.toBe('failed');
  });
});

describe('web build', () => {
  it('has a harmless refreshPurchases so shared screens type check', async () => {
    const web = jest.requireActual('@/services/purchases.web') as typeof import('@/services/purchases.web');
    await expect(web.refreshPurchases()).resolves.toBe('unavailable');
    expect(web.purchasesSupported).toBe(false);
  });
});
