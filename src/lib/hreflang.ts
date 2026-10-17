export interface HreflangLink {
  lang: string;
  url: string;
}

/**
 * Alternates for a localized national or landing page:
 * a self-reference with the full locale code, and x-default on the English country-year page.
 */
export function localizedPageAlternates(
  localeCode: string,
  selfUrl: string,
  englishUrl: string,
): HreflangLink[] {
  return [
    { lang: localeCode, url: selfUrl },
    { lang: "x-default", url: englishUrl },
  ];
}

/**
 * Alternates for an English country-year page: each localized page with its full
 * locale code, a self-referencing `en`, and x-default on this page.
 */
export function englishCountryAlternates(
  localized: Array<{ code: string; url: string }>,
  englishUrl: string,
): HreflangLink[] {
  if (localized.length === 0) return [];
  return [
    ...localized.map((item) => ({ lang: item.code, url: item.url })),
    { lang: "en", url: englishUrl },
    { lang: "x-default", url: englishUrl },
  ];
}

/**
 * Regional pages pair with an English regional URL when one exists
 * (locale code, `en`, and x-default on the English page).
 * Otherwise they only self-reference and point x-default at the English country-year page.
 */
export function regionalPageAlternates(
  localeCode: string,
  selfUrl: string,
  englishRegionalUrl: string | null,
  englishCountryUrl: string,
): HreflangLink[] {
  if (englishRegionalUrl) {
    return [
      { lang: localeCode, url: selfUrl },
      { lang: "en", url: englishRegionalUrl },
      { lang: "x-default", url: englishRegionalUrl },
    ];
  }
  return [
    { lang: localeCode, url: selfUrl },
    { lang: "x-default", url: englishCountryUrl },
  ];
}
