import { describe, expect, it } from "vitest";
import { dayNum, fromIso } from "./dates";
import { decodeDays, defaultSettings, encodeDays, fromQuery, shareUrl, toQuery } from "./settings";

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
