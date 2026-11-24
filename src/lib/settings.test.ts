import { describe, expect, it } from "vitest";
import { dayNum, fromIso } from "./dates";
import {
  decodeDays,
  defaultSettings,
  encodeDays,
  fromLink,
  fromQuery,
  normalizeQuery,
  shareUrl,
  toQuery,
} from "./settings";

describe("day encoding", () => {
  it("round-trips days with ranges, including days outside the year", () => {
    const days = ["2027-01-01", "2027-01-02", "2027-01-03", "2027-05-07", "2028-01-04", "2026-12-31"].map(
      fromIso,
    );
    const text = encodeDays(days, 2027);
    expect(text).toBe("-1-2.3i.a8");
    expect(decodeDays(text, 2027)).toEqual([...days].sort((a, b) => a - b));
  });

  it("rejects garbage", () => {
    expect(decodeDays("zz-1", 2027)).toBeNull();
    expect(decodeDays("hello world", 2027)).toBeNull();
    expect(decodeDays("", 2027)).toEqual([]);
  });
});

describe("settings in the URL", () => {
  it("omits defaults", () => {
    expect(toQuery(defaultSettings("DE", 2027)).toString()).toBe("");
  });

  it("always shares the leave days, first", () => {
    expect(shareUrl(defaultSettings("DE", 2027))).toBe("https://leavemaxxing.com/de/2027/?d=20");
    const s = { ...defaultSettings("DE", 2027), budget: 30, style: "long" as const };
    expect(shareUrl(s, "https://example.com")).toBe("https://example.com/de/2027/?d=30&s=long");
  });

  it("shares a localized page when given one, and the link restores the plan there", () => {
    const s = { ...defaultSettings("DE", 2027), budget: 20 };
    const url = new URL(shareUrl(s, "https://leavemaxxing.com", "/de-de/brueckentage-2027/"));
    expect(url.pathname).toBe("/de-de/brueckentage-2027/");
    // The German page starts from 30 days, so the link has to say 20.
    const germanDefault = { ...defaultSettings("DE", 2027), budget: 30 };
    expect(fromQuery(url.searchParams, germanDefault, {}).settings.budget).toBe(20);
  });

  it("round-trips everything", () => {
    const s = {
      ...defaultSettings("DE", 2027),
      region: "BY",
      budget: 14,
      style: "long" as const,
      minBreak: 4,
      maxBreak: 12,
      months: [7, 8],
      yearStart: 4,
      workWeek: [true, true, true, true, false, false, false],
      locked: [dayNum(2027, 8, 16)],
      blocked: [dayNum(2027, 3, 12), dayNum(2027, 3, 13)],
      customOff: [dayNum(2027, 12, 24)],
    };
    const q = toQuery(s);
    const back = fromQuery(q, defaultSettings("DE", 2027), { BY: "Bavaria" });
    expect(back.invalid).toEqual([]);
    expect(back.touched).toBe(true);
    expect(back.settings).toEqual(s);
  });

  it("ignores invalid values and reports them", () => {
    const q = new URLSearchParams("r=XX&d=999&s=nap&min=3&max=2&ww=1111&lk=!!");
    const { settings, invalid } = fromQuery(q, defaultSettings("DE", 2027), { BY: "Bavaria" });
    expect(invalid.sort()).toEqual(["d", "lk", "max", "r", "s", "ww"]);
    expect(settings).toEqual(defaultSettings("DE", 2027));
  });
});

describe("deep links", () => {
  const REGIONS: Record<string, Record<string, string>> = {
    DE: { BY: "Bavaria", BE: "Berlin" },
    SE: {},
  };
  const options = { regionsOf: (code: string) => REGIONS[code], years: [2026, 2027, 2028] };

  it("maps the readable keys to the share format", () => {
    const q = normalizeQuery(
      new URLSearchParams("country=DE&region=BY&year=2027&days=25&style=long&months=7.8"),
    );
    expect(q.toString()).toBe("r=BY&d=25&s=long&m=7.8");
  });

  it("lets the share key win when a link has both", () => {
    expect(normalizeQuery(new URLSearchParams("days=25&d=30")).get("d")).toBe("30");
    expect(normalizeQuery(new URLSearchParams("d=30&days=25")).get("d")).toBe("30");
    const r = fromQuery(
      new URLSearchParams("days=25&d=30&style=long&s=weekends"),
      defaultSettings("DE", 2027),
      {},
    );
    expect(r.settings.budget).toBe(30);
    expect(r.settings.style).toBe("weekends");
  });

  it("reads country, region, year, days and style", () => {
    const base = defaultSettings("SE", 2026);
    const r = fromLink(
      new URLSearchParams("country=DE&region=BY&year=2027&days=25&style=long"),
      base,
      options,
    );
    expect(r.invalid).toEqual([]);
    expect(r.year).toBe(2027);
    expect(r.settings).toMatchObject({ country: "DE", region: "BY", year: 2027, budget: 25, style: "long" });
  });

  it("is case-insensitive for codes and styles", () => {
    const r = fromLink(
      new URLSearchParams("country=de&region=by&style=Long"),
      defaultSettings("DE", 2027),
      options,
    );
    expect(r.settings).toMatchObject({ country: "DE", region: "BY", style: "long" });
    expect(r.invalid).toEqual([]);
  });

  it("plans the same from a deep link as from the share link it stands for", () => {
    const base = defaultSettings("DE", 2027);
    const deep = fromLink(
      new URLSearchParams("country=DE&year=2027&region=BY&days=14&style=weekends"),
      base,
      options,
    );
    const share = fromQuery(new URLSearchParams("r=BY&d=14&s=weekends"), base, REGIONS.DE ?? {});
    expect(deep.settings).toEqual(share.settings);
    expect(shareUrl(deep.settings)).toBe("https://leavemaxxing.com/de/2027/?d=14&r=BY&s=weekends");
  });

  it("starts another country from its defaults and keeps the leave days", () => {
    const base = { ...defaultSettings("SE", 2027), budget: 25, region: null, locked: [1] };
    const r = fromLink(new URLSearchParams("country=DE"), base, options);
    expect(r.settings).toEqual({ ...defaultSettings("DE", 2027), budget: 25 });
  });

  it("drops picked days when the year changes, and reads new ones against the new year", () => {
    const base = { ...defaultSettings("DE", 2027), locked: [fromIso("2027-07-14")] };
    expect(fromLink(new URLSearchParams("year=2028"), base, options).settings.locked).toEqual([]);
    const r = fromLink(new URLSearchParams("year=2028&lk=0"), base, options);
    expect(r.settings.locked).toEqual([fromIso("2028-01-01")]);
  });

  it("reports what it can't use and keeps the rest", () => {
    const base = defaultSettings("DE", 2027);
    const r = fromLink(
      new URLSearchParams("country=XX&year=1999&region=ZZ&days=500&style=fast"),
      base,
      options,
    );
    expect(r.invalid.sort()).toEqual(["country", "d", "r", "s", "year"]);
    expect(r.settings).toEqual(base);
    expect(r.year).toBeNull();
    expect(r.touched).toBe(true);
  });

  it("leaves a plain page alone", () => {
    const base = defaultSettings("DE", 2027);
    const r = fromLink(new URLSearchParams(""), base, options);
    expect(r).toEqual({ settings: base, invalid: [], touched: false, year: null });
  });
});
