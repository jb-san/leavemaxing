import { describe, expect, it } from "vitest";
import { holidayName } from "../../src/lib/holidays";
import { extractCountryYear, listCountries, listRegions } from "./extract";

/** Friday 19–25 June, Saturday 20–26 June, Saturday 31 Oct–6 Nov. */
const MIDSUMMER = {
  2026: { eve: "2026-06-19", day: "2026-06-20", saints: "2026-10-31" },
  2027: { eve: "2027-06-25", day: "2027-06-26", saints: "2027-11-06" },
  2028: { eve: "2028-06-23", day: "2028-06-24", saints: "2028-11-04" },
  2029: { eve: "2029-06-22", day: "2029-06-23", saints: "2029-11-03" },
  2030: { eve: "2030-06-21", day: "2030-06-22", saints: "2030-11-02" },
} as const;

describe("floating weekday holidays", () => {
  it("puts Swedish Midsummer Eve on the Friday between 19 and 25 June", () => {
    for (const year of [2026, 2027, 2028, 2029, 2030] as const) {
      const file = extractCountryYear("SE", year, []);
      const eve = file.holidays.find((holiday) => holiday.name === "Midsummer Eve");
      const day = file.holidays.find((holiday) => holiday.name === "Midsummer Day");
      const saints = file.holidays.find((holiday) => holiday.name === "All Saints' Day");
      expect(eve?.date, String(year)).toBe(MIDSUMMER[year].eve);
      expect(eve?.local).toBe("Midsommarafton");
      expect(day?.date, String(year)).toBe(MIDSUMMER[year].day);
      expect(saints?.date, String(year)).toBe(MIDSUMMER[year].saints);
      expect(new Date(`${eve?.date}T00:00:00Z`).getUTCDay()).toBe(5);
      expect(new Date(`${day?.date}T00:00:00Z`).getUTCDay()).toBe(6);
    }
  });

  it("keeps Finnish Juhannus and All Saints inside their legal windows", () => {
    for (const year of [2026, 2027, 2028, 2029, 2030] as const) {
      const file = extractCountryYear("FI", year, []);
      const day = file.holidays.find((holiday) => holiday.name === "Midsummer Day");
      const saints = file.holidays.find((holiday) => holiday.name === "All Saints' Day");
      expect(day?.date, String(year)).toBe(MIDSUMMER[year].day);
      expect(day?.names?.fi).toBe("juhannuspäivä");
      expect(saints?.date, String(year)).toBe(MIDSUMMER[year].saints);
      expect(saints?.names?.fi).toBe("pyhäinpäivä");
      expect(file.holidays.some((holiday) => holiday.date === "2027-06-18")).toBe(false);
    }
  });

  it("moves Iceland's First Day of Summer off 18 April when that Thursday is outside the window", () => {
    const wrong = extractCountryYear("IS", 2030, []);
    expect(wrong.holidays.find((holiday) => holiday.name === "First Day of Summer")?.date).toBe("2030-04-25");
    expect(wrong.holidays.find((holiday) => holiday.name === "Maundy Thursday")?.date).toBe("2030-04-18");
    expect(
      extractCountryYear("IS", 2024, []).holidays.find((holiday) => holiday.name === "First Day of Summer")
        ?.date,
    ).toBe("2024-04-25");
    expect(
      extractCountryYear("IS", 2026, []).holidays.find((holiday) => holiday.name === "First Day of Summer")
        ?.date,
    ).toBe("2026-04-23");
  });
});

describe("native holiday names", () => {
  it("stores German, Swedish, French, Spanish and Polish names", () => {
    const de = extractCountryYear("DE", 2027, Object.keys(listRegions("DE")));
    const corpus = de.holidays.find((holiday) => holiday.names?.de === "Fronleichnam");
    expect(corpus?.name).toBe("Corpus Christi");
    expect(holidayName(corpus ?? { date: "", name: "" }, "de-DE")).toBe("Fronleichnam");

    const se = extractCountryYear("SE", 2027, []);
    const midsummer = se.holidays.find((holiday) => holiday.date.startsWith("2027-06") && holiday.names?.sv);
    expect(se.holidays.some((holiday) => holiday.names?.sv === "Midsommarafton")).toBe(true);
    expect(midsummer).toBeTruthy();

    const fr = extractCountryYear("FR", 2027, []);
    expect(fr.holidays.some((holiday) => holiday.names?.fr === "Assomption")).toBe(true);
    const assumption = fr.holidays.find((holiday) => holiday.names?.fr === "Assomption");
    expect(holidayName(assumption ?? { date: "", name: "" }, "fr-FR")).toBe("Assomption");

    const es = extractCountryYear("ES", 2027, Object.keys(listRegions("ES")));
    expect(es.holidays.some((holiday) => holiday.names?.es === "Asunción")).toBe(true);

    const pl = extractCountryYear("PL", 2027, []);
    expect(pl.holidays.some((holiday) => holiday.names?.pl === "Dzień Bożego Ciała")).toBe(true);
  });

  it("keeps Ukraine's statutory holidays, including ones martial law can suspend, in Ukrainian", () => {
    expect(listCountries().UA).toBeTruthy();
    const ua = extractCountryYear("UA", 2027, []);
    const names = ua.holidays.map((holiday) => holiday.names?.uk ?? "");
    expect(names).toContain("Великдень");
    expect(names).toContain("Новий Рік");
    expect(names).toContain("Міжнародний жіночий день");
    expect(names.some((name) => name.includes("замінити день"))).toBe(false);
    expect(names).toContain("Великдень (перенесений вихідний)");
    const easter = ua.holidays.find((holiday) => holiday.names?.uk === "Великдень");
    expect(holidayName(easter ?? { date: "", name: "" }, "uk-UA")).toBe("Великдень");
    expect(ua.holidays.some((holiday) => holiday.date === "2027-01-01")).toBe(true);
    expect(ua.holidays.some((holiday) => holiday.date === "2027-03-08")).toBe(true);
    expect(ua.holidays.some((holiday) => holiday.date === "2027-06-28")).toBe(true);
  });
});
