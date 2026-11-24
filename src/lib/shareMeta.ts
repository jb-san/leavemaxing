/**
 * Link previews for shared plans.
 *
 * A shared plan link is a plan page with the leave days in the query, such as `/se/2027/?d=25` or
 * `/de-de/brueckentage-2027/?d=30`. Crawlers don't run JavaScript, so the Pages Function in
 * functions/_middleware.ts swaps the page's og: tags for a card made for that link. The cards are
 * PNGs rendered at build time for common leave-day counts (src/pages/og/s/), each page with a small
 * JSON manifest of them; a link the manifest doesn't cover keeps the page's own preview.
 *
 * This module has no imports, so the Pages Function can bundle it.
 */

/** Leave-day counts with a prepared card, besides each locale's default. */
export const SHARE_BUDGETS = [5, 10, 15, 20, 25, 30] as const;

/** One prepared card: what the link preview should say and show. */
export interface ShareCard {
  /** Site-relative path of the 1200×630 PNG. */
  image: string;
  title: string;
  description: string;
  /** Text alternative for the image. */
  alt: string;
}

/** `/og/s/{key}/{year}.json`: the cards for one plan page, keyed by leave days. */
export interface ShareManifest {
  /** The page these cards belong to, e.g. `/se/2027/`. */
  path: string;
  cards: Record<string, ShareCard>;
}

/** Country pages (`se`) and localized bridge-day pages (`de-de`) have separate cards. */
export function shareManifestPath(key: string, year: number): string {
  return `/og/s/${key}/${year}.json`;
}

export function shareImagePath(key: string, year: number, days: number): string {
  return `/og/s/${key}/${year}/${days}.png`;
}

/**
 * Query keys that change the plan. A link with any of them besides `d` gets the page's own preview,
 * since a prepared card would show the wrong numbers.
 */
const PLAN_KEYS = new Set([
  "r",
  "s",
  "min",
  "max",
  "m",
  "ys",
  "ww",
  "lk",
  "bk",
  "co",
  // The readable deep-link names of the same settings (src/lib/settings.ts, LINK_ALIASES).
  "region",
  "style",
  "months",
  "yearStart",
]);

const COUNTRY_PAGE = /^\/([a-z]{2})\/(\d{4})\/$/;
const LOCALIZED_PAGE = /^\/([a-z]{2}-[a-z]{2})\/[a-z0-9-]+-(\d{4})\/$/;

export interface ShareRequest {
  /** Where the page's card manifest is. */
  manifest: string;
  /** Leave days, normalised (`?d=025` is 25). */
  days: number;
  /** The link as it should be published in og:url: the page plus `?d=`. */
  shareUrl: string;
}

/** Whether a request is for a shared plan link that a prepared card can describe. */
export function parseShareRequest(url: URL): ShareRequest | null {
  const match = COUNTRY_PAGE.exec(url.pathname) ?? LOCALIZED_PAGE.exec(url.pathname);
  if (!match) return null;
  const [, key = "", yearText = ""] = match;
  const params = url.searchParams;
  // `days` is the deep-link name for `d`; `d` wins when a link has both, as in the planner.
  const d = params.get("d") ?? params.get("days");
  if (d === null || !/^\d{1,3}$/.test(d)) return null;
  for (const name of params.keys()) if (PLAN_KEYS.has(name)) return null;
  const year = Number(yearText);
  // A deep link may repeat the page's country and year. Any other value opens another plan.
  const country = params.get("country");
  const linkYear = params.get("year");
  if (country !== null && !(COUNTRY_PAGE.test(url.pathname) && country.trim().toLowerCase() === key))
    return null;
  if (linkYear !== null && linkYear.trim() !== yearText) return null;
  const days = Number(d);
  return {
    manifest: shareManifestPath(key, year),
    days,
    shareUrl: `${url.origin}${url.pathname}?d=${days}`,
  };
}

/** Escape text for an HTML attribute value. */
export function escapeAttribute(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
