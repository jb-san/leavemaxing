import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { DayNum } from "~/lib/dates";
import {
  calendarLabels,
  countNoun,
  countryName,
  countText,
  formatRangeLocale,
  formatShortLocale,
  pluralText,
} from "./format";
import { type Copy, fill, getCopy, intlLocale, normalizeLocale } from "./index";
import type { Plural } from "./types";

export interface I18n {
  code: string;
  locale: string;
  m: Copy;
  monthsLong: string[];
  monthsShort: string[];
  weekdaysShort: string[];
  weekdaysLong: string[];
  formatShort: (day: DayNum) => string;
  formatRange: (start: DayNum, end: DayNum) => string;
  text: (template: string, tokens?: Record<string, string | number>) => string;
  plural: (n: number, forms: Plural) => string;
  count: (n: number, forms: Plural) => string;
  /** Plural form with `{n}` and `{count}` filled in. */
  countText: (n: number, forms: Plural) => string;
  place: (country: string, fallback: string) => string;
}

const Ctx = createContext<I18n | null>(null);

export function makeI18n(code?: string | null): I18n {
  const id = normalizeLocale(code);
  const locale = intlLocale(id);
  const labels = calendarLabels(locale);
  return {
    code: id,
    locale,
    m: getCopy(id),
    ...labels,
    formatShort: (day) => formatShortLocale(locale, day),
    formatRange: (start, end) => formatRangeLocale(locale, start, end),
    text: fill,
    plural: (n, forms) => pluralText(locale, n, forms),
    count: (n, forms) => countNoun(locale, n, forms),
    countText: (n, forms) => countText(locale, n, forms),
    place: (country, fallback) => countryName(country, locale, fallback),
  };
}

const english = makeI18n("en");

export function I18nProvider({ code, children }: { code?: string | null; children: ReactNode }) {
  const value = useMemo(() => (code && code !== "en" ? makeI18n(code) : english), [code]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx) ?? english;
}
