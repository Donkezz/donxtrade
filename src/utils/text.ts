/**
 * Loose form of a string for search: lower case, without diacritics.
 *
 * People type "zilina" and expect "Žilina", "lodz" and expect "Łódź". `normalize`
 * removes most accents, but Hermes may not ship it, and some letters (ł, đ, ø)
 * are not decomposed by it at all, so a small table covers both cases.
 */
const EXTRA: Record<string, string> = {
  ł: 'l', đ: 'd', ø: 'o', ß: 'ss', æ: 'ae', œ: 'oe',
};

const FALLBACK: Record<string, string> = {
  á: 'a', ä: 'a', à: 'a', â: 'a', ą: 'a', ã: 'a', å: 'a',
  č: 'c', ć: 'c', ç: 'c', ď: 'd',
  é: 'e', ě: 'e', ę: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ĺ: 'l', ľ: 'l', ň: 'n', ń: 'n', ñ: 'n',
  ó: 'o', ô: 'o', ö: 'o', ő: 'o', ò: 'o', õ: 'o',
  ŕ: 'r', ř: 'r', š: 's', ś: 's', ť: 't',
  ú: 'u', ů: 'u', ü: 'u', ű: 'u', ù: 'u', û: 'u',
  ý: 'y', ÿ: 'y', ž: 'z', ź: 'z', ż: 'z',
};

const canNormalize = (() => {
  try {
    return typeof ''.normalize === 'function' && 'é'.normalize('NFD').length === 2;
  } catch {
    return false;
  }
})();

export function foldForSearch(value: string): string {
  const lower = value.toLowerCase();
  const stripped = canNormalize
    ? lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
    : lower.replace(/[^\u0000-\u007f]/g, (ch) => FALLBACK[ch] ?? ch);
  return stripped.replace(/[łđøßæœ]/g, (ch) => EXTRA[ch] ?? ch);
}
