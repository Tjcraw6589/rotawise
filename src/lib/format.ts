export function formatMoney(amount: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** "1,234" or "7.5": thousands separators, at most two decimals. */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  try {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(rounded);
  } catch {
    return String(rounded);
  }
}

/** "24 hours", "1 hour", "7.5 hours", "2,184 hours". */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return `${formatNumber(rounded)} ${Math.abs(rounded) === 1 ? 'hour' : 'hours'}`;
}

/** Parse a number typed by a user ("23.50", "23,50", "$23"). Returns null when it is not a number. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
