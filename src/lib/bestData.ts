/**
 * Machine-readable best breaks, published at build time as `/data/best/{cc}/{year}.json` (one per
 * country and offered year) plus `/data/best/index.json`. The numbers come from the same engine and
 * the same settings as the pages, so a file and its page always agree. Format: docs/data-api.md.
 *
 * Build-time only: it reads holiday files from disk.
 */

import { countries, countryByCode, meta } from "~/data";
import { locales } from "~/data/locales";
import { readHolidayFile, serverPlan } from "~/data/server";
import { SITE } from "~/data/site";
import { listBridgeClusters } from "./bridgeFacts";
import { BUILD_DATE } from "./buildDate";
import { type DayNum, toIso } from "./dates";
import { appliesTo, type HolidayFile } from "./holidays";
import type { Break } from "./planner/types";
import { DEFAULT_BUDGET, defaultSettings } from "./settings";
import { offeredYears } from "./years";

export const BEST_DATA_VERSION = 1;

/** Bridges listed per file, best first. */
const MAX_BEST_BREAKS = 10;

/** The years the planner offers on the build date (this year and the next two) that have data. */
export function bestDataYears(now = new Date()): number[] {
  return offeredYears(meta.years, now);
}

export function bestDataPath(country: string, year: number): string {
  return `/data/best/${country.toLowerCase()}/${year}.json`;
}

/** Whether a page for this country-year has a JSON file to point at. */
export function hasBestData(country: string, year: number): boolean {
  return countryByCode.has(country) && bestDataYears().includes(year) && !!readHolidayFile(country, year);
}

/** Every file the build publishes. */
export function bestDataEntries(): Array<{ country: string; year: number }> {
  const years = bestDataYears();
  return countries.flatMap((c) =>
    years.filter((year) => readHolidayFile(c.code, year)).map((year) => ({ country: c.code, year })),
  );
}

/**
 * Leave days the recommended plan uses: the default of the country's localized bridge-day page
 * (25 in Sweden, for example), or the English pages' default where there is none.
 */
export function defaultLeaveDays(country: string): number {
  return Object.values(locales).find((locale) => locale.country === country)?.defaultBudget ?? DEFAULT_BUDGET;
}

export interface DataHoliday {
  date: string;
  name: string;
}

export interface DataBreak {
  /** First and last day off, ISO dates. */
  start: string;
  end: string;
  /** Leave days to take. */
  leaveDays: number;
  /** Calendar days off in a row, weekends and holidays included. */
  daysOff: number;
  /** daysOff / leaveDays, two decimals. */
  efficiency: number;
  holidays: DataHoliday[];
}

export interface BestDataFile {
  version: number;
  country: string;
  countryName: string;
  year: number;
  /** Always null: these files are national. */
  region: string | null;
  /** Build date, also the pages' dateModified. */
  generatedAt: string;
  /** National public holidays in the year. */
  holidays: number;
  publicHolidays: DataHoliday[];
  /** Working days that sit in a one- or two-day gap next to a holiday, the count the FAQ gives. */
  bridgeDays: number;
  /** One- and two-day bridges, best first. */
  bestBreaks: Array<DataBreak & { leaveDates: string[] }>;
  recommendedPlan: {
    leaveDays: number;
    style: "balanced";
    leaveUsed: number;
    daysOff: number;
    multiplier: number;
    longestBreak: number;
    breaks: DataBreak[];
  };
  links: {
    page: string;
    localized: string[];
    /** Opens the planner with this plan. */
    planner: string;
  };
  source: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function holidaysIn(file: HolidayFile, start: DayNum, end: DayNum): DataHoliday[] {
  const first = toIso(start);
  const last = toIso(end);
  return file.holidays
    .filter((h) => appliesTo(h, null) && h.date >= first && h.date <= last)
    .map((h) => ({ date: h.date, name: h.name }));
}

function planBreak(b: Break): DataBreak {
  return {
    start: toIso(b.start),
    end: toIso(b.end),
    leaveDays: b.leave,
    daysOff: b.length,
    efficiency: round2(b.length / b.leave),
    holidays: b.holidays.map((h) => ({ date: toIso(h.day), name: h.name })),
  };
}

export function bestDataFile(country: string, year: number): BestDataFile {
  const info = countryByCode.get(country);
  const file = readHolidayFile(country, year);
  if (!info || !file) throw new Error(`No holiday data for ${country} ${year}`);
  const national = file.holidays.filter((h) => appliesTo(h, null));
  const clusters = listBridgeClusters(file, country, null);
  const leaveDays = defaultLeaveDays(country);
  const { plan } = serverPlan({ ...defaultSettings(country, year), budget: leaveDays });
  const cc = country.toLowerCase();
  const localized = Object.values(locales)
    .filter((locale) => locale.country === country && year >= 2027 && year <= 2028)
    .map((locale) => `${SITE.url}/${locale.code.toLowerCase()}/${locale.slug}-${year}/`);
  return {
    version: BEST_DATA_VERSION,
    country,
    countryName: info.name,
    year,
    region: null,
    generatedAt: BUILD_DATE,
    holidays: national.length,
    publicHolidays: national.map((h) => ({ date: h.date, name: h.name })),
    bridgeDays: new Set(clusters.flatMap((c) => c.days)).size,
    bestBreaks: clusters.slice(0, MAX_BEST_BREAKS).map((c) => ({
      start: toIso(c.start),
      end: toIso(c.end),
      leaveDays: c.leave,
      leaveDates: c.days,
      daysOff: c.length,
      efficiency: round2(c.length / c.leave),
      holidays: holidaysIn(file, c.start, c.end),
    })),
    recommendedPlan: {
      leaveDays,
      style: "balanced",
      leaveUsed: plan.stats.leaveUsed,
      daysOff: plan.stats.daysOff,
      multiplier: round2(plan.stats.multiplier),
      longestBreak: plan.stats.longest,
      breaks: plan.breaks.filter((b) => b.leave > 0).map(planBreak),
    },
    links: {
      page: `${SITE.url}/${cc}/${year}/`,
      localized,
      planner: `${SITE.url}/${cc}/${year}/?d=${leaveDays}`,
    },
    source: "Public holidays from date-holidays (CC BY 3.0), planned by leavemaxxing.",
  };
}

export function bestDataIndex(): {
  version: number;
  generatedAt: string;
  years: number[];
  docs: string;
  files: Array<{ country: string; year: number; url: string }>;
} {
  return {
    version: BEST_DATA_VERSION,
    generatedAt: BUILD_DATE,
    years: bestDataYears(),
    docs: `${SITE.url}/llms.txt`,
    files: bestDataEntries().map(({ country, year }) => ({
      country,
      year,
      url: `${SITE.url}${bestDataPath(country, year)}`,
    })),
  };
}
