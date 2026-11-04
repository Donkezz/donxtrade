import { resolveLocaleTag } from './currency';

/**
 * Date and time formatting in the *app* language, not the device's.
 *
 * `toLocaleDateString([])` follows the phone's locale, so a German UI on a Slovak
 * phone mixed both ("4 Nov o 23:17"). Hermes ships a trimmed `Intl`, so every call
 * is guarded and falls back to the device format rather than throwing.
 */

function format(
  date: Date,
  language: string | null | undefined,
  kind: 'date' | 'time' | 'dateTime',
): string {
  const locale = resolveLocaleTag(language);
  try {
    if (kind === 'time') {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    if (kind === 'date') {
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return kind === 'time' ? date.toLocaleTimeString() : kind === 'date' ? date.toLocaleDateString() : date.toLocaleString();
  }
}

export const formatTime = (date: Date, language?: string | null) => format(date, language, 'time');
export const formatShortDate = (date: Date, language?: string | null) => format(date, language, 'date');
/** Day, month and clock time — for moments that may be more than a day away. */
export const formatDateTime = (date: Date, language?: string | null) => format(date, language, 'dateTime');
