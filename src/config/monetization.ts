import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

interface MonetizationExtra {
  revenueCatAndroid?: string;
  revenueCatIos?: string;
  proEntitlement?: string;
  proProductId?: string;
}

interface SupportExtra {
  email?: string;
  siteUrl?: string;
  privacyUrl?: string;
}

function extra<T>(key: string): T {
  const all = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return (all[key] ?? {}) as T;
}

const monetization = extra<MonetizationExtra>('monetization');
const support = extra<SupportExtra>('support');

export const PRO_ENTITLEMENT = monetization.proEntitlement || 'pro';
export const PRO_PRODUCT_ID = monetization.proProductId || 'rotawise_pro_lifetime';

export const SUPPORT_EMAIL = support.email || 'tyjcraw@gmail.com';
export const SITE_URL = support.siteUrl || 'https://tjcraw6589.github.io/rotawise/';
export const PRIVACY_URL = support.privacyUrl || 'https://tjcraw6589.github.io/rotawise/privacy.html';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** True inside the Expo Go sandbox, where native billing and widget modules do not exist. */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function revenueCatApiKey(): string | null {
  const key = Platform.select({ android: monetization.revenueCatAndroid, ios: monetization.revenueCatIos }) ?? '';
  return key.trim().length > 0 ? key.trim() : null;
}
