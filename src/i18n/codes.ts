/**
 * Locale codes and the helpers that only need the codes. Kept apart from the catalogs so
 * browser code can normalise a locale without bundling every translation.
 */
export const LOCALE_CODES = [
  "en",
  "de-DE",
  "de-AT",
  "de-CH",
  "sv-SE",
  "nb-NO",
  "da-DK",
  "fi-FI",
  "pl-PL",
  "nl-NL",
  "nl-BE",
  "fr-FR",
  "fr-BE",
  "fr-LU",
  "es-ES",
  "it-IT",
  "pt-PT",
  "cs-CZ",
  "uk-UA",
] as const;

export function normalizeLocale(code: string | undefined | null): string {
  if (!code) return "en";
  const hit = LOCALE_CODES.find((key) => key.toLowerCase() === code.toLowerCase());
  return hit ?? "en";
}

/** BCP 47 tag used for dates and country names. */
export function intlLocale(code: string | undefined | null): string {
  return normalizeLocale(code);
}
