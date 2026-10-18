import { replaceTokens } from "~/data/locales";
import { formatDayMonthLocale, formatRangeLocale, pluralCategory } from "~/i18n/format";
import { type BridgeCluster, type BridgeFacts, findBridgeFacts } from "./bridgeFacts";
import { BUILD_DATE, formatBuildDate } from "./buildDate";
import { fromIso } from "./dates";
import type { HolidayFile } from "./holidays";
import type { Break } from "./planner/types";
import { regionCopy } from "./regionLabels";
import { type Forms, type SeasonalCopy, seasonalCopy } from "./seasonalCopy";

/** Locative used after the year in titles, descriptions, and questions. */
export const NATIONAL_WHERE: Record<string, string> = {
  "sv-SE": "i Sverige",
  "de-DE": "in Deutschland",
  "de-AT": "in Österreich",
  "de-CH": "in der Schweiz",
  "nb-NO": "i Norge",
  "da-DK": "i Danmark",
  "fi-FI": "Suomessa",
  "pl-PL": "w Polsce",
  "nl-NL": "in Nederland",
  "nl-BE": "in België",
  "fr-FR": "en France",
  "fr-BE": "en Belgique",
  "fr-LU": "au Luxembourg",
  "es-ES": "en España",
  "it-IT": "in Italia",
  "pt-PT": "em Portugal",
  "cs-CZ": "v Česku",
  "uk-UA": "в Україні",
};

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SeasonalText {
  title: string;
  description: string;
  intro: string[];
  updatedLabel: string;
  updatedDate: string;
  faq: FaqItem[];
}

export function copyFor(code: string): SeasonalCopy {
  const copy = seasonalCopy[code];
  if (!copy) throw new Error(`No seasonal copy for ${code}`);
  return copy;
}

export function searchPhrase(code: string): string {
  return copyFor(code).phrase;
}

export function whereFor(localeCode: string, regionLabel: string | null): string {
  if (!regionLabel) {
    const where = NATIONAL_WHERE[localeCode];
    if (!where) throw new Error(`No locative for ${localeCode}`);
    return where;
  }
  if (localeCode === "de-CH") return `im ${regionLabel}`;
  if (localeCode === "es-ES") return `en ${regionLabel}`;
  return `in ${regionLabel}`;
}

/** Place name that reads correctly inside a locative, for example "Kanton Zürich" or "Madrid". */
export function regionPlace(country: string, code: string, sourceName: string): string {
  const copy = regionCopy(country, code, sourceName);
  if (country === "CH") return `Kanton ${copy.name}`;
  if (country === "ES") return copy.h1Region;
  return copy.name;
}

export function bridgePath(
  locale: { code: string; slug: string },
  year: number,
  regionSlug?: string,
): string {
  const base = `/${locale.code.toLowerCase()}/${locale.slug}-${year}/`;
  return regionSlug ? `${base}${regionSlug}/` : base;
}

export function bridgeLinkLabel(localeCode: string, year: number): string {
  return `${searchPhrase(localeCode)} ${year}`;
}

/** Drop a trailing clause when a regional or country name would push the title past 60 characters. */
export function fitTitle(title: string, max = 60): string {
  if (title.length <= max) return title;
  const head = title.split(":")[0]?.trim();
  if (head && head.length <= max && head.length >= 12) return head;
  return title;
}

export function longestFromBreaks(
  breaks: Break[],
): { leave: number; length: number; start: number; end: number } | null {
  let best: Break | null = null;
  for (const item of breaks) {
    if (item.leave <= 0) continue;
    if (!best || item.length > best.length || (item.length === best.length && item.leave < best.leave))
      best = item;
  }
  if (!best) return null;
  return { leave: best.leave, length: best.length, start: best.start, end: best.end };
}

function fill(template: string, tokens: Record<string, string | number>): string {
  const out = replaceTokens(template, tokens);
  const leftover = out.match(/\{[a-zA-Z]+\}/);
  if (leftover) throw new Error(`Unreplaced token ${leftover[0]} in: ${out}`);
  return out;
}

function formText(locale: string, n: number, forms: Forms, tokens: Record<string, string | number>): string {
  const cat = pluralCategory(locale, n);
  const template = cat === "one" ? forms.one : cat === "few" && forms.few ? forms.few : forms.many;
  return fill(template, tokens);
}

function joinNames(names: string[], and: string): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ${and} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}

function whenLabel(cluster: BridgeCluster, uiLocale: string): string {
  const start = fromIso(cluster.days[0] ?? "");
  const end = fromIso(cluster.days[cluster.days.length - 1] ?? "");
  return cluster.days.length === 1
    ? formatDayMonthLocale(uiLocale, start)
    : formatRangeLocale(uiLocale, start, end);
}

