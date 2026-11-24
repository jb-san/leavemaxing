import { describe, expect, it } from "vitest";
import { readHolidayFile, serverPlan } from "~/data/server";
import {
  bestDataEntries,
  bestDataFile,
  bestDataIndex,
  bestDataPath,
  bestDataYears,
  defaultLeaveDays,
} from "./bestData";
import { findBridgeFacts } from "./bridgeFacts";
import { BUILD_DATE } from "./buildDate";
import { defaultSettings } from "./settings";

describe("best-breaks JSON", () => {
  it("covers the years the planner offers, for every country with data", () => {
    const now = new Date();
    const years = bestDataYears(now);
    expect(years[0]).toBe(now.getFullYear());
    expect(years.length).toBeLessThanOrEqual(3);
    expect(years).toEqual(years.map((_, i) => now.getFullYear() + i));
    const entries = bestDataEntries();
    expect(entries.some((e) => e.country === "DE" && e.year === 2027)).toBe(true);
    expect(bestDataIndex().files).toHaveLength(entries.length);
    expect(bestDataPath("DE", 2027)).toBe("/data/best/de/2027.json");
  });

  it("uses the localized page's default leave days, or 20", () => {
    expect(defaultLeaveDays("SE")).toBe(25);
    expect(defaultLeaveDays("DE")).toBe(20);
    expect(defaultLeaveDays("JP")).toBe(20);
  });

  it("matches the numbers the pages print", () => {
    const file = bestDataFile("SE", 2027);
    const { plan } = serverPlan({ ...defaultSettings("SE", 2027), budget: 25 });
    const holidays = readHolidayFile("SE", 2027);
    expect(holidays).toBeTruthy();
    if (!holidays) return;
    const facts = findBridgeFacts(holidays, "SE", null);
    expect(file).toMatchObject({ country: "SE", year: 2027, region: null, generatedAt: BUILD_DATE });
    expect(file.recommendedPlan).toMatchObject({
      leaveDays: 25,
      daysOff: plan.stats.daysOff,
      leaveUsed: plan.stats.leaveUsed,
    });
    expect(file.bridgeDays).toBe(facts.days);
    const best = file.bestBreaks[0];
    expect(best?.leaveDates).toEqual(facts.best?.days);
    expect(best?.daysOff).toBe(facts.best?.length);
    expect(best?.efficiency).toBeCloseTo((facts.best?.length ?? 0) / (facts.best?.leave ?? 1), 2);
    expect(best?.holidays.length).toBeGreaterThan(0);
    for (const b of file.recommendedPlan.breaks) {
      expect(b.start <= b.end).toBe(true);
      expect(b.leaveDays).toBeGreaterThan(0);
    }
    expect(file.recommendedPlan.breaks.reduce((sum, b) => sum + b.leaveDays, 0)).toBe(
      file.recommendedPlan.leaveUsed,
    );
  });
});
