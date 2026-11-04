/**
 * Distance helpers for sorting the board by how close a listing is.
 *
 * Deliberately avoids `Intl.NumberFormat` with `style: 'unit'`: that part of Intl
 * is missing on some React Native engines (see the note in AGENTS.md), and a
 * distance label is not worth a crash. The unit stays an invariant abbreviation —
 * `m` and `km` read the same in every language this app ships in.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The decimal separator the given locale uses, falling back to a dot. */
function decimalSeparator(locale?: string): string {
  try {
    const sample = (1.1).toLocaleString(locale);
    return sample.replace(/\d/g, '').charAt(0) || '.';
  } catch {
    return '.';
  }
}

/** `0.42` becomes `420 m`, `2.43` becomes `2,4 km` in a comma locale, `34` becomes `34 km`. */
export function formatDistance(km: number, locale?: string): string {
  if (km < 1) {
    return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  }
  if (km >= 20) {
    return `${Math.round(km)} km`;
  }
  const rounded = (Math.round(km * 10) / 10).toFixed(1);
  return `${rounded.replace('.', decimalSeparator(locale))} km`;
}