export function seasonalText(input: {
  localeCode: string;
  year: number;
  where: string;
  regional: boolean;
  facts: BridgeFacts;
  budget: number;
  daysOff: number;
  multiplier: number;
  longest: { leave: number; length: number; start: number; end: number } | null;
  uiLocale: string;
  /** Shorten titles that name a long country. Localized national titles stay as written. */
  fit?: boolean;
}): SeasonalText {
  const copy = copyFor(input.localeCode);
  const count = copy.countKind === "bridges" ? input.facts.bridges : input.facts.days;
  const base = {
    year: input.year,
    where: input.where,
    count,
    budget: input.budget,
    leave: input.budget,
    total: input.daysOff,
    multiplier: input.multiplier.toFixed(1),
  };
  const best = input.facts.best;
  const bestTokens = best
    ? {
        ...base,
        leave: best.leave,
        length: best.length,
        when: whenLabel(best, input.uiLocale),
        holiday: joinNames(best.holidays, copy.and),
        range: formatRangeLocale(input.uiLocale, best.start, best.end),
      }
    : base;
  const longestTokens = input.longest
    ? {
        ...base,
        leave: input.longest.leave,
        length: input.longest.length,
        range: formatRangeLocale(input.uiLocale, input.longest.start, input.longest.end),
      }
    : base;

  const intro = [
    count === 0 ? fill(copy.introNone, base) : formText(input.uiLocale, count, copy.introCount, base),
    ...(best ? [formText(input.uiLocale, best.leave, copy.introBest, bestTokens)] : []),
    fill(copy.introBudget, base),
  ];

  const rawTitle = fill(input.regional ? copy.regionTitle : copy.title, {
    year: input.year,
    where: input.where,
  });
  const title = input.fit || input.regional ? fitTitle(rawTitle) : rawTitle;

  return {
    title,
    description: formText(input.uiLocale, count, copy.description, base),
    intro,
    updatedLabel: fill(copy.updated, { date: formatBuildDate(input.uiLocale) }),
    updatedDate: BUILD_DATE,
    faq: [
      {
        question: fill(copy.qCount, base),
        answer:
          count === 0 ? fill(copy.aCountNone, base) : formText(input.uiLocale, count, copy.aCount, base),
      },
      {
        question: fill(copy.qBest, base),
        answer: best
          ? formText(input.uiLocale, best.leave, copy.aBest, bestTokens)
          : fill(copy.aBestNone, base),
      },
      {
        question: fill(copy.qLongest, base),
        answer: input.longest
          ? formText(input.uiLocale, input.longest.leave, copy.aLongest, longestTokens)
          : fill(copy.aLongestNone, base),
      },
      {
        question: fill(copy.qBudget, base),
        answer: fill(copy.aBudget, base),
      },
    ],
  };
}

export function localizedSeasonal(input: {
  localeCode: string;
  year: number;
  where: string;
  regional: boolean;
  file: HolidayFile;
  country: string;
  region: string | null;
  budget: number;
  daysOff: number;
  multiplier: number;
  breaks: Break[];
  uiLocale: string;
  fit?: boolean;
}): SeasonalText {
  return seasonalText({
    ...input,
    facts: findBridgeFacts(input.file, input.country, input.region, input.localeCode),
    longest: longestFromBreaks(input.breaks),
  });
}

export function englishCountryTitle(place: string, year: number): string {
  return fitTitle(fill(copyFor("en").title, { year, where: `in ${place}` }));
}

export function bestPageText(input: {
  localeCode: string;
  year: number;
  where: string;
  place: string;
  countries: number;
  days: number;
  off: number;
  topName: string;
  topOff: number;
  isTop: boolean;
  uiLocale: string;
}): Pick<SeasonalText, "title" | "description" | "intro" | "updatedLabel" | "updatedDate"> {
  const copy = copyFor(input.localeCode);
  const tokens = {
    year: input.year,
    where: input.where,
    place: input.place,
    countries: input.countries,
    days: input.days,
    off: input.off,
    topName: input.topName,
    topOff: input.topOff,
  };
  const intro = input.isTop
    ? [fill(copy.bestLeadTop, tokens), fill(copy.bestMethod, tokens)]
    : [fill(copy.bestLead, tokens), fill(copy.bestFollow, tokens), fill(copy.bestMethod, tokens)];
  return {
    title: fill(copy.bestTitle, tokens),
    description: fill(copy.bestDescription, tokens),
    intro,
    updatedLabel: fill(copy.updated, { date: formatBuildDate(input.uiLocale) }),
    updatedDate: BUILD_DATE,
  };
}

export function pageJsonLd(input: {
  title: string;
  description: string;
  url: string;
  inLanguage: string;
  applicationName?: string;
  breadcrumbs?: Array<{ name: string; item: string }>;
  faq?: FaqItem[];
  dateModified?: string;
}): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      name: input.title,
      description: input.description,
      url: input.url,
      inLanguage: input.inLanguage,
      ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    },
  ];
  if (input.applicationName) {
    graph.push({
      "@type": "WebApplication",
      name: input.applicationName,
      url: input.url,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      inLanguage: input.inLanguage,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  }
  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: input.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.item,
      })),
    });
  }
  if (input.faq && input.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: input.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
