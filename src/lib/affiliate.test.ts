import { afterEach, describe, expect, it } from "vitest";
import {
  affiliateUrl,
  aviasalesUrl,
  bookingUrl,
  DESTINATIONS,
  ddmm,
  economyBookingsUrl,
  FLIGHT_WINDOW_DAYS,
  getYourGuideUrl,
  isoDay,
  kiwiUrl,
  PARTNERS,
  type Partner,
  type PartnerConfig,
  TP_MARKER,
  TP_TRS,
  tripDates,
  tripLinks,
} from "./affiliate";
import { dayNum } from "./dates";

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

/** Every partner on, none with a program ID, like PARTNERS with all flags flipped on. */
function partners(
  overrides: Partial<Record<Partner, Partial<PartnerConfig>>> = {},
): Record<Partner, PartnerConfig> {
  const all = Object.fromEntries(
    (Object.keys(PARTNERS) as Partner[]).map((p) => [p, { enabled: true, program: "", ...overrides[p] }]),
  );
  return all as Record<Partner, PartnerConfig>;
}

describe("defaults", () => {
  it("uses the Travelpayouts marker and project", () => {
    expect(TP_MARKER).toBe("811075");
    expect(TP_TRS).toBe("606096");
  });

  it("has affiliate tracking on for connected programs only", () => {
    expect(PARTNERS.aviasales.enabled).toBe(true);
    expect(PARTNERS.kiwi.enabled).toBe(true);
    expect(PARTNERS.economybookings.enabled).toBe(true);
    expect(PARTNERS.booking.enabled).toBe(false);
    expect(PARTNERS.getyourguide.enabled).toBe(false);
  });
});

describe("dates", () => {
  it("pads ISO days and DDMM", () => {
    expect(isoDay(dayNum(2027, 1, 5))).toBe("2027-01-05");
    expect(isoDay(dayNum(2027, 12, 31))).toBe("2027-12-31");
    expect(ddmm(dayNum(2027, 1, 5))).toBe("0501");
    expect(ddmm(dayNum(2027, 12, 31))).toBe("3112");
  });

  it("gives the same date in every time zone", () => {
    const day = dayNum(2027, 3, 1);
    for (const tz of [
      "UTC",
      "Pacific/Kiritimati",
      "Pacific/Pago_Pago",
      "America/Los_Angeles",
      "Asia/Tokyo",
    ]) {
      process.env.TZ = tz;
      expect(isoDay(day), tz).toBe("2027-03-01");
      expect(ddmm(day), tz).toBe("0103");
      expect(tripDates(dayNum(2027, 2, 27), day), tz).toEqual({
        from: "2027-02-27",
        to: "2027-03-01",
        checkout: "2027-03-01",
      });
    }
  });

  it("checks out on the last day off", () => {
    expect(tripDates(dayNum(2027, 5, 1), dayNum(2027, 5, 9))).toEqual({
      from: "2027-05-01",
      to: "2027-05-09",
      checkout: "2027-05-09",
    });
  });

  it("crosses month and year boundaries", () => {
    expect(tripDates(dayNum(2027, 12, 24), dayNum(2028, 1, 2))).toEqual({
      from: "2027-12-24",
      to: "2028-01-02",
      checkout: "2028-01-02",
    });
    expect(tripDates(dayNum(2028, 2, 26), dayNum(2028, 2, 29)).to).toBe("2028-02-29");
  });

  it("gives a one-day break one night", () => {
    expect(tripDates(dayNum(2027, 12, 31), dayNum(2027, 12, 31)).checkout).toBe("2028-01-01");
  });
});

