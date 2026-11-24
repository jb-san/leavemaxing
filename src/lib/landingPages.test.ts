import { describe, expect, it } from "vitest";
import { countryByCode } from "~/data";
import { locales } from "~/data/locales";
import { filesFor, readHolidayFile } from "~/data/server";
import { shouldIndexPage } from "~/data/sitemap-config";
import { calculateBridgePlans } from "./bridgeDays";
import {
  bridgeRows,
  dutchSchoolSections,
  germanStateLanding,
  germanStateSummaries,
  liberationDayFaq,
  swedishMonths,
  weekendHolidayFaq,
} from "./landingPages";
import { regionCopy } from "./regionLabels";
import { localizedSeasonal, whereFor } from "./seasonalSeo";
import { defaultSettings } from "./settings";

const YEAR = 2027;

function load(country: string) {
  const file = readHolidayFile(country, YEAR);
  if (!file) throw new Error(`No ${country} ${YEAR} data. Run pnpm data.`);
  return file;
}

const de = load("DE");
const germany = countryByCode.get("DE");
if (!germany) throw new Error("No DE country info");
const stateCodes = Object.keys(germany.regions);

describe("German state landing pages", () => {
  it("covers all 16 Bundesländer with unique, short titles that lead with the search phrase", () => {
    expect(stateCodes).toHaveLength(16);
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const code of stateCodes) {
      const name = regionCopy("DE", code, germany.regions[code] ?? code).name;
      const page = germanStateLanding({
        file: de,
        code,
        sourceName: germany.regions[code] ?? code,
        year: YEAR,
        budget: 20,
        daysOff: 50,
      });
      expect(page.title.startsWith(`Brückentage ${YEAR} ${name}`), page.title).toBe(true);
      expect(page.title.length, page.title).toBeLessThanOrEqual(60);
      expect(page.h1).toBe(page.title);
      expect(page.description.startsWith(`Brückentage ${YEAR} ${name}:`)).toBe(true);
      expect(page.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(page.faq.answer).toMatch(/\d+ gesetzliche Feiertage|keine zusätzlichen/);
      expect(`${page.title}${page.description}${page.paragraphs.join("")}`).not.toMatch(/\{[a-zA-Z]+\}/);
      titles.add(page.title);
      descriptions.add(page.description);
    }
    expect(titles.size).toBe(16);
    expect(descriptions.size).toBe(16);
  });

  it("computes bridge plans and a bridge table for every state", () => {
    for (const code of stateCodes) {
      const settings = { ...defaultSettings("DE", YEAR), region: code };
      const plans = calculateBridgePlans("DE", code, YEAR, filesFor(settings), [1, 5, 20]);
      expect(plans).toHaveLength(3);
      for (const plan of plans) {
        expect(plan.daysOff, code).toBeGreaterThan(plan.budget);
        expect(plan.breaks.length, code).toBeGreaterThan(0);
      }
      const rows = bridgeRows(de, "DE", code, "de-DE");
      expect(rows.length, code).toBeGreaterThan(0);
      // The Friday after Ascension is a bridge everywhere in 2027.
      expect(
        rows.some((row) => row.days.includes("2027-05-07")),
        code,
      ).toBe(true);
      for (const row of rows) {
        expect(row.leave).toBe(row.days.length);
        expect(row.length).toBeGreaterThan(row.leave);
      }
    }
  });

  it("names each state's own holidays, only where the data has them", () => {
    const page = (code: string) =>
      germanStateLanding({
        file: de,
        code,
        sourceName: germany.regions[code] ?? code,
        year: YEAR,
        budget: 20,
        daysOff: 50,
      }).paragraphs.join(" ");
    expect(page("BY")).toContain("Heilige Drei Könige");
    expect(page("BY")).toContain("Fronleichnam");
    expect(page("BY")).toContain("Mariä Himmelfahrt (15. August) ist in Bayern kein landesweiter Feiertag");
    expect(page("SL")).toContain("im Saarland");
    expect(page("SL")).toContain("Mariä Himmelfahrt fällt 2027 auf einen Sonntag");
    expect(page("BE")).toContain("Internationaler Frauentag");
    expect(page("TH")).toContain("Weltkindertag");
    expect(page("SN")).toContain("Buß- und Bettag");
    expect(page("SN")).toContain("Montag, 15. November und Dienstag, 16. November");
    expect(page("NW")).toContain("Fronleichnam");
    expect(page("NI")).toContain("Reformationstag fällt 2027 auf einen Sonntag");
    expect(page("HB")).not.toContain("Fronleichnam");
    expect(page("BE")).not.toContain("Reformationstag");
  });

  it("keeps the published slugs while headings say Bremen and Hamburg", () => {
    expect(regionCopy("DE", "HB", "Hansestadt Bremen")).toMatchObject({
      slug: "hansestadt-bremen",
      name: "Bremen",
    });
    expect(regionCopy("DE", "HH", "Hansestadt Hamburg")).toMatchObject({
      slug: "hansestadt-hamburg",
      name: "Hamburg",
    });
    expect(regionCopy("DE", "BW", "Baden-Württemberg").slug).toBe("baden-wuerttemberg");
  });

  it("summarises every state for the hub table, with links that exist", () => {
    const states = germanStateSummaries(de, germany.regions);
    expect(states).toHaveLength(16);
    const by = states.find((state) => state.code === "BY");
    const hb = states.find((state) => state.code === "HB");
    expect(by && hb).toBeTruthy();
    expect(by?.total).toBe(12);
    expect(by?.bridgeDays).toBeGreaterThan(hb?.bridgeDays ?? 0);
    for (const state of states) {
      expect(shouldIndexPage(`https://leavemaxxing.com/de-de/brueckentage-${YEAR}/${state.slug}/`)).toBe(
        true,
      );
    }
  });
});

