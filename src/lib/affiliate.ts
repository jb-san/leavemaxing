/**
 * "Plan this break" travel links: every affiliate setting lives in this module. See docs/affiliate.md.
 *
 * A link only carries affiliate tracking when its partner is `enabled` and we have a link format for
 * that partner that we could confirm. Anything else is the plain partner search URL, which still works.
 *
 * Everything here is pure: no DOM, no fetches, no Date objects in local time.
 */
import { type DayNum, parts } from "./dates";

/** Travelpayouts marker (partner ID). PUBLIC_TP_MARKER at build time overrides it; empty turns tracking off. */
export const TP_MARKER: string = (
  (import.meta.env.PUBLIC_TP_MARKER as string | undefined) ?? "811075"
).trim();

/** Travelpayouts project ID (`trs`), used on tp.media links. */
export const TP_TRS = "606096";

export type Partner = "aviasales" | "kiwi" | "booking" | "getyourguide" | "economybookings";
export type TripKind = "flights" | "stays" | "things" | "cars";

export interface PartnerConfig {
  /** Program connected in Travelpayouts. Flip to false to send plain links. */
  enabled: boolean;
  /**
   * Travelpayouts program ID (`p` of a tp.media link). When set, enabled links are wrapped as
   * `https://tp.media/r?marker=…&trs=…&p=…&u=…`. Leave empty until confirmed: a wrong ID breaks
   * attribution, so an empty one falls back to the partner's own marker format or a plain link.
   */
  program: string;
}

/**
 * Program status (24 Nov 2026). Link formats were checked against Travelpayouts' help centre; see
 * docs/affiliate.md. TODO for every `program: ""`: the tp.media program ID (`p`) isn't published, so
 * confirm it in the dashboard (Links > Create link, the long link shows `p=`) before filling it in.
 */
export const PARTNERS: Record<Partner, PartnerConfig> = {
  // Connected. Travelpayouts' documented Kiwi.com deep-link wrapper (c111.travelpayouts.com).
  kiwi: { enabled: true, program: "" },
  // Connected. Aviasales' own `?marker=` parameter.
  aviasales: { enabled: true, program: "" },
  // Connected (car rental). Travelpayouts only turns Economybookings links into affiliate links in
  // the dashboard generator, with no documented programmatic format, so links stay plain.
  // TODO: fill in the program ID to wrap them via tp.media.
  economybookings: { enabled: true, program: "" },
  // Pending approval.
  booking: { enabled: false, program: "" },
  // Locked.
  getyourguide: { enabled: false, program: "" },
};

/** Travelpayouts' Kiwi.com custom-link promo, from the "Kiwi.com affiliate links" help article. */
export const KIWI_PROMO_ID = "3791";

/**
 * Which partner the Flights button uses. Kiwi.com searches from the country's origin to "anywhere"
 * with full dates; Aviasales searches the country's popular destination. Both are tracked.
 */
export const FLIGHTS_PARTNER: "kiwi" | "aviasales" = "kiwi";

/**
 * How many upcoming breaks get the full "Plan this break" row. Later breaks get one compact link (to
 * their first partner), which keeps the list cheap to lay out and hydrate on phones.
 */
export const FULL_TRIP_ROWS = 5;

/**
 * Airlines sell seats about 330 days ahead (and Aviasales' `DDMM` dates carry no year: it picks the
 * next matching date), so breaks further out than this get no Flights button.
 */
export const FLIGHT_WINDOW_DAYS = 330;

/**
 * Where a break's links point for one country.
 * `city`: where Stays, Things to do and Car rental search (English name, free text).
 * `air`: IATA city codes `[origin, destination]`, e.g. `["STO", "BCN"]`. Kiwi.com flies from the
 * origin to anywhere; Aviasales from the origin to the destination. Without `air`, no Flights.
 */
export interface Destination {
  city: string;
  air?: readonly [string, string];
}

/**
 * Per-country defaults. Origin is the capital or main hub; the flight destination is a popular
 * trip from there. Countries missing here use the country name for Stays and Things to do (both
 * partners search countries too) and get no Flights or Car rental button.
 */
