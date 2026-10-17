import {
  type DayNum,
  formatRange,
  formatShort,
  MONTHS_LONG,
  MONTHS_SHORT,
  parts,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  weekdayMon0,
} from "~/lib/dates";
import type { Plural } from "./types";

export interface CalendarLabels {
  monthsLong: string[];
  monthsShort: string[];
  weekdaysShort: string[];
  weekdaysLong: string[];
}

const cache = new Map<string, CalendarLabels>();

function tidy(value: string): string {
  return value.replace(/\.$/, "").replace(/\s+/g, " ").trim();
}

/** Monday-first labels. English keeps the site's existing abbreviations. */
export function calendarLabels(locale: string): CalendarLabels {
  if (locale === "en") {
    return {
      monthsLong: [...MONTHS_LONG],
      monthsShort: [...MONTHS_SHORT],
      weekdaysShort: [...WEEKDAYS_SHORT],
      weekdaysLong: [...WEEKDAYS_LONG],
    };
  }
  const hit = cache.get(locale);
  if (hit) return hit;
  const monthLong = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const labels: CalendarLabels = {
    monthsLong: Array.from({ length: 12 }, (_, i) => tidy(monthLong.format(new Date(Date.UTC(2026, i, 1))))),
    monthsShort: Array.from({ length: 12 }, (_, i) =>
      tidy(monthShort.format(new Date(Date.UTC(2026, i, 1)))),
    ),
    weekdaysShort: Array.from({ length: 7 }, (_, i) =>
      tidy(weekdayShort.format(new Date(Date.UTC(2026, 0, 5 + i)))),
    ),
    weekdaysLong: Array.from({ length: 7 }, (_, i) =>
      tidy(weekdayLong.format(new Date(Date.UTC(2026, 0, 5 + i)))),
    ),
  };
  cache.set(locale, labels);
  return labels;
}

function dayFirst(locale: string): boolean {
  return /^(de|cs|pl|fi|sv|nb|da|nl)/.test(locale);
}

export function formatDayMonthLocale(locale: string, day: DayNum): string {
  if (locale === "en") {
    const p = parts(day);
    return `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
  }
  const labels = calendarLabels(locale);
  const p = parts(day);
  const month = labels.monthsShort[p.month - 1];
  if (dayFirst(locale)) return `${p.day}. ${month}`;
  return `${p.day} ${month}`;
}

export function formatShortLocale(locale: string, day: DayNum): string {
  if (locale === "en") return formatShort(day);
  const labels = calendarLabels(locale);
  const wd = labels.weekdaysShort[weekdayMon0(day)];
  return `${wd} ${formatDayMonthLocale(locale, day)}`;
}

export function formatRangeLocale(locale: string, start: DayNum, end: DayNum): string {
  if (locale === "en") return formatRange(start, end);
  const labels = calendarLabels(locale);
  const a = parts(start);
  const b = parts(end);
  if (start === end) return formatDayMonthLocale(locale, start);
  if (a.month === b.month && a.year === b.year) {
    const month = labels.monthsShort[a.month - 1];
    if (dayFirst(locale)) return `${a.day}.–${b.day}. ${month}`;
    return `${a.day}–${b.day} ${month}`;
  }
  return `${formatDayMonthLocale(locale, start)} – ${formatDayMonthLocale(locale, end)}`;
}

const rules = new Map<string, Intl.PluralRules>();

export function pluralCategory(locale: string, n: number): Intl.LDMLPluralRule {
  const key = locale || "en";
  let rule = rules.get(key);
  if (!rule) {
    rule = new Intl.PluralRules(key);
    rules.set(key, rule);
  }
  return rule.select(n);
}

export function pluralText(locale: string, n: number, forms: Plural): string {
  const cat = pluralCategory(locale, n);
  if (cat === "one") return forms.one;
  if (cat === "few") return forms.few;
  return forms.many;
}

const names = new Map<string, Intl.DisplayNames>();

/** Country name in the page language. English keeps the dataset name. */
export function countryName(code: string, locale: string, fallback: string): string {
  if (!locale || locale === "en") return fallback;
  let fmt = names.get(locale);
  if (!fmt) {
    fmt = new Intl.DisplayNames([locale], { type: "region" });
    names.set(locale, fmt);
  }
  try {
    return fmt.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}
