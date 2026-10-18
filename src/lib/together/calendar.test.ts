import { describe, expect, it } from "vitest";
import { dayNum } from "~/lib/dates";
import {
  bandEdges,
  bandsOf,
  blockedBy,
  groupHelps,
  memberDayKind,
  overflow,
  toggleDay,
  voteCounts,
  withVote,
  yearsOf,
} from "./calendar";

const WORK_WEEK = [true, true, true, true, true, false, false];
const sat = dayNum(2027, 1, 9);
const mon = dayNum(2027, 1, 11);
const tue = dayNum(2027, 1, 12);

describe("memberDayKind", () => {
  const me = { blocked: [] as number[], customOff: [] as number[], workWeek: WORK_WEEK };

  it("tells workdays, weekends, holidays and own days off apart", () => {
    const holidays = new Map([[mon, ["Holiday"]]]);
    expect(memberDayKind(tue, me, holidays)).toBe("work");
    expect(memberDayKind(sat, me, holidays)).toBe("weekend");
    expect(memberDayKind(mon, me, holidays)).toBe("holiday");
    expect(memberDayKind(tue, { ...me, customOff: [tue] }, holidays)).toBe("custom");
  });

  it("lets a blocked day override weekends and holidays", () => {
    const holidays = new Map([[mon, ["Holiday"]]]);
    const blocked = { ...me, blocked: [sat, mon] };
    expect(memberDayKind(sat, blocked, holidays)).toBe("blocked");
    expect(memberDayKind(mon, blocked, holidays)).toBe("blocked");
  });
});

describe("toggleDay", () => {
  it("adds a day in order and removes it again", () => {
    expect(toggleDay([3, 9], 5)).toEqual([3, 5, 9]);
    expect(toggleDay([3, 5, 9], 5)).toEqual([3, 9]);
  });
});

describe("blockedBy", () => {
  it("lists who can't do each day, in member order", () => {
    const map = blockedBy([
      ["a", { blocked: [1, 2] }],
      ["b", { blocked: [2] }],
    ]);
    expect(map.get(1)).toEqual(["a"]);
    expect(map.get(2)).toEqual(["a", "b"]);
    expect(map.has(3)).toBe(false);
  });
});

describe("overflow", () => {
  it("keeps up to the limit and counts the rest", () => {
    expect(overflow([1, 2, 3], 4)).toEqual({ shown: [1, 2, 3], more: 0 });
    expect(overflow([1, 2, 3, 4], 4)).toEqual({ shown: [1, 2, 3, 4], more: 0 });
    expect(overflow([1, 2, 3, 4, 5, 6], 4)).toEqual({ shown: [1, 2, 3, 4], more: 2 });
  });
});

describe("bandsOf and bandEdges", () => {
  it("merges overlapping windows into one band", () => {
    const bands = bandsOf(
      [
        { start: 10, end: 14 },
        { start: 13, end: 16 },
      ],
      [],
    );
    expect([...bands.keys()]).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect(bandEdges(bands, 10)).toEqual({ start: true, end: false });
    expect(bandEdges(bands, 14)).toEqual({ start: false, end: false });
    expect(bandEdges(bands, 16)).toEqual({ start: false, end: true });
  });

  it("marks agreed days over ranked ones, as their own run", () => {
    const bands = bandsOf([{ start: 10, end: 14 }], [{ start: 13, end: 15 }]);
    expect(bands.get(12)).toBe("ranked");
    expect(bands.get(13)).toBe("agreed");
    expect(bands.get(15)).toBe("agreed");
    expect(bandEdges(bands, 12)).toEqual({ start: false, end: true });
    expect(bandEdges(bands, 13)).toEqual({ start: true, end: false });
  });
});

describe("groupHelps", () => {
  it("puts members who share a holiday on one entry", () => {
    expect(
      groupHelps([
        { memberId: "a", day: 5, name: "May Day" },
        { memberId: "b", day: 5, name: "May Day" },
        { memberId: "b", day: 6, name: "Other" },
      ]),
    ).toEqual([
      { day: 5, name: "May Day", memberIds: ["a", "b"] },
      { day: 6, name: "Other", memberIds: ["b"] },
    ]);
  });
});

describe("votes", () => {
  const key = "2027-01-09..2027-01-17" as const;

  it("counts each kind of vote on one window", () => {
    const other = "2027-02-01..2027-02-05" as const;
    expect(
      voteCounts(
        [
          { votes: { [key]: "yes" } },
          { votes: { [key]: "yes", [other]: "no" } },
          { votes: { [key]: "maybe" } },
        ],
        key,
      ),
    ).toEqual({ yes: 2, maybe: 1, no: 0 });
  });

  it("sets a vote, changes it, and removes it", () => {
    const set = withVote({}, key, "yes");
    expect(set).toEqual({ [key]: "yes" });
    expect(withVote(set, key, "no")).toEqual({ [key]: "no" });
    const cleared = withVote(set, key, null);
    expect(cleared).toEqual({});
    expect(key in cleared).toBe(false);
    expect(set).toEqual({ [key]: "yes" });
  });
});

describe("yearsOf", () => {
  it("lists each year once, in order", () => {
    expect(
      yearsOf([
        { year: 2028, month: 1 },
        { year: 2027, month: 12 },
        { year: 2027, month: 11 },
      ]),
    ).toEqual([2027, 2028]);
  });
});