export const DESTINATIONS: Record<string, Destination> = {
  AT: { city: "Vienna", air: ["VIE", "BCN"] },
  AU: { city: "Sydney", air: ["SYD", "DPS"] },
  BE: { city: "Brussels", air: ["BRU", "BCN"] },
  BG: { city: "Sofia", air: ["SOF", "LON"] },
  CA: { city: "Toronto", air: ["YTO", "LON"] },
  CH: { city: "Zurich", air: ["ZRH", "LIS"] },
  CY: { city: "Paphos", air: ["LCA", "ATH"] },
  CZ: { city: "Prague", air: ["PRG", "BCN"] },
  DE: { city: "Berlin", air: ["BER", "PMI"] },
  DK: { city: "Copenhagen", air: ["CPH", "BCN"] },
  EE: { city: "Tallinn", air: ["TLL", "BCN"] },
  ES: { city: "Barcelona", air: ["MAD", "LON"] },
  FI: { city: "Helsinki", air: ["HEL", "AGP"] },
  FR: { city: "Paris", air: ["PAR", "LIS"] },
  GB: { city: "London", air: ["LON", "BCN"] },
  GR: { city: "Athens", air: ["ATH", "LON"] },
  HR: { city: "Split", air: ["ZAG", "LON"] },
  HU: { city: "Budapest", air: ["BUD", "LON"] },
  IE: { city: "Dublin", air: ["DUB", "BCN"] },
  IS: { city: "Reykjavik", air: ["REK", "LON"] },
  IT: { city: "Rome", air: ["ROM", "LON"] },
  JP: { city: "Tokyo", air: ["TYO", "SEL"] },
  LT: { city: "Vilnius", air: ["VNO", "LON"] },
  LU: { city: "Luxembourg", air: ["LUX", "LIS"] },
  LV: { city: "Riga", air: ["RIX", "LON"] },
  MT: { city: "Valletta", air: ["MLA", "LON"] },
  NL: { city: "Amsterdam", air: ["AMS", "BCN"] },
  NO: { city: "Oslo", air: ["OSL", "ALC"] },
  NZ: { city: "Auckland", air: ["AKL", "SYD"] },
  PL: { city: "Kraków", air: ["WAW", "LON"] },
  PT: { city: "Lisbon", air: ["LIS", "PAR"] },
  RO: { city: "Bucharest", air: ["BUH", "LON"] },
  SE: { city: "Stockholm", air: ["STO", "BCN"] },
  SI: { city: "Ljubljana", air: ["LJU", "LON"] },
  SK: { city: "Bratislava", air: ["BTS", "LON"] },
  // No civil flights from Ukraine while its airspace is closed, so no Flights button.
  UA: { city: "Lviv" },
  US: { city: "New York", air: ["NYC", "LON"] },
};

