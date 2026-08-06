import * as Localization from 'expo-localization';

/**
 * Money formatting for a multi-country app.
 *
 * Nothing here assumes euros: the currency comes from the device region and the
 * grouping/decimal separators and symbol placement come from the active locale
 * via `Intl.NumberFormat`.
 */

export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_LOCALE = 'sk-SK';

/**
 * ISO 4217 code per region. `expo-localization` returns `currencyCode: null` on
 * web, so we resolve the currency from the region code as a second attempt.
 */
const REGION_CURRENCY: Record<string, string> = {
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR',
  FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR', LT: 'EUR', LU: 'EUR',
  LV: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SI: 'EUR', SK: 'EUR',
  BG: 'BGN', CH: 'CHF', CZ: 'CZK', DK: 'DKK', HU: 'HUF', NO: 'NOK', PL: 'PLN',
  RO: 'RON', RS: 'RSD', SE: 'SEK', UA: 'UAH',
  AU: 'AUD', CA: 'CAD', GB: 'GBP', US: 'USD',
};

/** Fallback locale tag per supported app language, used when the device locale list has no match. */
const LANGUAGE_LOCALE: Record<string, string> = {
  sk: 'sk-SK',
  en: 'en-GB',
  pl: 'pl-PL',
  hu: 'hu-HU',
  uk: 'uk-UA',
};

/** Currency of the user's device region, `EUR` when it cannot be determined. */
export function resolveCurrencyCode(): string {
  for (const locale of Localization.getLocales()) {
    if (locale.currencyCode) {
      return locale.currencyCode;
    }
    if (locale.regionCode && REGION_CURRENCY[locale.regionCode]) {
      return REGION_CURRENCY[locale.regionCode];
    }
  }
  return DEFAULT_CURRENCY;
}

/**
 * Full BCP 47 tag for the language the app currently renders in. Prefers the
 * device tag (so a Slovak UI on an Austrian device still formats as `sk-AT`
 * would be expected locally), then a per-language default.
 */
export function resolveLocaleTag(language?: string | null): string {
  if (!language) {
    return DEFAULT_LOCALE;
  }
  const deviceMatch = Localization.getLocales().find((locale) => locale.languageCode === language);
  return deviceMatch?.languageTag ?? LANGUAGE_LOCALE[language] ?? language;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string): Intl.NumberFormat | null {
  const cacheKey = `${locale}|${currency}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatterCache.set(cacheKey, formatter);
    return formatter;
  } catch (error) {
    console.warn(`Currency formatting unavailable for ${cacheKey}:`, error);
    return null;
  }
}

export interface FormatMoneyOptions {
  /** BCP 47 tag, e.g. `sk-SK`. Defaults to `DEFAULT_LOCALE`. */
  locale?: string;
  /** ISO 4217 code, e.g. `PLN`. Defaults to `DEFAULT_CURRENCY`. */
  currency?: string;
}

/**
 * Formats an amount as money in the given locale and currency, e.g.
 * `formatMoney(15, { locale: 'sk-SK', currency: 'EUR' }) === '15,00 €'`.
 */
export function formatMoney(amount: number, options: FormatMoneyOptions = {}): string {
  const locale = options.locale || DEFAULT_LOCALE;
  const currency = options.currency || DEFAULT_CURRENCY;
  const formatter = getFormatter(locale, currency);

  if (formatter) {
    try {
      return formatter.format(amount);
    } catch (error) {
      console.warn(`Failed to format ${amount} as ${currency}:`, error);
    }
  }

  // Last resort on runtimes without full Intl support.
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Symbol for a currency in the given locale, e.g. `€`, `zł`, `Ft`. Falls back to
 * the ISO code, which is a valid thing to show a user.
 */
export function currencySymbol(options: FormatMoneyOptions = {}): string {
  const locale = options.locale || DEFAULT_LOCALE;
  const currency = options.currency || DEFAULT_CURRENCY;
  const formatter = getFormatter(locale, currency);

  const part = formatter?.formatToParts(0).find((p) => p.type === 'currency');
  return part?.value ?? currency;
}

/**
 * Number of decimal places a currency uses — 2 for `EUR`, 0 for `HUF`. Needed
 * because the price picker splits an amount into major and minor units.
 */
export function currencyDecimals(options: FormatMoneyOptions = {}): number {
  const locale = options.locale || DEFAULT_LOCALE;
  const currency = options.currency || DEFAULT_CURRENCY;
  const formatter = getFormatter(locale, currency);

  return formatter?.resolvedOptions().maximumFractionDigits ?? 2;
}
