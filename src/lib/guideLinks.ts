/**
 * Partner links inside travel guides (src/content/guides). See docs/guides.md.
 *
 * Authors write short pseudo-URLs in markdown, and renderGuideLinks turns the rendered HTML's links
 * into the same partner links (and the same `affiliate_click` tracking attributes) as the planner's
 * "Plan this break" row. Tracking formats and partner flags come from src/lib/affiliate.ts, never from here.
 *
 *   [Search flights from Stockholm](flights:STO/anywhere/2026-12-24/2027-01-03)
 *   [Hotels in Funchal](stays:Funchal/2027-02-20/2027-02-27)
 *   [Tours in Nuremberg](things:Nuremberg/2026-12-04/2026-12-06)
 *
 * Use `_` or `%20` for spaces in names (`stays:Puerto_de_la_Cruz/…`).
 * A link whose dates have passed, or flights beyond FLIGHT_WINDOW_DAYS, is rendered as plain text, so
 * an old guide never sends readers to a search for dates they can't book.
 */
import { FLIGHT_WINDOW_DAYS, type GuideLinkSpec, guideLink, type TripLink } from "./affiliate";
import { BUILD_DATE } from "./buildDate";
import { type DayNum, fromIso } from "./dates";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMES = ["flights", "stays", "things"] as const;

/** Country of a flight origin (IATA city or airport code), for the `country` analytics property. */
export const ORIGIN_COUNTRY: Record<string, string> = {
  STO: "SE",
  ARN: "SE",
  GOT: "SE",
  MMX: "SE",
  LLA: "SE",
  BER: "DE",
  MUC: "DE",
  FRA: "DE",
  HAM: "DE",
  DUS: "DE",
  CGN: "DE",
  STR: "DE",
  NUE: "DE",
  LEJ: "DE",
  HAJ: "DE",
  CPH: "DK",
  OSL: "NO",
  HEL: "FI",
};

export interface ParsedGuideLink {
  spec: GuideLinkSpec;
  start: DayNum;
  end: DayNum;
}

function isDay(value: string | undefined): value is string {
  if (!value || !ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y as number, (m as number) - 1, d as number));
  return date.getUTCMonth() === (m as number) - 1 && date.getUTCDate() === d;
}

function name(value: string): string {
  return decodeURIComponent(value).replaceAll("_", " ").trim();
}

/**
 * Parse `flights:FROM/TO/DEPART/RETURN`, `stays:CITY/CHECKIN/CHECKOUT` or `things:QUERY/FROM/TO`.
 * Returns null for any other href. Throws for a malformed partner link, so a typo fails the build
 * instead of shipping a broken search.
 */
export function parseGuideHref(href: string): ParsedGuideLink | null {
  const match = /^([a-z]+):(.*)$/.exec(href);
  const scheme = match?.[1];
  if (!match || !scheme || !(SCHEMES as readonly string[]).includes(scheme)) return null;
  const parts = (match[2] ?? "").split("/");
  const fail = (why: string): never => {
    throw new Error(`Guide partner link "${href}": ${why}`);
  };
  if (scheme === "flights") {
    const [from, to, departure, back] = parts;
    if (parts.length !== 4 || !from || !to) fail("expected flights:FROM/TO/YYYY-MM-DD/YYYY-MM-DD");
    if (!/^[A-Za-z]{3}$/.test(from as string)) fail("FROM must be an IATA code");
    if (to !== "anywhere" && !/^[A-Za-z]{3}$/.test(to as string)) fail("TO must be an IATA code or anywhere");
    if (!isDay(departure) || !isDay(back)) fail("dates must be YYYY-MM-DD");
    const start = fromIso(departure as string);
    const end = fromIso(back as string);
    if (end < start) fail("return is before departure");
    return {
      spec: {
        kind: "flights",
        from: from as string,
        to: to as string,
        departure: departure as string,
        back: back as string,
      },
      start,
      end,
    };
  }
  const [rawName, first, last] = parts;
  if (parts.length !== 3 || !rawName) fail(`expected ${scheme}:NAME/YYYY-MM-DD/YYYY-MM-DD`);
  if (!isDay(first) || !isDay(last)) fail("dates must be YYYY-MM-DD");
  const start = fromIso(first as string);
  const end = fromIso(last as string);
  if (end < start) fail("end is before start");
  const label = name(rawName as string);
  const spec: GuideLinkSpec =
    scheme === "stays"
      ? { kind: "stays", city: label, checkin: first as string, checkout: last as string }
      : { kind: "things", query: label, from: first as string, to: last as string };
  return { spec, start, end };
}

/** Whether a link can still be booked on `today`: not started, and flights within the sales window. */
export function bookable(parsed: ParsedGuideLink, today: DayNum): boolean {
  if (parsed.start < today) return false;
  if (parsed.spec.kind === "flights" && parsed.start - today > FLIGHT_WINDOW_DAYS) return false;
  return true;
}

/** Whether a markdown body has any partner links (so the page shows the disclosure line). */
export function hasPartnerLinks(markdown: string): boolean {
  return /\]\((?:flights|stays|things):/.test(markdown);
}

const escapeAttr = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Opening tag for a partner link, with the planner row's attributes (TripLink in BreaksList.tsx). */
export function partnerOpenTag(link: TripLink, parsed: ParsedGuideLink, country: string): string {
  const attrs: Array<[string, string]> = [
    ["href", link.href],
    ["target", "_blank"],
    ["rel", "sponsored nofollow noopener"],
    ["class", `guide-partner guide-partner-${link.kind}`],
    ["data-track", "affiliate_click"],
    ["data-track-partner", link.partner],
    ["data-track-kind", link.kind],
    ["data-track-country", country],
    ["data-track-days", String(parsed.end - parsed.start + 1)],
  ];
  return `<a ${attrs.map(([key, value]) => `${key}="${escapeAttr(value)}"`).join(" ")}>`;
}

const PARTNER_LINK = /<a href="((?:flights|stays|things):[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

/**
 * Turn the partner pseudo-links in a guide's rendered HTML into real partner links. `country` is the
 * analytics country for stays and things-to-do links (flights use their origin's country). Links that
 * can no longer be booked on `today` (YYYY-MM-DD, default the build date) become plain text.
 */
export function renderGuideLinks(html: string, options: { country?: string; today?: string } = {}): string {
  const today = fromIso(options.today ?? BUILD_DATE);
  return html.replace(PARTNER_LINK, (_match, rawHref: string, text: string) => {
    const parsed = parseGuideHref(rawHref.replaceAll("&amp;", "&"));
    if (!parsed) return _match;
    if (!bookable(parsed, today)) return text;
    const link = guideLink(parsed.spec);
    const country =
      parsed.spec.kind === "flights"
        ? (ORIGIN_COUNTRY[parsed.spec.from.toUpperCase()] ?? options.country ?? "")
        : (options.country ?? "");
    return `${partnerOpenTag(link, parsed, country)}${text}</a>`;
  });
}
