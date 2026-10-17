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
  siblings: Array<{ code: string; url: string }> = [],
): HreflangLink[] {
  return [
    { lang: localeCode, url: selfUrl },
    ...siblings.map((item) => ({ lang: item.code, url: item.url })),
    { lang: "x-default", url: englishUrl },
  ];
}

/**
 * Other locales for the same country, so fr-BE and nl-BE point at each other.
 * Different countries that share a language (fr-FR / fr-BE) are not alternates.
 */
export function siblingLocaleAlternates(
  localeCode: string,
  year: number,
  siteUrl: string,
  all: Array<{ code: string; country: string; slug: string }>,
): Array<{ code: string; url: string }> {
  const country = all.find((item) => item.code === localeCode)?.country;
  if (!country) return [];
  return all
    .filter((item) => item.country === country && item.code !== localeCode)
    .map((item) => ({
      code: item.code,
      url: `${siteUrl}/${item.code.toLowerCase()}/${item.slug}-${year}/`,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
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
/**
 * Alternates for a translated shell (home, ranking, about, contact).
 * Every language version lists the same set. `en` and `x-default` point at the English URL.
 */
export function shellAlternates(pages: Array<{ lang: string; url: string }>): HreflangLink[] {
  const english = pages.find((page) => page.lang === "en")?.url;
  if (!english) return pages.map((page) => ({ lang: page.lang, url: page.url }));
  const localized = pages.filter((page) => page.lang !== "en").sort((a, b) => a.lang.localeCompare(b.lang));
  return [
    ...localized.map((page) => ({ lang: page.lang, url: page.url })),
    { lang: "en", url: english },
    { lang: "x-default", url: english },
  ];
}

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
