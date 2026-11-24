/**
 * "Plan this break" travel links: every affiliate setting lives in this module.
 *
 * Without a Travelpayouts marker (or without a program ID for a partner) the links are plain
 * partner search URLs. With both, they are wrapped in a Travelpayouts deep link so the partner can
 * credit the booking. See docs/affiliate.md.
 *
 * Everything here is pure: no DOM, no fetches, no Date objects in local time.
 */
import { type DayNum, parts } from "./dates";

/** Travelpayouts marker (partner ID). Set PUBLIC_TP_MARKER at build time to turn affiliate links on. */
export const TP_MARKER: string =
  ((import.meta.env.PUBLIC_TP_MARKER as string | undefined) ?? "").trim() || "";

export type Partner = "booking" | "kiwi" | "getyourguide";
export type TripKind = "stays" | "flights" | "things";

/**
 * Travelpayouts program IDs, the `p` parameter of a tp.media link. A partner with an empty ID is
 * never wrapped, so a missing ID gives a plain partner link instead of a broken redirect.
 *
 * TODO: confirm each ID in the Travelpayouts dashboard (Tools > Links, after joining the program).
 * TODO: Kiwi.com links are built from a "custom_url" template in Travelpayouts rather than the
 * generic link form; check that tp.media wrapping is accepted for Kiwi before filling its ID.
 */
export const TP_PROGRAMS: Record<Partner, string> = {
  booking: "",
  kiwi: "",
  getyourguide: "",
};

/**
 * Where a break's links point for one country.
 * `city`: where Stays and Things to do search (English name, free text on both partners).
 * `from`: Kiwi.com city slug the flight search starts from. Leave it out to hide Flights.
 * Flights go to "anywhere", which Kiwi.com supports.
 */
export interface Destination {
  city: string;
  from?: string;
}

/**
 * Per-country defaults. Countries missing here use the country name for Stays and Things to do
 * (both partners search countries too) and get no Flights button.
 */
export const DESTINATIONS: Record<string, Destination> = {
  AT: { city: "Vienna", from: "vienna-austria" },
  AU: { city: "Sydney", from: "sydney-new-south-wales-australia" },
  BE: { city: "Brussels", from: "brussels-belgium" },
  BG: { city: "Sofia", from: "sofia-bulgaria" },
  CA: { city: "Toronto", from: "toronto-ontario-canada" },
  CH: { city: "Zurich", from: "zurich-switzerland" },
  CY: { city: "Paphos" },
  CZ: { city: "Prague", from: "prague-czechia" },
  DE: { city: "Berlin", from: "berlin-germany" },
  DK: { city: "Copenhagen", from: "copenhagen-denmark" },
  EE: { city: "Tallinn", from: "tallinn-estonia" },
  ES: { city: "Barcelona", from: "madrid-spain" },
  FI: { city: "Helsinki", from: "helsinki-finland" },
  FR: { city: "Paris", from: "paris-france" },
  GB: { city: "London", from: "london-united-kingdom" },
  GR: { city: "Athens", from: "athens-greece" },
  HR: { city: "Split", from: "zagreb-croatia" },
  HU: { city: "Budapest", from: "budapest-hungary" },
  IE: { city: "Dublin", from: "dublin-ireland" },
  IS: { city: "Reykjavik", from: "reykjavik-iceland" },
  IT: { city: "Rome", from: "rome-italy" },
  JP: { city: "Tokyo", from: "tokyo-japan" },
  LT: { city: "Vilnius", from: "vilnius-lithuania" },
  LU: { city: "Luxembourg", from: "luxembourg-luxembourg" },
  LV: { city: "Riga", from: "riga-latvia" },
  MT: { city: "Valletta" },
  NL: { city: "Amsterdam", from: "amsterdam-netherlands" },
  NO: { city: "Oslo", from: "oslo-norway" },
  NZ: { city: "Auckland", from: "auckland-new-zealand" },
  PL: { city: "Kraków", from: "warsaw-poland" },
  PT: { city: "Lisbon", from: "lisbon-portugal" },
  RO: { city: "Bucharest", from: "bucharest-romania" },
  SE: { city: "Stockholm", from: "stockholm-sweden" },
  SI: { city: "Ljubljana", from: "ljubljana-slovenia" },
  SK: { city: "Bratislava", from: "bratislava-slovakia" },
  // No civil flights from Ukraine while its airspace is closed, so no Flights button.
  UA: { city: "Lviv" },
  US: { city: "New York", from: "new-york-city-new-york-united-states" },
};

