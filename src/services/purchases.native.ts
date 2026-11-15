import { Platform } from 'react-native';

import { IS_EXPO_GO, PRO_ENTITLEMENT, PRO_PRODUCT_ID, revenueCatApiKey } from '@/config/monetization';

import { createStatusStore } from './statusStore';

export type StoreStatus = 'unconfigured' | 'loading' | 'ready' | 'unavailable';

export interface ProOffer {
  priceString: string;
  productId: string;
  title: string;
}

/** 'pending' means the store took the payment or is waiting on approval (Ask to Buy) but Pro is not active yet. */
export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled' | 'failed';
export type RestoreOutcome = 'restored' | 'none' | 'failed';

type PurchasesModule = typeof import('react-native-purchases');
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

const status = createStatusStore<StoreStatus>('unconfigured');
export const usePurchasesStatus = status.use;
export const getPurchasesStatus = status.get;

let purchasesModule: PurchasesModule | null | undefined;
let configured = false;
let proListener: ((isPro: boolean) => void) | null = null;
let cachedPackage: PurchasesPackage | null = null;

function loadModule(): PurchasesModule | null {
  if (purchasesModule !== undefined) return purchasesModule;
  if (IS_EXPO_GO) {
    purchasesModule = null;
    return purchasesModule;
  }
  try {
    // Lazy on purpose: a static import evaluates the native billing module at startup and crashes Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchasesModule = require('react-native-purchases') as PurchasesModule;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

export function hasProEntitlement(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[PRO_ENTITLEMENT] !== 'undefined';
}

/** Reads the customer's entitlements. Failing (offline, say) is not fatal: the store still works once the connection is back. */
async function checkCustomerInfo(mod: PurchasesModule): Promise<void> {
  try {
    const info = await mod.default.getCustomerInfo();
    proListener?.(hasProEntitlement(info));
  } catch {
    // Keep the current Pro state; the update listener or the next refresh reports changes.
  }
}

/**
 * Configures RevenueCat once and reports entitlement changes. Without an API key
 * (fresh clone, Expo Go, web preview) the store is marked unavailable and the
 * Pro screen explains that instead of failing. Configuring works offline, so the
 * store is ready as soon as it succeeds; the entitlement check runs after that.
 */
export async function configurePurchases(onProChange: (isPro: boolean) => void): Promise<void> {
  proListener = onProChange;
  if (configured) return;
  const mod = loadModule();
  const apiKey = revenueCatApiKey();
  if (!mod || !apiKey) {
    status.set('unavailable');
    return;
  }
  status.set('loading');
  try {
    const Purchases = mod.default;
    Purchases.setLogLevel(__DEV__ ? mod.LOG_LEVEL.WARN : mod.LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    Purchases.addCustomerInfoUpdateListener((info) => proListener?.(hasProEntitlement(info)));
    configured = true;
  } catch {
    status.set('unavailable');
    return;
  }
  status.set('ready');
  await checkCustomerInfo(mod);
}

/**
 * Checks the store again, for a Try again button. Retries configuring if that failed
 * earlier, otherwise re-reads the customer's entitlements. Resolves to the new status.
 */
export async function refreshPurchases(): Promise<StoreStatus> {
  if (!configured) {
    if (proListener) await configurePurchases(proListener);
    return status.get();
  }
  const mod = loadModule();
  if (!mod) return status.get();
  status.set('ready');
  await checkCustomerInfo(mod);
  return status.get();
}

function pickProPackage(offerings: import('react-native-purchases').PurchasesOfferings): PurchasesPackage | null {
  const current = offerings.current;
  const candidates = current ? current.availablePackages : Object.values(offerings.all).flatMap((o) => o.availablePackages);
  return candidates.find((p) => p.product.identifier === PRO_PRODUCT_ID) ?? current?.lifetime ?? candidates[0] ?? null;
}

export async function fetchProOffer(): Promise<ProOffer | null> {
  const mod = loadModule();
  if (!mod || status.get() !== 'ready') return null;
  try {
    const offerings = await mod.default.getOfferings();
    const pkg = pickProPackage(offerings);
    cachedPackage = pkg;
    if (!pkg) return null;
    return { priceString: pkg.product.priceString, productId: pkg.product.identifier, title: pkg.product.title };
  } catch {
    return null;
  }
}

function hasErrorCode(error: unknown, code: string | undefined): boolean {
  if (typeof error !== 'object' || error === null || code === undefined) return false;
  return (error as { code?: unknown }).code === code;
}

function isUserCancelled(error: unknown, mod: PurchasesModule): boolean {
  if (typeof error === 'object' && error !== null && (error as { userCancelled?: boolean | null }).userCancelled === true) return true;
  return hasErrorCode(error, mod.PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR);
}

/** Ask to Buy, or a payment the store has not settled yet. */
function isPaymentPending(error: unknown, mod: PurchasesModule): boolean {
  return hasErrorCode(error, mod.PURCHASES_ERROR_CODE?.PAYMENT_PENDING_ERROR);
}

export async function purchasePro(): Promise<PurchaseOutcome> {
  const mod = loadModule();
  if (!mod || status.get() !== 'ready') return 'failed';
  try {
    if (!cachedPackage) await fetchProOffer();
    if (!cachedPackage) return 'failed';
    const { customerInfo } = await mod.default.purchasePackage(cachedPackage);
    // The store finished but Pro is not active yet. The customer may well have paid, so this is never reported as a failure.
    return hasProEntitlement(customerInfo) ? 'purchased' : 'pending';
  } catch (error) {
    if (isUserCancelled(error, mod)) return 'cancelled';
    if (isPaymentPending(error, mod)) return 'pending';
    return 'failed';
  }
}

export async function restorePro(): Promise<RestoreOutcome> {
  const mod = loadModule();
  if (!mod || status.get() !== 'ready') return 'failed';
  try {
    const info = await mod.default.restorePurchases();
    return hasProEntitlement(info) ? 'restored' : 'none';
  } catch {
    return 'failed';
  }
}

export const purchasesSupported = true;

/** The store that bills this install, named the way the user knows it. */
export function billingStoreName(): string {
  return Platform.OS === 'android' ? 'Google Play' : 'Apple';
}

/** What the user signs in with to restore purchases on another device. */
export function storeAccountName(): string {
  return Platform.OS === 'android' ? 'Google account' : 'Apple Account';
}