describe("partner URLs", () => {
  it("builds an Aviasales search: ORIGIN DDMM DEST DDMM passengers", () => {
    expect(aviasalesUrl("STO", "BCN", dayNum(2026, 12, 1), dayNum(2026, 12, 8))).toBe(
      "https://www.aviasales.com/search/STO0112BCN08121",
    );
    // Month and year boundaries.
    expect(aviasalesUrl("STO", "BCN", dayNum(2026, 12, 31), dayNum(2027, 1, 10))).toBe(
      "https://www.aviasales.com/search/STO3112BCN10011",
    );
    expect(aviasalesUrl("sto", "bcn", dayNum(2027, 2, 27), dayNum(2027, 3, 1), 2)).toBe(
      "https://www.aviasales.com/search/STO2702BCN01032",
    );
  });

  it("builds a Booking.com search", () => {
    const url = new URL(bookingUrl("Stockholm", "2027-05-01", "2027-05-09"));
    expect(url.origin + url.pathname).toBe("https://www.booking.com/searchresults.html");
    expect(url.searchParams.get("ss")).toBe("Stockholm");
    expect(url.searchParams.get("checkin")).toBe("2027-05-01");
    expect(url.searchParams.get("checkout")).toBe("2027-05-09");
  });

  it("builds Kiwi.com, GetYourGuide and Economybookings searches", () => {
    expect(kiwiUrl("STO", "anywhere", "2027-05-01", "2027-05-09")).toBe(
      "https://www.kiwi.com/deep?from=STO&to=anywhere&departure=2027-05-01&return=2027-05-09",
    );
    expect(getYourGuideUrl("Stockholm", "2027-05-01", "2027-05-09")).toBe(
      "https://www.getyourguide.com/s/?q=Stockholm&date_from=2027-05-01&date_to=2027-05-09",
    );
    expect(economyBookingsUrl("Stockholm")).toBe("https://www.economybookings.com/en?idpick=Stockholm");
  });

  it("encodes free text and path segments", () => {
    const booking = bookingUrl("Kraków & co", "2027-05-01", "2027-05-09");
    expect(booking).toContain("ss=Krak%C3%B3w+%26+co&");
    expect(new URL(booking).searchParams.get("ss")).toBe("Kraków & co");
    expect(new URL(getYourGuideUrl("New York", "2027-05-01", "2027-05-09")).searchParams.get("q")).toBe(
      "New York",
    );
    expect(new URL(economyBookingsUrl("Kraków")).searchParams.get("idpick")).toBe("Kraków");
    expect(kiwiUrl("a&b", "anywhere", "2027-05-01", "2027-05-09")).toContain("from=a%26b&to=anywhere");
    expect(aviasalesUrl("S/O", "BCN", dayNum(2027, 5, 1), dayNum(2027, 5, 9))).toBe(
      "https://www.aviasales.com/search/S%2FO0105BCN09051",
    );
  });
});

describe("affiliateUrl", () => {
  const aviasales = "https://www.aviasales.com/search/STO0112BCN08121";
  const booking = "https://www.booking.com/searchresults.html?ss=Oslo&checkin=2027-05-01&checkout=2027-05-09";

  it("adds Aviasales' marker parameter by default", () => {
    expect(affiliateUrl(aviasales, "aviasales")).toBe(`${aviasales}?marker=811075`);
  });

  it("wraps Kiwi.com deep links in Travelpayouts' documented custom link", () => {
    const kiwi = "https://www.kiwi.com/deep?from=STO&to=anywhere&departure=2026-12-31&return=2027-01-10";
    const wrapped = affiliateUrl(kiwi, "kiwi");
    expect(wrapped).toBe(
      `https://c111.travelpayouts.com/click?shmarker=811075&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent(kiwi)}`,
    );
    expect(new URL(wrapped).searchParams.get("custom_url")).toBe(kiwi);
    expect(affiliateUrl(kiwi, "kiwi", { partners: partners({ kiwi: { enabled: false } }) })).toBe(kiwi);
  });

  it("leaves pending, locked and unconfirmed partners plain by default", () => {
    expect(affiliateUrl(booking, "booking")).toBe(booking);
    const gyg = "https://www.getyourguide.com/s/?q=Oslo";
    expect(affiliateUrl(gyg, "getyourguide")).toBe(gyg);
    const car = "https://www.economybookings.com/en?idpick=Oslo";
    expect(affiliateUrl(car, "economybookings")).toBe(car);
  });

  it("leaves every link plain without a marker", () => {
    const all = partners({ booking: { program: "111" } });
    expect(affiliateUrl(aviasales, "aviasales", { marker: "", partners: all })).toBe(aviasales);
    expect(affiliateUrl(booking, "booking", { marker: "", partners: all })).toBe(booking);
  });

  it("leaves a disabled partner plain even with a program ID", () => {
    const off = partners({
      aviasales: { enabled: false, program: "100" },
      booking: { enabled: false, program: "1" },
    });
    expect(affiliateUrl(aviasales, "aviasales", { partners: off })).toBe(aviasales);
    expect(affiliateUrl(booking, "booking", { partners: off })).toBe(booking);
  });

  it("wraps an enabled partner with a program ID in a tp.media redirect", () => {
    const wrapped = affiliateUrl(booking, "booking", { partners: partners({ booking: { program: "111" } }) });
    expect(wrapped).toBe(
      `https://tp.media/r?marker=811075&trs=606096&p=111&u=${encodeURIComponent(booking)}`,
    );
    const url = new URL(wrapped);
    expect(url.searchParams.get("u")).toBe(booking);
  });

  it("keeps an Aviasales URL's existing query when adding the marker", () => {
    expect(affiliateUrl(`${aviasales}?currency=eur`, "aviasales", { marker: "42" })).toBe(
      `${aviasales}?currency=eur&marker=42`,
    );
  });
});

