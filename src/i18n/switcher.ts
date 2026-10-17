import { locales } from "~/data/locales";
import {
  englishBestYears,
  localeAboutPath,
  localeBestPath,
  localeContactPath,
  localeHomePath,
  localizedBestYears,
} from "./routes";

export interface LangLink {
  code: string;
  href: string;
  label: string;
  short: string;
  current: boolean;
}

const NAMES: Record<string, { label: string; short: string }> = {
  en: { label: "English", short: "EN" },
  "de-DE": { label: "Deutsch", short: "DE" },
  "de-AT": { label: "Deutsch (Österreich)", short: "AT" },
  "de-CH": { label: "Deutsch (Schweiz)", short: "CH" },
  "sv-SE": { label: "Svenska", short: "SV" },
  "nb-NO": { label: "Norsk", short: "NO" },
  "da-DK": { label: "Dansk", short: "DA" },
  "fi-FI": { label: "Suomi", short: "FI" },
  "pl-PL": { label: "Polski", short: "PL" },
  "nl-NL": { label: "Nederlands", short: "NL" },
  "nl-BE": { label: "Nederlands (België)", short: "BE" },
  "fr-FR": { label: "Français", short: "FR" },
  "fr-BE": { label: "Français (Belgique)", short: "BE" },
  "fr-LU": { label: "Français (Luxembourg)", short: "LU" },
  "es-ES": { label: "Español", short: "ES" },
  "it-IT": { label: "Italiano", short: "IT" },
  "pt-PT": { label: "Português", short: "PT" },
  "cs-CZ": { label: "Čeština", short: "CS" },
};

const CODES = ["en", ...Object.keys(locales)];

function localeFromPath(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2}-[a-z]{2})(?:\/|$)/);
  if (!match?.[1]) return "en";
  return Object.keys(locales).find((code) => code.toLowerCase() === match[1]) ?? "en";
}

/** Equivalent URL in another language. Unknown pages fall back to that language's home. */
export function equivalentPath(pathname: string, target: string): string {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const current = localeFromPath(path);
  const rest = current === "en" ? path.slice(1) : path.slice(current.length + 2);

  if (rest === "") return localeHomePath(target);

  if (rest === "about/") return localeAboutPath(target);
  if (rest === "contact/") return localeContactPath(target);

  const best = rest.match(/^best\/(\d{4})\/$/);
  if (best) {
    const year = Number(best[1]);
    if (target === "en") return englishBestYears().includes(year) ? `/best/${year}/` : "/";
    return localizedBestYears().includes(year) ? localeBestPath(target, year) : localeHomePath(target);
  }

  const bridge = rest.match(/^(.+)-(\d{4})\/(.*)$/);
  if (bridge && current !== "en") {
    const year = Number(bridge[2]);
    const region = bridge[3] ?? "";
    if (target === "en") return `/${locales[current]?.country.toLowerCase()}/${year}/`;
    const next = locales[target];
    if (!next) return localeHomePath(target);
    const base = `/${target.toLowerCase()}/${next.slug}-${year}/`;
    if (region && next.country === locales[current]?.country) return `${base}${region}`;
    return base;
  }

  const countryYear = path.match(/^\/([a-z]{2})\/(\d{4})\/$/);
  if (countryYear && current === "en") {
    if (target === "en") return path;
    const country = countryYear[1]?.toUpperCase();
    const year = Number(countryYear[2]);
    const next = locales[target];
    if (next && next.country === country && (year === 2027 || year === 2028)) {
      return `/${target.toLowerCase()}/${next.slug}-${year}/`;
    }
    return localeHomePath(target);
  }

  if (target === "en") return "/";
  return localeHomePath(target);
}

export function switcherLinks(pathname: string): LangLink[] {
  const current = localeFromPath(pathname);
  return CODES.map((code) => {
    const name = NAMES[code] ?? { label: code, short: code.slice(0, 2).toUpperCase() };
    return {
      code,
      href: equivalentPath(pathname, code),
      label: name.label,
      short: name.short,
      current: code === current,
    };
  });
}

export function currentLocaleCode(pathname: string): string {
  return localeFromPath(pathname);
}
