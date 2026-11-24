import { countryByCode, meta, ogYears } from "~/data";
import { locales } from "~/data/locales";
import { serverPlan } from "~/data/server";
import { SITEMAP_PRIORITY_COUNTRIES } from "~/data/sitemap-config";
import { fill, getCopy } from "~/i18n";
import { calendarLabels, countryName, countText } from "~/i18n/format";
import { BRIDGE_PAGE_YEARS } from "~/i18n/routes";
import { leaveYearRange } from "~/lib/dates";
import type { Plan } from "~/lib/planner/types";
import { defaultSettings } from "~/lib/settings";
import { SHARE_BUDGETS, type ShareCard, type ShareManifest, shareImagePath } from "~/lib/shareMeta";

/**
 * Plan pages whose shared links get a prepared preview card. English country pages for the indexed
 * countries this year and next (the years the page previews cover too), and every localized
 * bridge-day page. Other links keep the page's own preview. About 800 cards, rendered in ~40 ms each.
 */
export interface ShareTarget {
  /** Country code or locale, lower case: the folder under /og/s/. */
  key: string;
  /** The page, e.g. `/se/2027/`. */
  path: string;
  country: string;
  year: number;
  /** `en` or a locale such as `de-DE`. */
  locale: string;
  budgets: number[];
}

export function shareTargets(): ShareTarget[] {
  const english = [...SITEMAP_PRIORITY_COUNTRIES]
    .filter((code) => countryByCode.has(code))
    .flatMap((country) =>
      ogYears.map((year) => ({
        key: country.toLowerCase(),
        path: `/${country.toLowerCase()}/${year}/`,
        country,
        year,
        locale: "en",
        budgets: [...SHARE_BUDGETS],
      })),
    );
  const localized = Object.values(locales).flatMap((locale) =>
    BRIDGE_PAGE_YEARS.filter((year) => meta.years.includes(year)).map((year) => ({
      key: locale.code.toLowerCase(),
      path: `/${locale.code.toLowerCase()}/${locale.slug}-${year}/`,
      country: locale.country,
      year,
      locale: locale.code,
      budgets: [...new Set([...SHARE_BUDGETS, locale.defaultBudget])].sort((a, b) => a - b),
    })),
  );
  return [...english, ...localized];
}

export interface ShareCardData {
  card: ShareCard;
  plan: Plan;
  range: { start: number; end: number };
  /** "Sweden 2027" */
  place: string;
  /** "25 leave days" */
  leave: string;
  /** "52 days off" */
  off: string;
  months: string[];
}

/**
 * The card for a page's plan with `days` leave days and otherwise default settings: what a shared
 * link with only `?d=` opens. Null when that plan uses no leave (nothing to show off).
 */
export function shareCardFor(target: ShareTarget, days: number): ShareCardData | null {
  const { plan } = serverPlan({ ...defaultSettings(target.country, target.year), budget: days });
  const { stats } = plan;
  if (stats.leaveUsed === 0) return null;
  const code = target.locale;
  const p = getCopy(code).planner;
  const name = countryByCode.get(target.country)?.name ?? target.country;
  const place = `${code === "en" ? name : countryName(target.country, code, name)} ${target.year}`;
  const leave = countText(code, stats.leaveUsed, p.heroLeave);
  const off = countText(code, stats.daysOff, p.heroOff);
  const ratio = fill(p.quipRatio, { ratio: stats.multiplier.toFixed(1) });
  const quip = stats.multiplier >= 2 ? p.quipHigh : stats.multiplier >= 1.6 ? p.quipMid : p.quipLow;
  return {
    card: {
      image: shareImagePath(target.key, target.year, days),
      title: `${leave} → ${off} · ${place}`,
      description: `${ratio} ${quip}`,
      alt: `${leave} → ${off}, ${place}`,
    },
    plan,
    range: leaveYearRange(target.year, 1),
    place,
    leave,
    off,
    months: calendarLabels(code).monthsShort,
  };
}

/** Every prepared card for one page, as the Pages Function reads it. */
export function shareManifest(target: ShareTarget): ShareManifest {
  const cards: ShareManifest["cards"] = {};
  for (const days of target.budgets) {
    const data = shareCardFor(target, days);
    if (data) cards[String(days)] = data.card;
  }
  return { path: target.path, cards };
}
