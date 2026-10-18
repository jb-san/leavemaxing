import { describe, expect, it } from "vitest";
import { dayNum, toIso } from "../dates";
import type { HolidayDay } from "../planner/types";
import { STANDARD_WEEK } from "../weekends";
import type { GroupRecord, MemberRecord, WindowKey } from "./protocol";
import { parseWindowKey, sanitizeMember } from "./protocol";
import { costFor, groupRange, type ScoreMember, scoreWindows, TOP_N, windowKey, workingDays } from "./score";

const d = (m: number, day: number) => dayNum(2027, m, day);
const key = (a: number, b: number) => windowKey(d(5, a), d(5, b));
const friHoliday: HolidayDay = { day: d(5, 14), name: "Test holiday" };

function record(over: Partial<MemberRecord> = {}): MemberRecord {
  return {
    name: "A",
    color: "#e11d48",
    country: "DE",
    region: null,
    workWeek: [...STANDARD_WEEK],
    customOff: [],
    blocked: [],
    allowance: 20,
    proposals: [],
    votes: {},
    ...over,
  };
}

function member(id: string, over: Partial<MemberRecord> = {}, holidays: HolidayDay[] = []): ScoreMember {
  return { id, record: record({ name: id, ...over }), holidays };
}

function group(over: Partial<GroupRecord> = {}): GroupRecord {
  return {
    name: "Trip",
    months: [{ year: 2027, month: 5 }],
    minLength: 3,
    maxLength: 21,
    createdBy: "a",
    ...over,
  };
}

const today = d(4, 30);
const today0 = dayNum(2026, 12, 31);
const twelve = Array.from({ length: 12 }, (_, i) => ({ year: 2027, month: i + 1 }));

function allBut(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= 31; i++) if (i < from || i > to) out.push(d(5, i));
  return out;
}

describe("groupRange", () => {
  it("spans the first day of the first month to the last day of the last month", () => {
    const g = group({
      months: [
        { year: 2027, month: 6 },
        { year: 2027, month: 5 },
      ],
    });
    expect(groupRange(g)).toEqual({ start: d(5, 1), end: d(6, 30) });
  });
});

describe("costFor", () => {
  it("charges only working days that are not holidays", () => {
    const de = member("de", {}, [friHoliday]);
    const es = member("es");
    expect(costFor(de, d(5, 10), d(5, 16))).toBe(4);
    expect(costFor(es, d(5, 10), d(5, 16))).toBe(5);
  });

  it("charges a blocked day even on a weekend or holiday", () => {
    const m = member("a", { blocked: [d(5, 15), d(5, 14)] }, [friHoliday]);
    expect(costFor(m, d(5, 15), d(5, 16))).toBe(1);
    expect(costFor(m, d(5, 14), d(5, 14))).toBe(1);
  });
});

describe("workingDays", () => {
  it("lists the days a plan locks as leave, ignoring blocked days", () => {
    const m = member("a", {}, [friHoliday]);
    expect(workingDays(m, d(5, 10), d(5, 16))).toEqual([d(5, 10), d(5, 11), d(5, 12), d(5, 13)]);
  });

  it("can be fewer than costFor when a blocked weekend or holiday is in the range", () => {
    // Blocked: Wednesday, the Friday holiday and Saturday.
    const m = member("a", { blocked: [d(5, 12), d(5, 14), d(5, 15)] }, [friHoliday]);
    // A blocked workday is still a working day, and a blocked day off is still off for the plan.
    expect(workingDays(m, d(5, 10), d(5, 16))).toEqual([d(5, 10), d(5, 11), d(5, 12), d(5, 13)]);
    // costFor charges every blocked day, so the proposal sheet's cost is higher.
    expect(costFor(m, d(5, 10), d(5, 16))).toBe(6);
  });
});

