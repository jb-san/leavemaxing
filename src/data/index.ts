import type { CountryInfo, DataMeta } from "~/lib/holidays";
import countriesJson from "./generated/countries.json";
import metaJson from "./generated/meta.json";

export const countries = countriesJson as CountryInfo[];
export const meta = metaJson as DataMeta;
export const countryByCode = new Map(countries.map((c) => [c.code, c]));

export function regionName(country: string, region: string | null): string | null {
  if (!region) return null;
  return countryByCode.get(country)?.regions[region] ?? null;
}

export function placeName(country: string, region: string | null): string {
  return regionName(country, region) ?? countryByCode.get(country)?.name ?? country;
}

/** Link preview images are rendered for this year and next; other years reuse the nearest one. */
const thisYear = new Date().getFullYear();
export const ogYears = [thisYear, thisYear + 1].filter((y) => meta.years.includes(y));
export function ogYear(year: number): number {
  return Math.min(Math.max(year, ogYears[0] ?? year), ogYears[ogYears.length - 1] ?? year);
}
