/**
 * Coins are the app's own unit, deliberately not money.
 *
 * They are whole numbers and never go through `Intl.NumberFormat` currency
 * formatting: a coin is worth the same everywhere, and a currency with no
 * decimal places would otherwise round small amounts away to nothing.
 *
 * The glyph carries the unit instead of a word, because Slovak, Polish and
 * Ukrainian inflect the noun by the number and "1 mince" would be wrong.
 */

export const COIN_GLYPH = '🪙';

/** One coin buys one contact. Everything else is priced as a multiple of that. */
export const COINS_PER_CONTACT = 1;

/** `12` becomes `🪙 12`. Fractions are rounded down — you cannot hold half a coin. */
export function formatCoins(amount: number): string {
  return `${COIN_GLYPH} ${Math.floor(amount)}`;
}

/** `-3` becomes `−3`, `4` becomes `+4`. For transaction rows, where sign is the point. */
export function formatCoinDelta(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '−' : '+';
  return `${sign}${Math.abs(rounded)} ${COIN_GLYPH}`;
}
