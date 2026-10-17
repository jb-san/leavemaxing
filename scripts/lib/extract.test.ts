import { describe, expect, it } from "vitest";
import { holidayName } from "../../src/lib/holidays";
import { extractCountryYear, listCountries, listRegions } from "./extract";

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
