import { describe, expect, it } from "vitest";
import {
  correctPlanYear,
  offeredYears,
  pinnedYear,
  preferredPlanYear,
  referencedYear,
  selectPlanYear,
} from "./years";

/** What `scripts/build-data.ts` writes for a build made in 2026: last year through five ahead. */
const BUILT_IN_2026 = [2025, 2026, 2027, 2028, 2029, 2030, 2031];

const nov2026 = new Date(2026, 10, 9);
const jan2027 = new Date(2027, 0, 1);
const oct2026 = new Date(2026, 9, 1);
const sep2026 = new Date(2026, 8, 30);

describe("offeredYears", () => {
  it("offers the current year and the next two", () => {
    expect(offeredYears(BUILT_IN_2026, nov2026)).toEqual([2026, 2027, 2028]);
  });

  it("drops a past year and reveals the next one after New Year", () => {
    expect(offeredYears(BUILT_IN_2026, jan2027)).toEqual([2027, 2028, 2029]);
    expect(offeredYears(BUILT_IN_2026, jan2027).some((year) => year < 2027)).toBe(false);
  });

  it("never offers a year the build did not generate", () => {
    expect(offeredYears([2026, 2027], nov2026)).toEqual([2026, 2027]);
    expect(offeredYears([2027], nov2026)).toEqual([2027]);
  });

  it("offers no past year from a stale build", () => {
    const builtIn2025 = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const stale = offeredYears(builtIn2025, nov2026);
    expect(stale).toEqual([2026, 2027, 2028]);
    for (const year of stale) expect(year).toBeGreaterThanOrEqual(2026);
  });
});

describe("preferred and selected year", () => {
  it("keeps the calendar year, and the compare page's next-year default", () => {
    expect(preferredPlanYear(nov2026, "calendar")).toBe(2026);
    expect(preferredPlanYear(nov2026, "next")).toBe(2027);
    expect(selectPlanYear(offeredYears(BUILT_IN_2026, nov2026), nov2026, "calendar")).toBe(2026);
    expect(selectPlanYear(offeredYears(BUILT_IN_2026, nov2026), nov2026, "next")).toBe(2027);
  });

  it("moves locale homes to next year from October, and not before", () => {
    expect(preferredPlanYear(sep2026, "late")).toBe(2026);
    expect(preferredPlanYear(oct2026, "late")).toBe(2027);
    expect(selectPlanYear(offeredYears(BUILT_IN_2026, nov2026), nov2026, "late")).toBe(2027);
  });

  it("replaces a past default with the current policy", () => {
    const offered = offeredYears(BUILT_IN_2026, jan2027);
    expect(selectPlanYear(offered, jan2027, "calendar")).toBe(2027);
    expect(selectPlanYear(offered, jan2027, "next")).toBe(2028);
    expect(selectPlanYear(offered, jan2027, "late")).toBe(2027);
  });
});

describe("past years that were already shared", () => {
  it("reads the year from country and localized URLs", () => {
    expect(pinnedYear("/se/2025/")).toBe(2025);
    expect(pinnedYear("/de-de/brueckentage-2027/bayern/")).toBe(2027);
    expect(pinnedYear("/se/")).toBeNull();
    expect(pinnedYear("/de-de/")).toBeNull();
    expect(pinnedYear("/")).toBeNull();
  });

  it("keeps a year the URL names, including a past one", () => {
    const offered = offeredYears(BUILT_IN_2026, nov2026);
    expect(correctPlanYear(2025, { offered, pinned: 2025, now: nov2026 })).toBe(2025);
    expect(correctPlanYear(2027, { offered, pinned: 2027, now: nov2026 })).toBe(2027);
  });

  it("moves an unpinned past year to one the picker offers", () => {
    const offered = offeredYears(BUILT_IN_2026, nov2026);
    expect(correctPlanYear(2025, { offered, pinned: null, now: nov2026, policy: "calendar" })).toBe(2026);
    expect(correctPlanYear(2025, { offered, pinned: null, now: nov2026, policy: "late" })).toBe(2027);
    expect(correctPlanYear(2026, { offered, pinned: null, now: nov2026, policy: "calendar" })).toBe(2026);
  });

  it("keeps a shared compare year the build generated, and falls back otherwise", () => {
    expect(referencedYear(2025, BUILT_IN_2026, 2027)).toBe(2025);
    expect(referencedYear(2030, BUILT_IN_2026, 2027)).toBe(2030);
    expect(referencedYear(2019, BUILT_IN_2026, 2027)).toBe(2027);
    expect(referencedYear(null, BUILT_IN_2026, 2027)).toBe(2027);
    expect(referencedYear(Number.NaN, BUILT_IN_2026, 2027)).toBe(2027);
  });
});
