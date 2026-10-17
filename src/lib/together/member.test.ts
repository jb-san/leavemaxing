import { describe, expect, it } from "vitest";
import { dayNum } from "../dates";
import { limitToMonths } from "./member";
import type { MemberRecord } from "./protocol";

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
