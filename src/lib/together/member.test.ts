import { describe, expect, it } from "vitest";
import { dayNum } from "../dates";
import { changes, forJoining, limitToMonths, textOn } from "./member";
import { MEMBER_COLORS, type MemberRecord } from "./protocol";

const member = (blocked: number[], customOff: number[]): MemberRecord => ({
  name: "Sam",
  color: "#e11d48",
  country: "PT",
  region: null,
  workWeek: [true, true, true, true, true, false, false],
  customOff,
  blocked,
  allowance: 5,
  proposals: [],
  votes: {},
});

describe("limitToMonths", () => {
  const months = [
    { year: 2027, month: 6 },
    { year: 2027, month: 7 },
  ];

  it("keeps only blocked and custom days inside the group's months", () => {
    const before = dayNum(2027, 5, 31);
    const first = dayNum(2027, 6, 1);
    const mid = dayNum(2027, 6, 20);
    const last = dayNum(2027, 7, 31);
    const after = dayNum(2027, 8, 1);
    const out = limitToMonths(member([before, first, mid, after], [before, last, after]), months);
    expect(out.blocked).toEqual([first, mid]);
    expect(out.customOff).toEqual([last]);
  });

  it("leaves the rest of the record alone", () => {
    const m = member([], []);
    expect(limitToMonths(m, months)).toEqual(m);
  });
});

describe("forJoining", () => {
  it("trims the name and drops days outside the group's months", () => {
    const months = [{ year: 2027, month: 6 }];
    const inside = dayNum(2027, 6, 10);
    const outside = dayNum(2027, 9, 10);
    const m = forJoining({ ...member([inside, outside], [outside]), name: "  Alex " }, months);
    expect(m.name).toBe("Alex");
    expect(m.blocked).toEqual([inside]);
    expect(m.customOff).toEqual([]);
  });
});

describe("textOn", () => {
  const contrast = (a: string, b: string) => {
    const l = (h: string) => {
      const c = [1, 3, 5].map((i) => {
        const v = Number.parseInt(h.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    return (Math.max(l(a), l(b)) + 0.05) / (Math.min(l(a), l(b)) + 0.05);
  };
  it("passes 4.5:1 on every member colour", () => {
    for (const c of MEMBER_COLORS) expect(contrast(c, textOn(c))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("changes", () => {
  it("keeps only the fields that changed", () => {
    const before = member([1], []);
    expect(changes(before, before)).toEqual({});
    expect(changes(before, { ...before, name: "Sammy", allowance: 6 })).toEqual({
      name: "Sammy",
      allowance: 6,
    });
  });

  it("compares arrays by what they hold", () => {
    const before = member([1], []);
    expect(changes(before, { ...before, blocked: [1], workWeek: [...before.workWeek] })).toEqual({});
    expect(changes(before, { ...before, blocked: [1, 2] })).toEqual({ blocked: [1, 2] });
  });
});