describe("Austria, Netherlands, and Sweden landing data", () => {
  it("lists Austrian Fenstertage, including the Monday before the National Day", () => {
    const rows = bridgeRows(load("AT"), "AT", null, "de-AT");
    expect(rows.some((row) => row.days.includes("2027-10-25"))).toBe(true);
    expect(rows.some((row) => row.holidays.includes("Mariä Empfängnis"))).toBe(true);
    const faq = weekendHolidayFaq("de-AT", load("AT"), "AT", null, YEAR, "in Österreich");
    expect(faq.answer).toContain("Staatsfeiertag (Samstag, 1. Mai)");
  });

  it("uses the official school holidays for noord, midden, and zuid", () => {
    const sections = dutchSchoolSections(load("NL"), YEAR);
    expect(sections).not.toBeNull();
    if (!sections) return;
    expect(sections.regions.map((region) => region.region)).toEqual(["noord", "midden", "zuid"]);
    const zuid = sections.regions.find((region) => region.region === "zuid");
    const summer = zuid?.periods.find(
      (period) => period.name === "Zomervakantie" && period.schoolYear === "2026-2027",
    );
    expect(summer?.range).toBe("24 juli 2027 – 5 september 2027");
    for (const region of sections.regions) {
      const may = region.periods.find((period) => period.name === "Meivakantie");
      expect(may?.holidays).toContain("Koningsdag");
      expect(may?.bridges.some((bridge) => bridge.days.includes("2027-04-26"))).toBe(true);
    }
    expect(sections.coveredUntil).toBeNull();
    expect(sections.sources[0]?.url).toContain("rijksoverheid.nl");
    expect(liberationDayFaq(load("NL"), YEAR)?.answer).toContain("woensdag 5 mei");
  });

  it("splits the Swedish year into twelve months with the computed klämdagar", () => {
    const months = swedishMonths(load("SE"), [], YEAR, 25);
    expect(months).toHaveLength(12);
    expect(new Set(months.map((month) => month.id)).size).toBe(12);
    expect(months[0]?.heading).toBe("Klämdagar januari 2027");
    const may = months[4];
    expect(may?.bridges.some((bridge) => bridge.days.includes("2027-05-07"))).toBe(true);
    expect(months[6]?.holidays).toHaveLength(0);
    expect(months[5]?.holidays.map((holiday) => holiday.name)).toContain("Midsommarafton");
  });

  it("keeps the FAQ structured data between three and five questions", () => {
    for (const [code, country] of [
      ["de-DE", "DE"],
      ["de-AT", "AT"],
      ["nl-NL", "NL"],
      ["sv-SE", "SE"],
    ] as const) {
      const locale = locales[code];
      const file = load(country);
      if (!locale) throw new Error(code);
      const text = localizedSeasonal({
        localeCode: code,
        year: YEAR,
        where: whereFor(code, null),
        regional: false,
        file,
        country,
        region: null,
        budget: locale.defaultBudget,
        daysOff: 40,
        multiplier: 2,
        breaks: [],
        uiLocale: code,
      });
      const extra = weekendHolidayFaq(code, file, country, null, YEAR, whereFor(code, null));
      expect(text.faq.length + 1).toBeLessThanOrEqual(5);
      expect(extra.question).toContain(String(YEAR));
    }
  });

  it("puts every landing page in the sitemap", () => {
    for (const path of [
      "/de-de/brueckentage-2027/",
      "/de-at/fenstertage-2027/",
      "/nl-nl/brugdagen-2027/",
      "/sv-se/klamdagar-2027/",
    ]) {
      expect(shouldIndexPage(`https://leavemaxxing.com${path}`), path).toBe(true);
    }
  });
});
