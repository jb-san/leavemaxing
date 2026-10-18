import { describe, expect, it } from "vitest";
import type { Scored, ScoredWindow } from "./score";
import { sections } from "./sections";

const win = (start: number): ScoredWindow => ({
  key: `w${start}` as ScoredWindow["key"],
  start,
  end: start + 3,
  length: 4,
  score: 1,
  costs: {},
  flagged: [],
  helps: [],
  proposedBy: [],
});
const scored = (s: Partial<Scored>): Scored => ({ ranked: [], proposals: [], agreed: [], ...s });

describe("sections", () => {
  it("shows the empty copy when no window works", () => {
    expect(sections(scored({}))).toEqual({ agreed: [], proposals: [], suggested: [], empty: true });
  });

  it("hides the suggested list, without the empty copy, when every ranked window is agreed", () => {
    const a = win(10);
    const b = win(20);
    const out = sections(scored({ ranked: [a, b], agreed: [b, a] }));
    expect(out.empty).toBe(false);
    expect(out.suggested).toEqual([]);
    expect(out.agreed).toEqual([b, a]);
  });

  it("leaves agreed windows out of the suggested list", () => {
    const [a, b, c] = [win(10), win(20), win(30)];
    const p = win(40);
    const out = sections(scored({ ranked: [a, b, c], agreed: [b], proposals: [p] }));
    expect(out).toEqual({ agreed: [b], proposals: [p], suggested: [a, c], empty: false });
  });
});
