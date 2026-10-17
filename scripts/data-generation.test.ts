import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CountryInfo } from "../src/lib/holidays";

const root = new URL("..", import.meta.url).pathname;
const publicData = join(root, "public/data");
const generated = join(root, "src/data/generated");

function readHolidayFile(country: string, year: number) {
  return JSON.parse(readFileSync(join(publicData, country.toLowerCase(), `${year}.json`), "utf8"));
}

function readCountries(): CountryInfo[] {
  return JSON.parse(readFileSync(join(generated, "countries.json"), "utf8"));
}

describe("Holiday data generation", () => {
  describe("Sweden", () => {
    it("includes Midsummer Eve as a de facto holiday", () => {
      const file = readHolidayFile("SE", 2027);
      const midsummerEve = file.holidays.find((h: { name: string }) => h.name === "Midsummer Eve");
      expect(midsummerEve).toBeDefined();
      expect(midsummerEve?.local).toBe("Midsommarafton");
    });

    it("includes Christmas Eve as a de facto holiday", () => {
      const file = readHolidayFile("SE", 2027);
      const christmasEve = file.holidays.find((h: { name: string }) => h.name === "Christmas Eve");
      expect(christmasEve).toBeDefined();
      expect(christmasEve?.local).toBe("Julafton");
      expect(christmasEve?.date).toBe("2027-12-24");
    });

    it("includes New Year's Eve as a de facto holiday", () => {
      const file = readHolidayFile("SE", 2027);
      const newYearsEve = file.holidays.find((h: { name: string }) => h.name === "New Year's Eve");
      expect(newYearsEve).toBeDefined();
      expect(newYearsEve?.local).toBe("Nyårsafton");
      expect(newYearsEve?.date).toBe("2027-12-31");
    });

    it("has a reasonable number of holidays", () => {
      const file = readHolidayFile("SE", 2027);
      expect(file.holidays.length).toBeGreaterThan(10);
      expect(file.holidays.length).toBeLessThan(20);
    });
  });

  describe("Montenegro", () => {
    it("has a reasonable number of holidays (excludes multi-religion observances)", () => {
      const file = readHolidayFile("ME", 2027);
      expect(file.holidays.length).toBeGreaterThan(10);
      expect(file.holidays.length).toBeLessThan(25);
    });

    it("does not include Islamic holidays", () => {
      const file = readHolidayFile("ME", 2027);
      const islamicHolidays = file.holidays.filter(
        (h: { name: string }) => h.name.includes("Ramadan") || h.name.includes("Eid"),
      );
      expect(islamicHolidays).toHaveLength(0);
    });

    it("does not include Jewish holidays", () => {
      const file = readHolidayFile("ME", 2027);
      const jewishHolidays = file.holidays.filter(
        (h: { name: string }) => h.name.includes("Pesach") || h.name.includes("Yom Kippur"),
      );
      expect(jewishHolidays).toHaveLength(0);
    });
  });

  describe("Eswatini", () => {
    it("is named Eswatini, not Swaziland", () => {
      const countries = readCountries();
      const eswatini = countries.find((c) => c.code === "SZ");
      expect(eswatini).toBeDefined();
      expect(eswatini?.name).toBe("Eswatini");
      expect(eswatini?.name).not.toBe("Swaziland");
    });
  });

  describe("Data integrity", () => {
    it("all countries have valid holiday files for 2027", () => {
      const countries = readCountries();
      expect(countries.length).toBeGreaterThan(200);

      for (const country of countries) {
        const file = readHolidayFile(country.code, 2027);
        expect(file.country).toBe(country.code);
        expect(file.year).toBe(2027);
        expect(Array.isArray(file.holidays)).toBe(true);
        expect(file.holidays.length).toBeGreaterThan(0);
      }
    });

    it("holidays are sorted by date", () => {
      const file = readHolidayFile("US", 2027);
      const dates = file.holidays.map((h: { date: string }) => h.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);
    });

    it("no duplicate dates in a single country file", () => {
      const testCountries = ["US", "GB", "DE", "FR", "SE"];

      for (const cc of testCountries) {
        const file = readHolidayFile(cc, 2027);
        const dates = file.holidays.map((h: { date: string }) => h.date);
        const uniqueDates = new Set(dates);
        expect(dates.length).toBe(uniqueDates.size);
      }
    });
  });
});
