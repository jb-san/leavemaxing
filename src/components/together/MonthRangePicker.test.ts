import { describe, expect, it } from "vitest";
import { upcomingMonths } from "./MonthRangePicker";

describe("upcomingMonths", () => {
  it("starts this month and never offers a past year", () => {
    const months = upcomingMonths(new Date(2026, 10, 9));
    expect(months[0]).toEqual({ year: 2026, month: 11 });
    expect(months.some((month) => month.year < 2026)).toBe(false);
    expect(new Set(months.map((month) => month.year))).toEqual(new Set([2026, 2027, 2028]));
  });

  it("rolls forward in January, with no month from the year that just ended", () => {
    const months = upcomingMonths(new Date(2027, 0, 1));
    expect(months[0]).toEqual({ year: 2027, month: 1 });
    expect(months.some((month) => month.year < 2027)).toBe(false);
  });
});
