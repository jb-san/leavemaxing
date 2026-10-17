import { appliesTo, type HolidayEntry, type HolidayFile } from "./holidays";

/**
 * Regional pages for these countries are emitted only when that region's
 * holiday set differs from the national one. Germany and Switzerland keep
 * every page wave 1 already published.
 */
export const DISTINCT_HOLIDAY_REGIONS = new Set(["ES", "AT"]);

export function holidaySignature(holidays: HolidayEntry[], region: string | null): string {
  return holidays
    .filter((holiday) => appliesTo(holiday, region))
    .map((holiday) => `${holiday.date}|${holiday.name}`)
    .sort()
    .join("\n");
}

export function regionDiffersFromNational(holidays: HolidayEntry[], region: string): boolean {
  return holidaySignature(holidays, region) !== holidaySignature(holidays, null);
}

export function publishedRegionCodes(
  country: string,
  codes: string[],
  file: HolidayFile | undefined,
): string[] {
  if (!DISTINCT_HOLIDAY_REGIONS.has(country)) return codes;
  if (!file) return [];
  return codes.filter((code) => regionDiffersFromNational(file.holidays, code));
}
