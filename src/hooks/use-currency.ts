import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  currencyDecimals,
  currencySymbol,
  formatMoney,
  resolveCurrencyCode,
  resolveLocaleTag,
} from '@/utils/currency';

/**
 * Money formatting bound to the language the app is currently rendering in and
 * to the currency of the user's device region. Re-resolves whenever the user
 * switches app language.
 */
export function useCurrency() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  return useMemo(() => {
    const locale = resolveLocaleTag(language);
    const currency = resolveCurrencyCode();

    return {
      locale,
      currency,
      symbol: currencySymbol({ locale, currency }),
      decimals: currencyDecimals({ locale, currency }),
      format: (amount: number) => formatMoney(amount, { locale, currency }),
    };
  }, [language]);
}