/** `YYYY-MM-DD` from the UTC calendar parts, so the time zone never shifts the date. */
export function isoDay(day: DayNum): string {
  const { year, month, day: d } = parts(day);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** `DDMM` for Aviasales search paths. */
export function ddmm(day: DayNum): string {
  const { month, day: d } = parts(day);
  return `${String(d).padStart(2, "0")}${String(month).padStart(2, "0")}`;
}

/**
 * Trip dates for a break from its first to its last day off.
 * You leave on the first day off and come home on the last one, so check-out is the last day off
 * (nights = length - 1). A one-day break would give zero nights, so it checks out the next day.
 */
export function tripDates(start: DayNum, end: DayNum): { from: string; to: string; checkout: string } {
  return { from: isoDay(start), to: isoDay(end), checkout: isoDay(end > start ? end : start + 1) };
}

/**
 * Aviasales results page: `ORIGIN DDMM DEST DDMM` then the passenger count, e.g. `STO0112BCN08121`
 * is Stockholm to Barcelona, 1 Dec back 8 Dec, one adult. Aviasales infers the year (the next
 * matching date), which is right for a break that hasn't started.
 */
export function aviasalesUrl(origin: string, dest: string, depart: DayNum, back: DayNum, adults = 1): string {
  const code = (iata: string) => encodeURIComponent(iata.toUpperCase());
  return `https://www.aviasales.com/search/${code(origin)}${ddmm(depart)}${code(dest)}${ddmm(back)}${adults}`;
}

/**
 * Kiwi.com deep link (the only Kiwi links Travelpayouts credits). `to` is an IATA code or `anywhere`.
 * Dates are `YYYY-MM-DD`.
 */
export function kiwiUrl(from: string, to: string, departure: string, back: string): string {
  const q = new URLSearchParams({ from, to, departure, return: back });
  return `https://www.kiwi.com/deep?${q}`;
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

export function getYourGuideUrl(query: string, dateFrom: string, dateTo: string): string {
  const q = new URLSearchParams({ q: query, date_from: dateFrom, date_to: dateTo });
  return `https://www.getyourguide.com/s/?${q}`;
}

/**
 * Economybookings car search for a pickup city (Travelpayouts' documented `idpick` link). Its
 * search has no documented date parameters, so the visitor picks dates there.
 */
export function economyBookingsUrl(city: string): string {
  return `https://www.economybookings.com/en?${new URLSearchParams({ idpick: city })}`;
}

export interface AffiliateOptions {
  marker?: string;
  trs?: string;
  partners?: Record<Partner, PartnerConfig>;
}

/**
 * Add affiliate tracking to a partner URL, in order of preference:
 * 1. a Travelpayouts tp.media redirect, when the partner has a program ID;
 * 2. the partner's documented format: Kiwi.com's c111 custom link, Aviasales' `marker` parameter;
 * 3. otherwise the URL unchanged.
 * Disabled partners and an empty marker always get the URL unchanged.
 */
export function affiliateUrl(url: string, partner: Partner, options: AffiliateOptions = {}): string {
  const { marker = TP_MARKER, trs = TP_TRS, partners = PARTNERS } = options;
  const config = partners[partner];
  if (!marker || !config.enabled) return url;
  if (config.program) {
    const project = trs ? `&trs=${encodeURIComponent(trs)}` : "";
    return `https://tp.media/r?marker=${encodeURIComponent(marker)}${project}&p=${encodeURIComponent(config.program)}&u=${encodeURIComponent(url)}`;
  }
  if (partner === "kiwi") {
    return `https://c111.travelpayouts.com/click?shmarker=${encodeURIComponent(marker)}&promo_id=${KIWI_PROMO_ID}&source_type=customlink&type=click&custom_url=${encodeURIComponent(url)}`;
  }
  if (partner === "aviasales") {
    const link = new URL(url);
    link.searchParams.set("marker", marker);
    return link.href;
  }
  return url;
}

export interface TripLink {
  kind: TripKind;
  partner: Partner;
  href: string;
}

export interface TripOptions extends AffiliateOptions {
  /** Used for Stays and Things to do when the country has no entry, usually the country's name. */
  fallbackCity?: string;
  flights?: "kiwi" | "aviasales";
  /** Today, to leave out Flights for breaks beyond FLIGHT_WINDOW_DAYS. Omit to always offer Flights. */
  today?: DayNum;
}

/**
 * Links for one break, in display order: Flights, Stays, Things to do, Car rental. A button whose
 * destination is unknown is left out rather than pointing at a broken search.
 */
export function tripLinks(
  country: string,
  start: DayNum,
  end: DayNum,
  options: TripOptions = {},
): TripLink[] {
  const dest = DESTINATIONS[country.toUpperCase()];
  const city = dest?.city ?? options.fallbackCity?.trim();
  const dates = tripDates(start, end);
  const links: TripLink[] = [];
  const add = (kind: TripKind, partner: Partner, url: string) =>
    links.push({ kind, partner, href: affiliateUrl(url, partner, options) });

  const air =
    options.today === undefined || start - options.today <= FLIGHT_WINDOW_DAYS ? dest?.air : undefined;
  if (air) {
    if ((options.flights ?? FLIGHTS_PARTNER) === "kiwi") {
      add("flights", "kiwi", kiwiUrl(air[0], "anywhere", dates.from, dates.to));
    } else {
      add("flights", "aviasales", aviasalesUrl(air[0], air[1], start, end));
    }
  }
  if (city) {
    add("stays", "booking", bookingUrl(city, dates.from, dates.checkout));
    add("things", "getyourguide", getYourGuideUrl(city, dates.from, dates.to));
  }
  // Only real cities: a country name isn't a pickup location.
  if (dest) add("cars", "economybookings", economyBookingsUrl(dest.city));
  return links;
}

/**
 * One partner search for an article (the travel guides), with the same partners, `enabled` flags and
 * tracking formats as the "Plan this break" row. Flights always use Kiwi.com, because a guide link
 * usually searches from a city to `anywhere` (or a named airport) on fixed dates, which is what
 * Kiwi.com's deep link does. Dates are `YYYY-MM-DD`.
 */
export type GuideLinkSpec =
  | { kind: "flights"; from: string; to: string; departure: string; back: string }
  | { kind: "stays"; city: string; checkin: string; checkout: string }
  | { kind: "things"; query: string; from: string; to: string };

export function guideLink(spec: GuideLinkSpec, options: AffiliateOptions = {}): TripLink {
  if (spec.kind === "flights") {
    const url = kiwiUrl(spec.from.toUpperCase(), spec.to === "anywhere" ? "anywhere" : spec.to.toUpperCase(), spec.departure, spec.back);
    return { kind: "flights", partner: "kiwi", href: affiliateUrl(url, "kiwi", options) };
  }
  if (spec.kind === "stays") {
    return {
      kind: "stays",
      partner: "booking",
      href: affiliateUrl(bookingUrl(spec.city, spec.checkin, spec.checkout), "booking", options),
    };
  }
  return {
    kind: "things",
    partner: "getyourguide",
    href: affiliateUrl(getYourGuideUrl(spec.query, spec.from, spec.to), "getyourguide", options),
  };
}
