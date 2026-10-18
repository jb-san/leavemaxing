import { describe, expect, it } from "vitest";
import { dayNum } from "~/lib/dates";
import {
  arrowVote,
  bandEdges,
  bandsOf,
  blockedBy,
  clickedVote,
  dayTone,
  dayTones,
  groupHelps,
  memberDayKind,
  memberVotes,
  overflow,
  proposedDays,
  runEdges,
  startClusters,
  toggleDay,
  voteCounts,
  windowsOn,
  withVote,
  yearsOf,
} from "./calendar";
import type { Vote, WindowKey } from "./protocol";

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

describe("vote tones and clusters", () => {
  const d = (day: number) => dayNum(2027, 5, day);
  const pad = (n: number) => String(n).padStart(2, "0");
  const w = (a: number, b: number) => ({
    key: `2027-05-${pad(a)}..2027-05-${pad(b)}` as WindowKey,
    start: d(a),
    end: d(b),
  });
  const votes = (...pairs: [{ key: WindowKey }, Vote][]) => ({
    votes: Object.fromEntries(pairs.map(([x, v]) => [x.key, v])) as Record<WindowKey, Vote>,
  });

  describe("dayTone", () => {
    it("is null outside every window", () => {
      expect(dayTone(d(1), [w(10, 14)], [], [], [])).toBeNull();
    });

    it("is open inside a ranked window nobody can't do, with the soft fill", () => {
      const r = w(10, 14);
      expect(dayTone(d(12), [r], [], [], [votes([r, "yes"]), votes([r, "maybe"])])).toEqual({
        tone: "open",
        ranked: true,
        proposed: false,
      });
    });

    it("is open inside an open proposal, with the outline and no fill", () => {
      const p = w(10, 14);
      expect(dayTone(d(12), [], [p], [], [])).toEqual({ tone: "open", ranked: false, proposed: true });
    });

    it("is vetoed when every window holding the day has a can't", () => {
      const r = w(10, 14);
      const p = w(12, 16);
      const all = [votes([r, "no"]), votes([p, "no"], [r, "yes"])];
      expect(dayTone(d(13), [r], [p], [], all)).toEqual({ tone: "vetoed", ranked: false, proposed: true });
      expect(dayTone(d(11), [r], [p], [], all)).toEqual({ tone: "vetoed", ranked: false, proposed: false });
    });

    it("stays open when one window holding the day is still open", () => {
      const r = w(10, 14);
      const p = w(12, 16);
      const all = [votes([r, "no"])];
      // The ranked window is vetoed, so the day keeps only the proposal's outline.
      expect(dayTone(d(13), [r], [p], [], all)).toEqual({ tone: "open", ranked: false, proposed: true });
      expect(dayTone(d(11), [r], [p], [], all)).toEqual({ tone: "vetoed", ranked: false, proposed: false });
    });

    it("lets agreed beat vetoed and open, day by day, and drops the outline", () => {
      const a = w(10, 12);
      const p = w(11, 15);
      const r = w(9, 13);
      const all = [votes([a, "yes"], [p, "no"]), votes([a, "yes"])];
      expect(dayTone(d(11), [r, a], [p], [a], all)).toEqual({
        tone: "agreed",
        ranked: false,
        proposed: false,
      });
      expect(dayTone(d(12), [r, a], [p], [a], all)).toEqual({
        tone: "agreed",
        ranked: false,
        proposed: false,
      });
      // Past the agreed window, the open ranked window wins over the vetoed proposal.
      expect(dayTone(d(13), [r, a], [p], [a], all)).toEqual({ tone: "open", ranked: true, proposed: false });
      expect(dayTone(d(14), [r, a], [p], [a], all)).toEqual({
        tone: "vetoed",
        ranked: false,
        proposed: true,
      });
    });

    it("maps every day of every window", () => {
      const r = w(10, 11);
      const p = w(20, 22);
      const tones = dayTones([r], [p], [], [votes([p, "no"])]);
      expect([...tones.keys()]).toEqual([d(10), d(11), d(20), d(21), d(22)]);
      expect(tones.get(d(21))?.tone).toBe("vetoed");
      expect(tones.get(d(10))).toEqual(dayTone(d(10), [r], [p], [], [votes([p, "no"])]));
    });
  });

  describe("windowsOn", () => {
    it("lists agreed, then ranked in order, then proposals, once each", () => {
      const a = w(10, 14);
      const r1 = w(11, 15);
      const r2 = w(9, 12);
      const p = w(12, 14);
      expect(windowsOn(d(12), [r1, a, r2], [p, a], [a]).map((x) => x.key)).toEqual([
        a.key,
        r1.key,
        r2.key,
        p.key,
      ]);
      expect(windowsOn(d(15), [r1, a, r2], [p, a], [a]).map((x) => x.key)).toEqual([r1.key]);
      expect(windowsOn(d(1), [r1], [p], [a])).toEqual([]);
    });
  });

  describe("memberVotes", () => {
    it("gives each member's vote on a window, in member order", () => {
      const r = w(10, 14);
      expect(
        memberVotes(
          [
            ["a", votes([r, "yes"])],
            ["b", votes()],
            ["c", votes([r, "no"])],
          ],
          r.key,
        ),
      ).toEqual([
        { id: "a", vote: "yes" },
        { id: "b", vote: null },
        { id: "c", vote: "no" },
      ]);
    });
  });

  describe("startClusters", () => {
    const members = (r: { key: WindowKey }): [string, { votes: Record<WindowKey, Vote> }][] => [
      ["a", votes()],
      ["b", votes([r, "no"])],
      ["c", votes([r, "yes"])],
      ["d", votes()],
      ["e", votes([r, "maybe"])],
    ];

    it("puts each window's votes on its first day, voters first, up to three and a count", () => {
      const r = w(10, 14);
      const clusters = startClusters([r], [], [], members(r));
      expect([...clusters.keys()]).toEqual([d(10)]);
      expect(clusters.get(d(10))).toEqual({
        key: r.key,
        shown: [
          { id: "b", vote: "no" },
          { id: "c", vote: "yes" },
          { id: "e", vote: "maybe" },
        ],
        more: 2,
      });
    });

    it("shows everyone when there are three or fewer", () => {
      const r = w(10, 14);
      const clusters = startClusters([r], [], [], members(r).slice(0, 3));
      expect(clusters.get(d(10))?.shown.map((v) => v.id)).toEqual(["b", "c", "a"]);
      expect(clusters.get(d(10))?.more).toBe(0);
    });

    it("gives a shared first day to the higher-ranked window", () => {
      const r1 = w(10, 14);
      const r2 = w(10, 16);
      const p = w(10, 13);
      const a = w(10, 12);
      const m = members(r1);
      expect(startClusters([r1, r2], [p], [], m).get(d(10))?.key).toBe(r1.key);
      expect(startClusters([r2, r1], [p], [], m).get(d(10))?.key).toBe(r2.key);
      expect(startClusters([], [p], [], m).get(d(10))?.key).toBe(p.key);
      expect(startClusters([r1, r2], [p], [a], m).get(d(10))?.key).toBe(a.key);
    });

    it("draws one cluster per window start", () => {
      const r = w(10, 14);
      const p = w(12, 16);
      expect([...startClusters([r], [p], [], members(r)).keys()]).toEqual([d(10), d(12)]);
    });
  });
});