describe("scoreWindows", () => {
  it("rejects windows touching a blocked day", () => {
    const blocked = d(5, 12);
    const { ranked } = scoreWindows(group(), [member("a", { blocked: [blocked] }), member("b")], today);
    expect(ranked.length).toBeGreaterThan(0);
    for (const w of ranked) expect(blocked < w.start || blocked > w.end).toBe(true);
  });

  it("returns an empty list when the allowance is too small", () => {
    const { ranked } = scoreWindows(
      group({ minLength: 9 }),
      [member("a", { allowance: 2 }), member("b", { allowance: 2 })],
      today,
    );
    expect(ranked).toEqual([]);
  });

  it("prefers an even split of leave", () => {
    const a = member("a", { customOff: [3, 4, 5, 6, 7, 17, 18, 19].map((n) => d(5, n)) });
    const b = member("b", { customOff: [d(5, 3), d(5, 17), d(5, 18), d(5, 19)] });
    const uneven = key(3, 11);
    const even = key(17, 25);
    const { proposals } = scoreWindows(
      group(),
      [{ ...a, record: { ...a.record, proposals: [uneven, even] } }, b],
      today,
    );
    const costs = (k: WindowKey) => proposals.find((w) => w.key === k)?.costs;
    expect(costs(uneven)).toEqual({ a: 2, b: 6 });
    expect(costs(even)).toEqual({ a: 4, b: 4 });
    expect(proposals[0]?.key).toBe(even);
  });

  it("extends a window back over a shared weekend", () => {
    const members = [member("a", { blocked: allBut(8, 12) }), member("b")];
    const { ranked } = scoreWindows(group({ maxLength: 5 }), members, today);
    expect(ranked.length).toBeGreaterThan(0);
    for (const w of ranked) expect(w.start).toBe(d(5, 8));
  });

  it("keeps the better of two windows that mostly overlap", () => {
    const members = [member("a", { blocked: allBut(8, 19) }), member("b", { blocked: allBut(8, 19) })];
    const { ranked } = scoreWindows(group({ minLength: 9, maxLength: 9 }), members, today);
    expect(ranked.map((w) => w.key)).toEqual([key(8, 16)]);
  });

  it("returns at most TOP_N windows that do not heavily overlap", () => {
    const { ranked } = scoreWindows(
      group({ months: [{ year: 2027, month: 5 }] }),
      [member("a"), member("b")],
      today,
    );
    expect(ranked.length).toBeLessThanOrEqual(TOP_N);
    for (const [i, x] of ranked.entries()) {
      for (const y of ranked.slice(0, i)) {
        const overlap = Math.min(x.end, y.end) - Math.max(x.start, y.start) + 1;
        expect(overlap).toBeLessThanOrEqual(Math.min(x.length, y.length) / 2);
      }
    }
  });

  it("scores proposals over a blocked day and flags the member", () => {
    const k = key(10, 14);
    const a = member("a", { blocked: [d(5, 12)], proposals: [k] });
    const { proposals, ranked } = scoreWindows(group(), [a, member("b")], today);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.flagged).toEqual(["a"]);
    expect(proposals[0]?.proposedBy).toEqual(["a"]);
    expect(ranked.some((w) => w.key === k)).toBe(false);
  });

  it("removes proposed keys from the ranking", () => {
    const base = scoreWindows(group(), [member("a"), member("b")], today).ranked[0];
    expect(base).toBeDefined();
    const a = member("a", { proposals: [base?.key as WindowKey] });
    const { ranked, proposals } = scoreWindows(group(), [a, member("b")], today);
    expect(proposals.map((w) => w.key)).toEqual([base?.key]);
    expect(ranked.some((w) => w.key === base?.key)).toBe(false);
  });

  it("lists holidays on working days as helps", () => {
    const k = key(10, 16);
    const a = member("de", { proposals: [k] }, [friHoliday, { day: d(5, 15), name: "Saturday holiday" }]);
    const { proposals } = scoreWindows(group(), [a], today);
    expect(proposals[0]?.helps).toEqual([{ memberId: "de", day: d(5, 14), name: "Test holiday" }]);
  });

  it("agrees only when everyone votes yes", () => {
    const k = key(10, 16);
    const yes = scoreWindows(
      group(),
      [member("a", { votes: { [k]: "yes" } }), member("b", { votes: { [k]: "yes" } })],
      today,
    );
    expect(yes.agreed.map((w) => w.key)).toEqual([k]);
    const maybe = scoreWindows(
      group(),
      [member("a", { votes: { [k]: "yes" } }), member("b", { votes: { [k]: "maybe" } })],
      today,
    );
    expect(maybe.agreed).toEqual([]);
  });

  it("scores with weekends only when holiday data is missing", () => {
    const { ranked } = scoreWindows(group(), [member("a", {}, [])], today);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.score).toBeGreaterThan(0);
  });

  it("uses the valid votes of a member whose record had garbage", () => {
    const good = key(10, 16);
    const raw = {
      ...record(),
      proposals: ["nonsense", "2027-05-20..2027-05-10"],
      votes: { [good]: "yes", "2027-05-20..2027-05-10": "yes", [key(17, 23)]: "sure" },
    };
    const clean = sanitizeMember(raw);
    expect(clean).not.toBeNull();
    const { agreed, proposals } = scoreWindows(
      group(),
      [{ id: "a", record: clean as MemberRecord, holidays: [] }],
      today,
    );
    expect(agreed.map((w) => w.key)).toEqual([good]);
    expect(proposals).toEqual([]);
  });

  it("never starts a window on or before today", () => {
    const t = d(5, 12);
    const { ranked } = scoreWindows(group(), [member("a"), member("b")], t);
    expect(ranked.length).toBeGreaterThan(0);
    for (const w of ranked) {
      expect(w.start).toBeGreaterThan(t);
      expect(parseWindowKey(w.key)?.start).toBe(w.start);
      expect(w.key).toBe(`${toIso(w.start)}..${toIso(w.end)}`);
    }
  });

  it("does not list a blocked holiday as a help", () => {
    const k = key(10, 16);
    const a = member("de", { proposals: [k], blocked: [d(5, 14)] }, [friHoliday]);
    expect(scoreWindows(group(), [a], today).proposals[0]?.helps).toEqual([]);
  });

  it("keeps ranked full and clear of a proposal that equals the best window", () => {
    const members = [member("a"), member("b")];
    const best = scoreWindows(group({ months: twelve }), members, today0).ranked[0];
    const k = best?.key as WindowKey;
    const withProposal = [member("a", { proposals: [k] }), member("b")];
    const { ranked, proposals } = scoreWindows(group({ months: twelve }), withProposal, today0);
    expect(ranked).toHaveLength(TOP_N);
    const p = proposals[0];
    for (const w of ranked) {
      const overlap = Math.min(w.end, p?.end ?? 0) - Math.max(w.start, p?.start ?? 0) + 1;
      expect(overlap).toBeLessThanOrEqual(Math.min(w.length, p?.length ?? 0) / 2);
    }
  });

  it("scores 20 members over 12 months within budget", () => {
    const members = Array.from({ length: 20 }, (_, i) => {
      const holidays = Array.from({ length: 14 }, (_, h) => ({
        day: dayNum(2027, (h % 12) + 1, 3 + ((h * 7 + i) % 24)),
        name: `Holiday ${h}`,
      }));
      return member(`m${i}`, { allowance: 25 + (i % 5) }, holidays);
    });
    const g = group({ months: twelve });
    const run = () => {
      const t0 = performance.now();
      const { ranked } = scoreWindows(g, members, today0);
      expect(ranked.length).toBeGreaterThan(0);
      return performance.now() - t0;
    };
    run();
    const times = Array.from({ length: 9 }, run).sort((x, y) => x - y);
    expect(times[4]).toBeLessThan(12);
  });
});
