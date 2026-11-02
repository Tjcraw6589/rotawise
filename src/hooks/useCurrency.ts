import { getLocales } from 'expo-localization';
import { useMemo } from 'react';

import { formatMoney } from '@/lib/format';

/** Formats money in the device's own currency and locale. */
export function useMoney(): (amount: number) => string {
  return useMemo(() => {
    const loc = getLocales()[0];
    const currency = loc?.currencyCode ?? 'USD';
    const tag = loc?.languageTag;
    return (amount: number) => formatMoney(amount, currency, tag);
  }, []);
}