describe("tripLinks", () => {
  const start = dayNum(2027, 5, 1);
  const end = dayNum(2027, 5, 9);

  it("puts Flights first, then Stays, Things to do and Car rental", () => {
    const links = tripLinks("SE", start, end);
    expect(links.map((l) => [l.kind, l.partner])).toEqual([
      ["flights", "kiwi"],
      ["stays", "booking"],
      ["things", "getyourguide"],
      ["cars", "economybookings"],
    ]);
    expect(links.map((l) => l.href)).toEqual([
      `https://c111.travelpayouts.com/click?shmarker=811075&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent("https://www.kiwi.com/deep?from=STO&to=anywhere&departure=2027-05-01&return=2027-05-09")}`,
      "https://www.booking.com/searchresults.html?ss=Stockholm&checkin=2027-05-01&checkout=2027-05-09&group_adults=2&no_rooms=1&group_children=0",
      "https://www.getyourguide.com/s/?q=Stockholm&date_from=2027-05-01&date_to=2027-05-09",
      "https://www.economybookings.com/en?idpick=Stockholm",
    ]);
  });

  it("can use Aviasales to the country's popular destination for Flights", () => {
    expect(tripLinks("se", start, end, { flights: "aviasales" })[0]).toEqual({
      kind: "flights",
      partner: "aviasales",
      href: "https://www.aviasales.com/search/STO0105BCN09051?marker=811075",
    });
  });

  it("sends plain links with an empty marker", () => {
    for (const link of tripLinks("SE", start, end, { marker: "" })) {
      expect(link.href).not.toMatch(/marker|travelpayouts|tp\.media/);
    }
  });

  it("drops Flights for breaks beyond the booking window", () => {
    const today = start - FLIGHT_WINDOW_DAYS;
    expect(tripLinks("SE", start, end, { today })[0]?.kind).toBe("flights");
    expect(tripLinks("SE", start, end, { today: today - 1 }).map((l) => l.kind)).toEqual([
      "stays",
      "things",
      "cars",
    ]);
  });

  it("falls back to the country name, without Flights or Car rental, for unknown countries", () => {
    const links = tripLinks("AL", start, end, { fallbackCity: "Albania" });
    expect(links.map((l) => l.kind)).toEqual(["stays", "things"]);
    expect(new URL(links[0]?.href ?? "").searchParams.get("ss")).toBe("Albania");
  });

  it("skips every button without any destination", () => {
    expect(tripLinks("ZZ", start, end)).toEqual([]);
    expect(tripLinks("ZZ", start, end, { fallbackCity: "  " })).toEqual([]);
  });

  it("has no flights for Ukraine", () => {
    expect(tripLinks("UA", start, end).map((l) => l.kind)).toEqual(["stays", "things", "cars"]);
  });

  it("covers the countries with localized pages", () => {
    for (const code of [
      "SE",
      "DE",
      "AT",
      "NL",
      "BE",
      "NO",
      "DK",
      "FI",
      "FR",
      "ES",
      "IT",
      "PT",
      "PL",
      "CZ",
      "UA",
      "GB",
      "US",
      "CH",
      "IE",
      "LU",
    ]) {
      expect(DESTINATIONS[code]?.city, code).toBeTruthy();
    }
    for (const [code, dest] of Object.entries(DESTINATIONS)) {
      if (dest.air) for (const iata of dest.air) expect(iata, code).toMatch(/^[A-Z]{3}$/);
    }
  });
});
