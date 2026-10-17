import { describe, expect, it } from "vitest";
import { holidayName } from "../../src/lib/holidays";
import { extractCountryYear, listRegions } from "./extract";

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
});
