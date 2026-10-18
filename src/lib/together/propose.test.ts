import { describe, expect, it } from "vitest";
import { dayNum } from "../dates";
import {
  inPick,
  MAX_PROPOSAL,
  MIN_PROPOSAL,
  openPick,
  type Pick,
  pickDay,
  pickedKey,
  tooShort,
  withoutProposal,
  withProposal,
} from "./propose";
import { parseWindowKey, type WindowKey } from "./protocol";

const d = (day: number) => dayNum(2027, 5, day);
const k = (a: string, b: string) => `2027-05-${a}..2027-05-${b}` as WindowKey;

describe("pickDay", () => {
  it("sets the start on the first tap and the end on the second", () => {
    const first = pickDay(null, d(10));
    expect(first).toEqual({ start: d(10), end: null, clamped: false });
    expect(pickDay(first, d(14))).toEqual({ start: d(10), end: d(14), clamped: false });
  });

  it("swaps the ends when the second tap is before the first", () => {
    expect(pickDay(pickDay(null, d(14)), d(10))).toEqual({ start: d(10), end: d(14), clamped: false });
  });

  it("picks a single day when the same day is tapped twice", () => {
    expect(pickDay(pickDay(null, d(10)), d(10))).toEqual({ start: d(10), end: d(10), clamped: false });
  });

  it("starts a new range on the third tap", () => {
    const done = pickDay(pickDay(null, d(10)), d(14));
    expect(pickDay(done, d(3))).toEqual({ start: d(3), end: null, clamped: false });
  });

  it("keeps the start and cuts the end at the longest trip", () => {
    expect(MAX_PROPOSAL).toBe(21);
    const exact = pickDay(pickDay(null, d(1)), d(21));
    expect(exact).toEqual({ start: d(1), end: d(21), clamped: false });
    const long = pickDay(pickDay(null, d(1)), d(31));
    expect(long).toEqual({ start: d(1), end: d(21), clamped: true });
    // Picked backwards, the earlier day is still the start.
    expect(pickDay(pickDay(null, d(31)), d(2))).toEqual({ start: d(2), end: d(22), clamped: true });
  });

  it("gives a key the protocol accepts, only once the range is complete", () => {
    const half: Pick = pickDay(null, d(10));
    expect(pickedKey(half)).toBeNull();
    expect(pickedKey(null)).toBeNull();
    const key = pickedKey(pickDay(pickDay(null, d(1)), d(31)));
    expect(key).toBe(k("01", "21"));
    expect(parseWindowKey(key as string)).toEqual({ start: d(1), end: d(21) });
  });

  it("gives no key for a range shorter than the shortest trip", () => {
    expect(MIN_PROPOSAL).toBe(3);
    const two = pickDay(pickDay(null, d(10)), d(11));
    expect(tooShort(two)).toBe(true);
    expect(pickedKey(two)).toBeNull();
    expect(tooShort(pickDay(pickDay(null, d(10)), d(10)))).toBe(true);
    const three = pickDay(pickDay(null, d(10)), d(12));
    expect(tooShort(three)).toBe(false);
    expect(parseWindowKey(pickedKey(three) as string)).toEqual({ start: d(10), end: d(12) });
    // Nothing is too short until the range is complete.
    expect(tooShort(pickDay(null, d(10)))).toBe(false);
    expect(tooShort(null)).toBe(false);
  });
});

describe("openPick", () => {
  it("opens with nothing picked, or with a start so the next tap picks the end", () => {
    expect(openPick()).toBeNull();
    const from = openPick(d(10));
    expect(from).toEqual({ start: d(10), end: null, clamped: false });
    expect(pickDay(from, d(14))).toEqual({ start: d(10), end: d(14), clamped: false });
    expect(pickDay(from, d(6))).toEqual({ start: d(6), end: d(10), clamped: false });
  });
});

describe("inPick", () => {
  it("covers the start alone, then the whole range", () => {
    const half = pickDay(null, d(10));
    expect([9, 10, 11].map((x) => inPick(half, d(x)))).toEqual([false, true, false]);
    const done = pickDay(half, d(12));
    expect([9, 10, 11, 12, 13].map((x) => inPick(done, d(x)))).toEqual([false, true, true, true, false]);
    expect(inPick(null, d(10))).toBe(false);
  });
});

describe("proposals", () => {
  it("adds a key once", () => {
    const one = withProposal([], k("10", "14"));
    expect(one).toEqual([k("10", "14")]);
    expect(withProposal(one, k("10", "14"))).toBe(one);
  });

  it("removes only that key", () => {
    expect(withoutProposal([k("10", "14"), k("17", "21")], k("10", "14"))).toEqual([k("17", "21")]);
    expect(withoutProposal([k("17", "21")], k("10", "14"))).toEqual([k("17", "21")]);
  });
});
