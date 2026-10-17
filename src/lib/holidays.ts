import { type DayNum, fromIso } from "./dates";
import type { HolidayDay } from "./planner/types";

/** One country-year of public holidays, as written to `public/data/{cc}/{year}.json`. */
export interface HolidayFile {
  country: string;
  year: number;
  holidays: HolidayEntry[];
}

export interface HolidayEntry {
  date: string;
  name: string;
  /** Name in the country's own language, when different. */
  local?: string;
  /** Names by date-holidays language code, when different from English. */
  names?: Record<string, string>;
  /** Regions where it applies. Absent = everywhere. */
  regions?: string[];
  /** false = only some regions observe it, so it's not in the national list. */
  national?: false;
}

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  regions: Record<string, string>;
  /** Some holidays only apply in certain regions. */
  regional: boolean;
}

export interface DataMeta {
  years: number[];
  /** Built so plans can run into it, but not offered in the year picker. */
  extraYear: number;
  generatedAt: string;
}

export function appliesTo(h: HolidayEntry, region: string | null): boolean {
  if (!region) return h.national !== false;
  return !h.regions || h.regions.includes(region);
}

/** date-holidays language codes to try for a UI locale, most specific first. */
const HOLIDAY_LANGS: Record<string, string[]> = {
  "de-DE": ["de"],
  "de-AT": ["de-at", "de"],
  "de-CH": ["de-ch", "de"],
  "sv-SE": ["sv"],
  "nb-NO": ["no", "nb"],
  "da-DK": ["da"],
  "fi-FI": ["fi"],
  "pl-PL": ["pl"],
  "nl-NL": ["nl"],
  "nl-BE": ["nl"],
  "fr-FR": ["fr"],
  "fr-BE": ["fr"],
  "fr-LU": ["fr"],
  "es-ES": ["es"],
  "it-IT": ["it"],
  "pt-PT": ["pt"],
  "cs-CZ": ["cz", "cs"],
};

/** Holiday name for a UI locale. English keeps the source name. */
export function holidayName(h: HolidayEntry, locale?: string | null): string {
  if (!locale || locale === "en") return h.name;
  const keys = HOLIDAY_LANGS[locale] ?? [locale.toLowerCase()];
  for (const key of keys) {
    const name = h.names?.[key];
    if (name) return name;
  }
  if (h.local && h.local !== h.name) return h.local;
  return h.name;
}

export function resolveHolidays(
  files: (HolidayFile | undefined)[],
  region: string | null,
  locale?: string | null,
): HolidayDay[] {
  const out: HolidayDay[] = [];
  for (const file of files) {
    if (!file) continue;
    for (const h of file.holidays) {
      if (appliesTo(h, region)) out.push({ day: fromIso(h.date), name: holidayName(h, locale) });
    }
  }
  return out;
}

export function holidayMap(days: HolidayDay[]): Map<DayNum, string[]> {
  const map = new Map<DayNum, string[]>();
  for (const h of days) {
    const list = map.get(h.day);
    if (list) {
      if (!list.includes(h.name)) list.push(h.name);
    } else map.set(h.day, [h.name]);
  }
  return map;
}

export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const cache = new Map<string, Promise<HolidayFile | undefined>>();

/** Fetch a country-year file. Resolves undefined for years outside the built range. */
export function loadHolidayFile(country: string, year: number): Promise<HolidayFile | undefined> {
  const key = `${country}/${year}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/data/${country.toLowerCase()}/${year}.json`).then((res) => {
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`Couldn't load holidays (${res.status})`);
      return res.json() as Promise<HolidayFile>;
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export function primeHolidayFile(file: HolidayFile): void {
  cache.set(`${file.country}/${file.year}`, Promise.resolve(file));
}