/** `YYYY-MM-DD` from the UTC calendar parts, so the time zone never shifts the date. */
export function isoDay(day: DayNum): string {
  const { year, month, day: d } = parts(day);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Trip dates for a break from its first to its last day off.
 * You leave on the first day off and come home on the last one, so check-out is the last day off
 * (nights = length - 1). A one-day break would give zero nights, so it checks out the next day.
 */
export function tripDates(start: DayNum, end: DayNum): { from: string; to: string; checkout: string } {
  return { from: isoDay(start), to: isoDay(end), checkout: isoDay(end > start ? end : start + 1) };
}

export function bookingUrl(city: string, checkin: string, checkout: string): string {
  const q = new URLSearchParams({
    ss: city,
    checkin,
    checkout,
    group_adults: "2",
    no_rooms: "1",
    group_children: "0",
  });
  return `https://www.booking.com/searchresults.html?${q}`;
}

/** Kiwi.com results page. `to` is a city slug or `anywhere`. Dates are `YYYY-MM-DD`. */
export function kiwiUrl(from: string, to: string, depart: string, back: string): string {
  const path = [from, to, depart, back].map(encodeURIComponent).join("/");
  return `https://www.kiwi.com/en/search/results/${path}`;
}

export function getYourGuideUrl(query: string, dateFrom: string, dateTo: string): string {
  const q = new URLSearchParams({ q: query, date_from: dateFrom, date_to: dateTo });
  return `https://www.getyourguide.com/s/?${q}`;
}

/**
 * Wrap a partner URL in a Travelpayouts deep link. Returns the URL unchanged without a marker or
 * a program ID. TODO: add `trs` (project ID) and `campaign_id` once confirmed in the dashboard.
 */
export function affiliateUrl(
  url: string,
  partner: Partner,
  marker: string = TP_MARKER,
  programs: Record<Partner, string> = TP_PROGRAMS,
): string {
  const program = programs[partner];
  if (!marker || !program) return url;
  return `https://tp.media/r?marker=${encodeURIComponent(marker)}&p=${encodeURIComponent(program)}&u=${encodeURIComponent(url)}`;
}

export interface TripLink {
  kind: TripKind;
  partner: Partner;
  href: string;
}

export interface TripOptions {
  /** Used for Stays and Things to do when the country has no entry, usually the country's name. */
  fallbackCity?: string;
  marker?: string;
  programs?: Record<Partner, string>;
}

/**
 * Links for one break, in display order: Stays, Flights, Things to do. A button whose destination
 * is unknown is left out rather than pointing at a broken search.
 */
export function tripLinks(
  country: string,
  start: DayNum,
  end: DayNum,
  options: TripOptions = {},
): TripLink[] {
  const { marker = TP_MARKER, programs = TP_PROGRAMS } = options;
  const dest = DESTINATIONS[country.toUpperCase()];
  const city = dest?.city ?? options.fallbackCity?.trim();
  const dates = tripDates(start, end);
  const links: TripLink[] = [];
  const add = (kind: TripKind, partner: Partner, url: string) =>
    links.push({ kind, partner, href: affiliateUrl(url, partner, marker, programs) });
  if (city) add("stays", "booking", bookingUrl(city, dates.from, dates.checkout));
  if (dest?.from) add("flights", "kiwi", kiwiUrl(dest.from, "anywhere", dates.from, dates.to));
  if (city) add("things", "getyourguide", getYourGuideUrl(city, dates.from, dates.to));
  return links;
}
