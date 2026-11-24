import { afterEach, describe, expect, it } from "vitest";
import {
  affiliateUrl,
  bookingUrl,
  DESTINATIONS,
  getYourGuideUrl,
  isoDay,
  kiwiUrl,
  type Partner,
  tripDates,
  tripLinks,
} from "./affiliate";
import { dayNum } from "./dates";

const PROGRAMS: Record<Partner, string> = { booking: "111", kiwi: "222", getyourguide: "333" };
const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("isoDay", () => {
  it("pads months and days", () => {
    expect(isoDay(dayNum(2027, 1, 5))).toBe("2027-01-05");
    expect(isoDay(dayNum(2027, 12, 31))).toBe("2027-12-31");
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
      expect(tripDates(dayNum(2027, 2, 27), day), tz).toEqual({
        from: "2027-02-27",
        to: "2027-03-01",
        checkout: "2027-03-01",
      });
    }
  });
});

describe("tripDates", () => {
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
    expect(tripDates(dayNum(2027, 12, 31), dayNum(2027, 12, 31))).toEqual({
      from: "2027-12-31",
      to: "2027-12-31",
      checkout: "2028-01-01",
    });
  });
});

describe("partner URLs", () => {
  it("builds a Booking.com search", () => {
    const url = new URL(bookingUrl("Stockholm", "2027-05-01", "2027-05-09"));
    expect(url.origin + url.pathname).toBe("https://www.booking.com/searchresults.html");
    expect(url.searchParams.get("ss")).toBe("Stockholm");
    expect(url.searchParams.get("checkin")).toBe("2027-05-01");
    expect(url.searchParams.get("checkout")).toBe("2027-05-09");
  });

  it("encodes free-text destinations", () => {
    const booking = bookingUrl("Kraków & co", "2027-05-01", "2027-05-09");
    expect(booking).toContain("ss=Krak%C3%B3w+%26+co&");
    expect(new URL(booking).searchParams.get("ss")).toBe("Kraków & co");
    const gyg = new URL(getYourGuideUrl("New York", "2027-05-01", "2027-05-09"));
    expect(gyg.searchParams.get("q")).toBe("New York");
    expect(kiwiUrl("a/b", "anywhere", "2027-05-01", "2027-05-09")).toBe(
      "https://www.kiwi.com/en/search/results/a%2Fb/anywhere/2027-05-01/2027-05-09",
    );
  });

  it("builds a Kiwi.com search to anywhere", () => {
    expect(kiwiUrl("stockholm-sweden", "anywhere", "2027-05-01", "2027-05-09")).toBe(
      "https://www.kiwi.com/en/search/results/stockholm-sweden/anywhere/2027-05-01/2027-05-09",
    );
  });

  it("builds a GetYourGuide search", () => {
    expect(getYourGuideUrl("Stockholm", "2027-05-01", "2027-05-09")).toBe(
      "https://www.getyourguide.com/s/?q=Stockholm&date_from=2027-05-01&date_to=2027-05-09",
    );
  });
});

describe("affiliateUrl", () => {
  const plain = "https://www.booking.com/searchresults.html?ss=Oslo&checkin=2027-05-01&checkout=2027-05-09";

  it("leaves links plain without a marker", () => {
    expect(affiliateUrl(plain, "booking", "", PROGRAMS)).toBe(plain);
  });

  it("leaves links plain without a program ID", () => {
    expect(affiliateUrl(plain, "booking", "12345", { ...PROGRAMS, booking: "" })).toBe(plain);
  });

  it("wraps links in a Travelpayouts deep link with a marker", () => {
    const wrapped = affiliateUrl(plain, "booking", "12345", PROGRAMS);
    const url = new URL(wrapped);
    expect(url.origin + url.pathname).toBe("https://tp.media/r");
    expect(url.searchParams.get("marker")).toBe("12345");
    expect(url.searchParams.get("p")).toBe("111");
    expect(url.searchParams.get("u")).toBe(plain);
    expect(wrapped).toContain(`u=${encodeURIComponent(plain)}`);
  });
});

describe("tripLinks", () => {
  const start = dayNum(2027, 5, 1);
  const end = dayNum(2027, 5, 9);

  it("gives stays, flights and things to do for a known country", () => {
    const links = tripLinks("SE", start, end, { marker: "", programs: PROGRAMS });
    expect(links.map((l) => [l.kind, l.partner])).toEqual([
      ["stays", "booking"],
      ["flights", "kiwi"],
      ["things", "getyourguide"],
    ]);
    expect(links[0]?.href).toContain("checkin=2027-05-01&checkout=2027-05-09");
    expect(links[1]?.href).toBe(
      "https://www.kiwi.com/en/search/results/stockholm-sweden/anywhere/2027-05-01/2027-05-09",
    );
    expect(links[2]?.href).toContain("date_from=2027-05-01&date_to=2027-05-09");
  });

  it("accepts lower-case country codes", () => {
    expect(tripLinks("se", start, end, { marker: "" })).toHaveLength(3);
  });

  it("wraps every link with a marker", () => {
    for (const link of tripLinks("DE", start, end, { marker: "999", programs: PROGRAMS })) {
      expect(link.href.startsWith("https://tp.media/r?marker=999&p=")).toBe(true);
    }
  });

  it("falls back to the country name and drops flights for unknown countries", () => {
    const links = tripLinks("AL", start, end, { marker: "", fallbackCity: "Albania" });
    expect(links.map((l) => l.kind)).toEqual(["stays", "things"]);
    expect(new URL(links[0]?.href ?? "").searchParams.get("ss")).toBe("Albania");
  });

  it("skips every button without any destination", () => {
    expect(tripLinks("ZZ", start, end, { marker: "" })).toEqual([]);
    expect(tripLinks("ZZ", start, end, { marker: "", fallbackCity: "  " })).toEqual([]);
  });

  it("has no flights for Ukraine", () => {
    expect(tripLinks("UA", start, end, { marker: "" }).map((l) => l.kind)).toEqual(["stays", "things"]);
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
    for (const dest of Object.values(DESTINATIONS)) {
      if (dest.from) expect(dest.from).toMatch(/^[a-z]+(?:-[a-z]+)+$/);
    }
  });
});
