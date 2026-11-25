import { describe, expect, it } from "vitest";
import { guideLink, PARTNERS } from "./affiliate";
import { fromIso } from "./dates";
import { bookable, hasPartnerLinks, parseGuideHref, renderGuideLinks } from "./guideLinks";

const KIWI = "https://www.kiwi.com/deep?from=STO&to=anywhere&departure=2027-05-06&return=2027-05-09";

describe("guideLink", () => {
  it("wraps Kiwi.com flights in the Travelpayouts custom link", () => {
    const link = guideLink(
      { kind: "flights", from: "sto", to: "anywhere", departure: "2027-05-06", back: "2027-05-09" },
      { marker: "811075" },
    );
    expect(link).toEqual({
      kind: "flights",
      partner: "kiwi",
      href: `https://c111.travelpayouts.com/click?shmarker=811075&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent(KIWI)}`,
    });
  });

  it("uppercases a named destination airport", () => {
    const link = guideLink(
      { kind: "flights", from: "STO", to: "lpa", departure: "2026-12-26", back: "2027-01-03" },
      { marker: "" },
    );
    expect(link.href).toBe(
      "https://www.kiwi.com/deep?from=STO&to=LPA&departure=2026-12-26&return=2027-01-03",
    );
  });

  it("keeps disabled partners plain", () => {
    expect(PARTNERS.booking.enabled).toBe(false);
    expect(PARTNERS.getyourguide.enabled).toBe(false);
    const stays = guideLink({
      kind: "stays",
      city: "Leksand",
      checkin: "2027-06-24",
      checkout: "2027-06-27",
    });
    expect(stays.partner).toBe("booking");
    expect(stays.href).toMatch(
      /^https:\/\/www\.booking\.com\/searchresults\.html\?ss=Leksand&checkin=2027-06-24&checkout=2027-06-27/,
    );
    const things = guideLink({ kind: "things", query: "Nuremberg", from: "2026-12-10", to: "2026-12-13" });
    expect(things.href).toBe(
      "https://www.getyourguide.com/s/?q=Nuremberg&date_from=2026-12-10&date_to=2026-12-13",
    );
  });

  it("sends every link plain with an empty marker", () => {
    const link = guideLink(
      { kind: "flights", from: "BER", to: "anywhere", departure: "2027-03-26", back: "2027-03-29" },
      { marker: "" },
    );
    expect(link.href).toMatch(/^https:\/\/www\.kiwi\.com\/deep\?/);
  });
});

describe("parseGuideHref", () => {
  it("reads the three partner schemes", () => {
    expect(parseGuideHref("flights:STO/anywhere/2027-05-06/2027-05-09")?.spec).toEqual({
      kind: "flights",
      from: "STO",
      to: "anywhere",
      departure: "2027-05-06",
      back: "2027-05-09",
    });
    expect(parseGuideHref("stays:Puerto_de_la_Cruz/2027-02-20/2027-02-27")?.spec).toEqual({
      kind: "stays",
      city: "Puerto de la Cruz",
      checkin: "2027-02-20",
      checkout: "2027-02-27",
    });
    expect(parseGuideHref("things:N%C3%BCrnberg/2026-12-10/2026-12-13")?.spec).toMatchObject({
      query: "Nürnberg",
    });
  });

  it("ignores ordinary links", () => {
    expect(parseGuideHref("/se/2027/")).toBeNull();
    expect(parseGuideHref("https://example.com/")).toBeNull();
    expect(parseGuideHref("mailto:hello@example.com")).toBeNull();
  });

  it("fails loudly on a malformed partner link", () => {
    expect(() => parseGuideHref("flights:STO/anywhere/2027-05-06")).toThrow(/expected/);
    expect(() => parseGuideHref("flights:Stockholm/anywhere/2027-05-06/2027-05-09")).toThrow(/IATA/);
    expect(() => parseGuideHref("flights:STO/anywhere/2027-02-30/2027-03-02")).toThrow(/dates/);
    expect(() => parseGuideHref("stays:Funchal/2027-02-27/2027-02-20")).toThrow(/before/);
  });
});

describe("bookable", () => {
  const parse = (href: string) => {
    const parsed = parseGuideHref(href);
    if (!parsed) throw new Error(href);
    return parsed;
  };
  const ascension = parse("flights:STO/anywhere/2027-05-06/2027-05-09");
  it("drops past dates and flights beyond the sales window", () => {
    expect(bookable(ascension, fromIso("2026-11-25"))).toBe(true);
    expect(bookable(ascension, fromIso("2027-05-07"))).toBe(false);
    expect(bookable(ascension, fromIso("2026-05-01"))).toBe(false);
    const stays = parse("stays:Leksand/2027-06-24/2027-06-27");
    expect(bookable(stays, fromIso("2026-05-01"))).toBe(true);
  });
});

describe("renderGuideLinks", () => {
  const html =
    '<p>Go. <a href="flights:STO/anywhere/2027-05-06/2027-05-09">Search flights</a> or <a href="stays:Leksand/2027-06-24/2027-06-27">hotels</a>, see <a href="/se/2027/">the planner</a>.</p>';

  it("adds the planner row's attributes and tracking", () => {
    const out = renderGuideLinks(html, { country: "SE", today: "2026-11-25" });
    expect(out).toContain('rel="sponsored nofollow noopener"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain(
      'data-track="affiliate_click" data-track-partner="kiwi" data-track-kind="flights" data-track-country="SE" data-track-days="4"',
    );
    expect(out).toContain("shmarker=811075");
    expect(out).toContain(
      'data-track-partner="booking" data-track-kind="stays" data-track-country="SE" data-track-days="4"',
    );
    expect(out).toContain(
      'href="https://www.booking.com/searchresults.html?ss=Leksand&amp;checkin=2027-06-24',
    );
    expect(out).toContain('<a href="/se/2027/">the planner</a>');
    expect(out).not.toMatch(/href="(?:flights|stays|things):/);
  });

  it("takes the flight's country from its origin", () => {
    const out = renderGuideLinks('<a href="flights:MUC/anywhere/2027-05-27/2027-05-30">x</a>', {
      country: "SE",
      today: "2026-11-25",
    });
    expect(out).toContain('data-track-country="DE"');
  });

  it("turns links that can't be booked any more into text", () => {
    const out = renderGuideLinks(html, { country: "SE", today: "2027-06-01" });
    expect(out).toContain("Go. Search flights or ");
    expect(out).toContain('data-track-kind="stays"');
  });

  it("detects partner links in markdown", () => {
    expect(hasPartnerLinks("[Search](flights:STO/anywhere/2027-05-06/2027-05-09)")).toBe(true);
    expect(hasPartnerLinks("[Planner](/se/2027/) and flights: none")).toBe(false);
  });
});
