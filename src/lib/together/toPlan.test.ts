import { describe, expect, it } from "vitest";
import { type DayNum, dayNum } from "../dates";
import type { HolidayDay } from "../planner/types";
import { decodeDays, defaultSettings, type Settings, shareUrl } from "../settings";
import { STANDARD_WEEK } from "../weekends";
import type { MemberRecord } from "./protocol";
import type { ScoreMember } from "./score";
import { planSettingsFor } from "./toPlan";

// 1 May 2027 is a Saturday, so 10 May is a Monday and 14 May a Friday.
const d = (m: number, day: number, year = 2027) => dayNum(year, m, day);
const range = (a: DayNum, b: DayNum) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function me(over: Partial<MemberRecord> = {}, holidays: HolidayDay[] = []): ScoreMember {
  return {
    id: "me",
    record: {
      name: "Sam",
      color: "#e11d48",
      country: "DE",
      region: "BY",
      workWeek: [...STANDARD_WEEK],
      customOff: [],
      blocked: [],
      allowance: 10,
      proposals: [],
      votes: {},
      ...over,
    },
    holidays,
  };
}

/** Mon 10 May to Sun 16 May 2027. */
const week = { start: d(5, 10), end: d(5, 16) };

describe("planSettingsFor", () => {
  it("adds the window's working days to the last plan for the same country and year", () => {
    const last: Settings = { ...defaultSettings("DE", 2027), budget: 25, region: "BE", locked: [d(3, 3)] };
    const s = planSettingsFor(me(), week, last);
    expect(s.locked).toEqual([d(3, 3), ...range(d(5, 10), d(5, 14))]);
    // Everything else is the last plan as it was.
    expect({ ...s, locked: last.locked }).toEqual(last);
  });

  it("doesn't lock a day twice", () => {
    const last: Settings = { ...defaultSettings("DE", 2027), locked: [d(5, 12), d(1, 4)] };
    const s = planSettingsFor(me(), week, last);
    expect(s.locked).toEqual([d(1, 4), ...range(d(5, 10), d(5, 14))]);
  });

  it("starts a fresh plan for my country in the window's year when the last plan is another country", () => {
    const last: Settings = { ...defaultSettings("FR", 2027), budget: 30, locked: [d(3, 3)] };
    const workWeek = [true, true, true, true, false, false, false];
    const s = planSettingsFor(me({ workWeek, customOff: [d(5, 12)] }), week, last);
    expect(s).toEqual({
      ...defaultSettings("DE", 2027),
      region: "BY",
      workWeek,
      customOff: [d(5, 12)],
      // Friday is outside the work week, and Wednesday is a day off of my own.
      locked: [d(5, 10), d(5, 11), d(5, 13)],
    });
  });

  it("starts a fresh plan when there is no last plan, or it's for another leave year", () => {
    const fresh = planSettingsFor(me(), week, null);
    expect(fresh.country).toBe("DE");
    expect(fresh.year).toBe(2027);
    expect(fresh.locked).toEqual(range(d(5, 10), d(5, 14)));
    const older = planSettingsFor(me(), week, { ...defaultSettings("DE", 2026), locked: [d(3, 3, 2026)] });
    expect(older).toEqual(fresh);
  });

  it("doesn't lock a public holiday in the window", () => {
    const s = planSettingsFor(me({}, [{ day: d(5, 13), name: "Christi Himmelfahrt" }]), week, null);
    expect(s.locked).toEqual([d(5, 10), d(5, 11), d(5, 12), d(5, 14)]);
  });

  it("still locks a day I can't do, which is a working day like any other", () => {
    const s = planSettingsFor(me({ blocked: [d(5, 11)] }), week, null);
    expect(s.locked).toEqual(range(d(5, 10), d(5, 14)));
  });

  it("locks only the days inside the leave year that holds the start", () => {
    // Mon 27 Dec 2027 to Wed 5 Jan 2028.
    const w = { start: d(12, 27), end: d(1, 5, 2028) };
    const s = planSettingsFor(me(), w, null);
    expect(s.year).toBe(2027);
    expect(s.locked).toEqual(range(d(12, 27), d(12, 31)));

    // A leave year from April: 2027 runs to 31 March 2028.
    const april: Settings = { ...defaultSettings("DE", 2027), yearStart: 4 };
    const spring = { start: d(3, 27, 2028), end: d(4, 5, 2028) };
    const t = planSettingsFor(me(), spring, april);
    expect(t.year).toBe(2027);
    expect(t.yearStart).toBe(4);
    // Mon 27 to Fri 31 March 2028; April is the next leave year.
    expect(t.locked).toEqual(range(d(3, 27, 2028), d(3, 31, 2028)));
  });

  it("keeps my own days off to the plan's year", () => {
    const s = planSettingsFor(me({ customOff: [d(5, 12), d(2, 1, 2031)] }), week, null);
    expect(s.customOff).toEqual([d(5, 12)]);
  });

  it("writes the locked days into the planner link", () => {
    const s = planSettingsFor(me(), week, null);
    const url = new URL(shareUrl(s, "https://example.com"));
    expect(url.pathname).toBe("/de/2027/");
    expect(url.searchParams.get("r")).toBe("BY");
    expect(decodeDays(url.searchParams.get("lk") ?? "", 2027)).toEqual(range(d(5, 10), d(5, 14)));
  });
});
