import { locales } from "~/data/locales";

/** English /best/ pages exist for the current year and the next one. */
export function englishBestYears(now = new Date()): number[] {
  const year = now.getFullYear();
  return [year, year + 1];
}

/** Localized rankings follow the English pages, and only for 2027 and 2028. */
export function localizedBestYears(now = new Date()): number[] {
  const english = new Set(englishBestYears(now));
  return [2027, 2028].filter((year) => english.has(year));
}

export function localeHomePath(code: string): string {
  return code === "en" ? "/" : `/${code.toLowerCase()}/`;
}

export function localeBestPath(code: string, year: number): string {
  return code === "en" ? `/best/${year}/` : `/${code.toLowerCase()}/best/${year}/`;
}

export function localeAboutPath(code: string): string {
  return code === "en" ? "/about/" : `/${code.toLowerCase()}/about/`;
}

export function localeContactPath(code: string): string {
  return code === "en" ? "/contact/" : `/${code.toLowerCase()}/contact/`;
}

export function homeAlternates(siteUrl: string): Array<{ lang: string; url: string }> {
  return [
    { lang: "en", url: siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/` },
    ...Object.values(locales).map((locale) => ({
      lang: locale.code,
      url: `${siteUrl}/${locale.code.toLowerCase()}/`,
    })),
  ];
}

export function bestAlternates(siteUrl: string, year: number): Array<{ lang: string; url: string }> {
  const pages = [{ lang: "en", url: `${siteUrl}/best/${year}/` }];
  if (!localizedBestYears().includes(year)) return pages;
  for (const locale of Object.values(locales)) {
    pages.push({ lang: locale.code, url: `${siteUrl}/${locale.code.toLowerCase()}/best/${year}/` });
  }
  return pages;
}

export function aboutAlternates(siteUrl: string): Array<{ lang: string; url: string }> {
  return [
    { lang: "en", url: `${siteUrl}/about/` },
    ...Object.values(locales).map((locale) => ({
      lang: locale.code,
      url: `${siteUrl}/${locale.code.toLowerCase()}/about/`,
    })),
  ];
}

export function contactAlternates(siteUrl: string): Array<{ lang: string; url: string }> {
  return [
    { lang: "en", url: `${siteUrl}/contact/` },
    ...Object.values(locales).map((locale) => ({
      lang: locale.code,
      url: `${siteUrl}/${locale.code.toLowerCase()}/contact/`,
    })),
  ];
}
