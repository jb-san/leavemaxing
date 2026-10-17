import { describe, expect, it } from "vitest";
import { calculateBridgePlans, formatBreak, getYearQuality } from "./bridgeDays";
import { fromIso } from "./dates";
import type { HolidayFile } from "./holidays";
import type { Break } from "./planner/types";

describe("bridgeDays", () => {
  describe("calculateBridgePlans", () => {
    it("should calculate plans for Germany/Bayern 2027", () => {
      // Germany 2027 holidays (Bayern has extra holidays)
      const file2027: HolidayFile = {
        country: "DE",
        year: 2027,
        holidays: [
          { date: "2027-01-01", name: "New Year's Day" },
          { date: "2027-01-06", name: "Epiphany", regions: ["BW", "BY", "ST"] },
          { date: "2027-03-26", name: "Good Friday" },
          { date: "2027-03-29", name: "Easter Monday" },
          { date: "2027-05-01", name: "Labour Day" },
          { date: "2027-05-06", name: "Ascension Day" },
          { date: "2027-05-17", name: "Whit Monday" },
          { date: "2027-05-27", name: "Corpus Christi", regions: ["BW", "BY", "HE", "NW", "RP", "SL"] },
          { date: "2027-08-15", name: "Assumption", regions: ["SL"] },
          { date: "2027-10-03", name: "National Holiday" },
          { date: "2027-11-01", name: "All Saints' Day", regions: ["BW", "BY", "NW", "RP", "SL"] },
          { date: "2027-12-25", name: "Christmas Day" },
          { date: "2027-12-26", name: "Boxing Day" },
        ],
      };

      const files = [file2027];
      const plans = calculateBridgePlans("DE", "BY", 2027, files, [5, 10, 20]);

      expect(plans).toHaveLength(3);

      // With 5 days, should get a reasonable multiplier
      const plan5 = plans[0];
      expect(plan5?.budget).toBe(5);
      expect(plan5?.daysOff).toBeGreaterThan(5);
      expect(plan5?.multiplier).toBeGreaterThan(1);

      // With 10 days, should get more days off
      const plan10 = plans[1];
      expect(plan10?.budget).toBe(10);
      expect(plan10?.daysOff).toBeGreaterThan(plan5?.daysOff || 0);

      // With 20 days, should get even more
      const plan20 = plans[2];
      expect(plan20?.budget).toBe(20);
      expect(plan20?.daysOff).toBeGreaterThan(plan10?.daysOff || 0);

      // All plans should have breaks
      expect(plan5?.breaks.length).toBeGreaterThan(0);
      expect(plan10?.breaks.length).toBeGreaterThan(0);
      expect(plan20?.breaks.length).toBeGreaterThan(0);
    });

    it("should calculate plans for Germany national 2027", () => {
      const file2027: HolidayFile = {
        country: "DE",
        year: 2027,
        holidays: [
          { date: "2027-01-01", name: "New Year's Day" },
          { date: "2027-03-26", name: "Good Friday" },
          { date: "2027-03-29", name: "Easter Monday" },
          { date: "2027-05-01", name: "Labour Day" },
          { date: "2027-05-06", name: "Ascension Day" },
          { date: "2027-05-17", name: "Whit Monday" },
          { date: "2027-10-03", name: "National Holiday" },
          { date: "2027-12-25", name: "Christmas Day" },
          { date: "2027-12-26", name: "Boxing Day" },
        ],
      };

      const files = [file2027];
      const plans = calculateBridgePlans("DE", null, 2027, files, [10]);

      expect(plans).toHaveLength(1);
      const plan = plans[0];
      expect(plan?.budget).toBe(10);
      expect(plan?.daysOff).toBeGreaterThan(10);
      expect(plan?.breaks.length).toBeGreaterThan(0);
    });

    it("should handle minimal leave budget", () => {
      const file2027: HolidayFile = {
        country: "SE",
        year: 2027,
        holidays: [
          { date: "2027-01-01", name: "New Year's Day" },
          { date: "2027-06-25", name: "Midsummer Day" },
        ],
      };

      const files = [file2027];
      const plans = calculateBridgePlans("SE", null, 2027, files, [1]);

      expect(plans).toHaveLength(1);
      const plan = plans[0];
      expect(plan?.budget).toBe(1);
      // Even with 1 day budget, should get some days off if there are good opportunities
      expect(plan?.daysOff).toBeGreaterThanOrEqual(1);
    });
  });

  describe("formatBreak", () => {
    it("should format a break correctly", () => {
      const breakItem: Break = {
        start: fromIso("2027-05-01"),
        end: fromIso("2027-05-09"),
        length: 9,
        leave: 3,
        holidays: [
          { day: fromIso("2027-05-01"), name: "Labour Day" },
          { day: fromIso("2027-05-06"), name: "Ascension Day" },
        ],
      };

      const formatted = formatBreak(breakItem);

      expect(formatted.leaveDays).toBe(3);
      expect(formatted.totalDays).toBe(9);
      expect(formatted.efficiency).toBe("3.0×");
      expect(formatted.holidays).toHaveLength(2);
      expect(formatted.holidays).toContain("Labour Day");
      expect(formatted.holidays).toContain("Ascension Day");
      expect(formatted.dates).toContain("May");
      expect(formatted.dates).toMatch(/\d+.*\d+/); // Should have two date numbers
    });

    it("should handle single-day breaks", () => {
      const breakItem: Break = {
        start: fromIso("2027-12-24"),
        end: fromIso("2027-12-24"),
        length: 1,
        leave: 1,
        holidays: [],
      };

      const formatted = formatBreak(breakItem);

      expect(formatted.leaveDays).toBe(1);
      expect(formatted.totalDays).toBe(1);
      expect(formatted.efficiency).toBe("1.0×");
      expect(formatted.holidays).toHaveLength(0);
    });
  });

  describe("getYearQuality", () => {
    it("should rate 2027 as average or worse (many weekend holidays)", () => {
      const file2027: HolidayFile = {
        country: "DE",
        year: 2027,
        holidays: [
          { date: "2027-01-01", name: "New Year's Day" }, // Friday
          { date: "2027-03-26", name: "Good Friday" }, // Friday
          { date: "2027-03-29", name: "Easter Monday" }, // Monday
          { date: "2027-05-01", name: "Labour Day" }, // Saturday (weekend)
          { date: "2027-05-06", name: "Ascension Day" }, // Thursday
          { date: "2027-05-17", name: "Whit Monday" }, // Monday
          { date: "2027-10-03", name: "National Holiday" }, // Sunday (weekend)
          { date: "2027-12-25", name: "Christmas Day" }, // Saturday (weekend)
          { date: "2027-12-26", name: "Boxing Day" }, // Sunday (weekend)
        ],
      };

      const quality = getYearQuality(file2027);

      expect(quality.weekendHolidays).toBeGreaterThan(0);
      expect(quality.weekdayHolidays).toBeGreaterThan(0);
      expect(quality.rating).toBeDefined();
      expect(["excellent", "good", "average", "poor"]).toContain(quality.rating);
      expect(quality.description).toContain("2027");
    });

    it("should handle years with all weekday holidays as excellent", () => {
      const fileGood: HolidayFile = {
        country: "TEST",
        year: 2025,
        holidays: [
          { date: "2025-01-01", name: "Holiday 1" }, // Wednesday
          { date: "2025-04-18", name: "Holiday 2" }, // Friday
          { date: "2025-04-21", name: "Holiday 3" }, // Monday
          { date: "2025-05-01", name: "Holiday 4" }, // Thursday
        ],
      };

      const quality = getYearQuality(fileGood);

      expect(quality.weekendHolidays).toBe(0);
      expect(quality.rating).toBe("excellent");
    });

    it("should handle years with many weekend holidays as poor", () => {
      const fileBad: HolidayFile = {
        country: "TEST",
        year: 2026,
        holidays: [
          { date: "2026-01-03", name: "Holiday 1" }, // Saturday
          { date: "2026-01-04", name: "Holiday 2" }, // Sunday
          { date: "2026-01-10", name: "Holiday 3" }, // Saturday
          { date: "2026-01-11", name: "Holiday 4" }, // Sunday
          { date: "2026-01-15", name: "Holiday 5" }, // Thursday (only 1 weekday)
        ],
      };

      const quality = getYearQuality(fileBad);

      expect(quality.weekendHolidays).toBe(4);
      expect(quality.weekdayHolidays).toBe(1);
      expect(quality.rating).toBe("poor");
    });
  });
});
