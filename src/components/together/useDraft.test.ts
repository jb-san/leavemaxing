import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Draft } from "./useDraft";

interface Rec {
  name: string;
  allowance: number;
}

const blankName = (key: PropertyKey, value: unknown) =>
  key === "name" && typeof value === "string" && !value.trim();

function setup() {
  const writes: Partial<Rec>[] = [];
  const shown: Partial<Rec>[] = [];
  const draft = new Draft<Rec>(
    (p) => writes.push(p),
    blankName,
    (d) => shown.push(d),
  );
  return { draft, writes, shown };
}

describe("Draft", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends typing 400 ms after the last keystroke", () => {
    const { draft, writes, shown } = setup();
    draft.change({ name: "S" }, true);
    vi.advanceTimersByTime(300);
    draft.change({ name: "Sa" }, true);
    vi.advanceTimersByTime(399);
    expect(writes).toEqual([]);
    expect(shown.at(-1)).toEqual({ name: "Sa" });
    vi.advanceTimersByTime(1);
    expect(writes).toEqual([{ name: "Sa" }]);
    expect(shown.at(-1)).toEqual({});
  });

  it("sends a discrete change at once, with the name still being typed", () => {
    const { draft, writes } = setup();
    draft.change({ name: "Sam" }, true);
    draft.change({ allowance: 6 }, false);
    expect(writes).toEqual([{ name: "Sam", allowance: 6 }]);
    vi.advanceTimersByTime(1000);
    expect(writes).toHaveLength(1);
  });

  it("sends what's pending when flushed, as on unmount", () => {
    const { draft, writes } = setup();
    draft.change({ name: "Samantha" }, true);
    draft.flush();
    expect(writes).toEqual([{ name: "Samantha" }]);
    vi.advanceTimersByTime(1000);
    expect(writes).toHaveLength(1);
  });

  it("holds a blank name back, but still sends the rest", () => {
    const { draft, writes, shown } = setup();
    draft.change({ name: "  " }, true);
    vi.advanceTimersByTime(400);
    expect(writes).toEqual([]);
    expect(shown.at(-1)).toEqual({ name: "  " });
    draft.change({ allowance: 3 }, false);
    expect(writes).toEqual([{ allowance: 3 }]);
    draft.change({ name: "Al" }, true);
    vi.advanceTimersByTime(400);
    expect(writes).toEqual([{ allowance: 3 }, { name: "Al" }]);
  });
});
