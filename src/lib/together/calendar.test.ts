import { describe, expect, it } from "vitest";
import { dayNum } from "~/lib/dates";
import {
  arrowVote,
  bandEdges,
  bandsOf,
  blockedBy,
  clickedVote,
  groupHelps,
  memberDayKind,
  overflow,
  proposedDays,
  runEdges,
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

describe("vote control", () => {
  it("picks the tapped vote, and clears it when it was already yours", () => {
    expect(clickedVote(undefined, "yes")).toBe("yes");
    expect(clickedVote("maybe", "yes")).toBe("yes");
    expect(clickedVote("yes", "yes")).toBe(null);
  });

  it("moves with the arrow keys and wraps at the ends", () => {
    expect(arrowVote(0, "ArrowRight")).toBe("maybe");
    expect(arrowVote(1, "ArrowDown")).toBe("no");
    expect(arrowVote(2, "ArrowRight")).toBe("yes");
    expect(arrowVote(0, "ArrowLeft")).toBe("no");
    expect(arrowVote(2, "ArrowUp")).toBe("maybe");
    expect(arrowVote(0, "Enter")).toBe(null);
  });
});

describe("proposedDays and runEdges", () => {
  const d = (day: number) => dayNum(2027, 5, day);
  const w = (a: number, b: number, proposedBy: string[]) => ({
    key: `2027-05-${String(a).padStart(2, "0")}..2027-05-${String(b).padStart(2, "0")}` as const,
    start: d(a),
    end: d(b),
    proposedBy,
  });

  it("maps each day inside a proposal to who proposed it", () => {
    const days = proposedDays([w(10, 12, ["b"])], []);
    expect([...days.keys()]).toEqual([d(10), d(11), d(12)]);
    expect(days.get(d(11))).toEqual(["b"]);
  });

  it("joins the proposers of overlapping proposals, once each, in order", () => {
    const days = proposedDays([w(10, 12, ["b"]), w(12, 14, ["a", "b"])], []);
    expect(days.get(d(10))).toEqual(["b"]);
    expect(days.get(d(12))).toEqual(["b", "a"]);
    expect(days.get(d(14))).toEqual(["a", "b"]);
  });

  it("leaves out a proposal everyone agreed on, which is drawn as agreed", () => {
    const agreed = w(10, 12, ["b"]);
    const days = proposedDays([agreed, w(12, 13, ["a"])], [agreed]);
    expect([...days.keys()]).toEqual([d(12), d(13)]);
    expect(days.get(d(12))).toEqual(["a"]);
  });

  it("finds where a run of proposed days starts and ends", () => {
    const days = proposedDays([w(10, 12, ["b"]), w(13, 14, ["a"])], []);
    expect(runEdges(days, d(10))).toEqual({ start: true, end: false });
    expect(runEdges(days, d(12))).toEqual({ start: false, end: false });
    expect(runEdges(days, d(14))).toEqual({ start: false, end: true });
    expect(runEdges(days, d(11))).toEqual({ start: false, end: false });
  });
});
