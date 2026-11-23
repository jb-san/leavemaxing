import { createContext, type ReactNode, useContext, useMemo } from "react";
import { replaceTokens } from "~/data/locales";
import type { DayNum } from "~/lib/dates";
import { intlLocale, normalizeLocale } from "./codes";
import { en } from "./en";
import {
  calendarLabels,
  countNoun,
  countryName,
  countText,
  formatRangeLocale,
  formatShortLocale,
  pluralText,
} from "./format";
import type { Copy, Plural } from "./types";

/**
 * The strings React islands read. Only the planner section is used in the browser, so a page
 * passes its own locale's section as a prop instead of every catalog being bundled.
 */
export type PlannerMessages = Copy["planner"];

export interface I18n {
  code: string;
  locale: string;
  m: { planner: PlannerMessages };
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

export function makeI18n(code?: string | null, messages?: PlannerMessages): I18n {
  const id = normalizeLocale(code);
  if (id !== "en" && !messages && import.meta.env.SSR) {
    // Without this the island would hydrate in English on a localized page.
    throw new Error(`I18nProvider: pass the ${id} planner messages (getCopy(code).planner)`);
  }
  const locale = intlLocale(id);
  const labels = calendarLabels(locale);
  return {
    code: id,
    locale,
    m: { planner: messages ?? en.planner },
    ...labels,
    formatShort: (day) => formatShortLocale(locale, day),
    formatRange: (start, end) => formatRangeLocale(locale, start, end),
    text: (template, tokens = {}) => replaceTokens(template, tokens),
    plural: (n, forms) => pluralText(locale, n, forms),
    count: (n, forms) => countNoun(locale, n, forms),
    countText: (n, forms) => countText(locale, n, forms),
    place: (country, fallback) => countryName(country, locale, fallback),
  };
}

const english = makeI18n("en");

export function I18nProvider({
  code,
  messages,
  children,
}: {
  code?: string | null;
  /** The locale's planner strings. Required for every locale except English. */
  messages?: PlannerMessages;
  children: ReactNode;
}) {
  const value = useMemo(
    () => (code && normalizeLocale(code) !== "en" ? makeI18n(code, messages) : english),
    [code, messages],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx) ?? english;
}
