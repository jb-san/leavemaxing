import { describe, expect, it } from "vitest";
import { countries } from "~/data";
import { isRegionalCountry, locales } from "~/data/locales";
import { filesFor, readHolidayFile } from "~/data/server";
import { isSeasonalYearUrl } from "~/data/sitemap-config";
import { findBridgeFacts } from "./bridgeFacts";
import { BUILD_DATE } from "./buildDate";
import { fromIso } from "./dates";
import { toPlanInput, yearsNeeded } from "./planInput";
import { plan } from "./planner/plan";
import {
  bestPageText,
  englishCountryTitle,
  localizedSeasonal,
  pageJsonLd,
  regionPlace,
  searchPhrase,
  seasonalText,
  whereFor,
} from "./seasonalSeo";
import { defaultSettings } from "./settings";

const dummy = { days: 4, bridges: 3, best: null };

function titlesFor(localeCode: string, year: number): string[] {
  const locale = locales[localeCode];
  if (!locale) return [];
  const country = countries.find((item) => item.code === locale.country);
  const national = seasonalText({
    localeCode,
    year,
    where: whereFor(localeCode, null),
    regional: false,
    facts: dummy,
    budget: locale.defaultBudget,
    daysOff: 40,
    multiplier: 2,
    longest: null,
    uiLocale: localeCode,
  }).title;
  const regional =
    country && isRegionalCountry(locale.country)
      ? Object.entries(country.regions).map(([code, name]) => {
          const where = whereFor(localeCode, regionPlace(locale.country, code, name));
          return seasonalText({
            localeCode,
            year,
            where,
            regional: true,
            facts: dummy,
            budget: locale.defaultBudget,
            daysOff: 40,
            multiplier: 2,
            longest: null,
            uiLocale: localeCode,
          }).title;
        })
      : [];
  return [national, ...regional];
}

describe("seasonal titles", () => {
  it("uses the search phrase on the Swedish, German and English Sweden pages", () => {
    expect(titlesFor("sv-SE", 2027)[0]).toBe(
      "Klämdagar 2027: alla klämdagar i Sverige och hur du får längst ledighet",
    );
    expect(titlesFor("de-DE", 2027)[0]).toBe("Brückentage 2027: alle Brückentage in Deutschland");
    expect(englishCountryTitle("Sweden", 2027)).toBe("Bridge days 2027 in Sweden: longest time off");
  });

  it("keeps 2027 titles unique, phrase-led, and short aside from the Swedish example", () => {
    const seen = new Set<string>();
    for (const code of Object.keys(locales)) {
      const phrase = locales[code]?.bridgeTerm;
      expect(phrase, code).toBeTruthy();
      for (const title of titlesFor(code, 2027)) {
        expect(title.startsWith(`${searchPhrase(code)} 2027`), title).toBe(true);
        expect(seen.has(title), title).toBe(false);
        seen.add(title);
        const limit =
          title === "Klämdagar 2027: alla klämdagar i Sverige och hur du får längst ledighet" ? 80 : 60;
        expect(title.length, title).toBeLessThanOrEqual(limit);
      }
      const text = seasonalText({
        localeCode: code,
        year: 2027,
        where: whereFor(code, null),
        regional: false,
        facts: dummy,
        budget: 20,
        daysOff: 40,
        multiplier: 2,
        longest: null,
        uiLocale: code,
      });
      expect(text.description.startsWith(`${searchPhrase(code)} 2027`), text.description).toBe(true);
      const ranking = bestPageText({
        localeCode: code,
        year: 2027,
        where: whereFor(code, null),
        place: "Land",
        countries: 10,
        days: 20,
        off: 45,
        topName: "Top",
        topOff: 50,
        isTop: false,
        uiLocale: code,
      });
      expect(ranking.title.startsWith(`${searchPhrase(code)} 2027`), ranking.title).toBe(true);
      expect(ranking.title.length, ranking.title).toBeLessThanOrEqual(60);
      expect(seen.has(ranking.title), ranking.title).toBe(false);
      seen.add(ranking.title);
      expect(ranking.description.startsWith(`${searchPhrase(code)} 2027`), ranking.description).toBe(true);
      expect(ranking.intro).toHaveLength(3);
    }
    const english = countries.map((country) => englishCountryTitle(country.name, 2027));
    expect(new Set(english).size).toBe(english.length);
    for (const title of english) {
      expect(title.startsWith("Bridge days 2027"), title).toBe(true);
      expect(title.length, title).toBeLessThanOrEqual(60);
    }
  });
});

describe("seasonal facts and JSON-LD", () => {
  it("counts Sweden's Ascension bridge and Germany's single bridge day", () => {
    const sweden = readHolidayFile("SE", 2027);
    const germany = readHolidayFile("DE", 2027);
    expect(sweden && germany).toBeTruthy();
    if (!sweden || !germany) return;
    const swedish = findBridgeFacts(sweden, "SE", null, "sv-SE");
    expect(swedish.days).toBeGreaterThan(0);
    expect(swedish.best?.days).toContain("2027-05-07");
    expect(swedish.best?.holidays.join(" ")).toContain("Kristi himmelsfärdsdag");
    const german = findBridgeFacts(germany, "DE", null, "de-DE");
    expect(german.days).toBe(1);
    expect(findBridgeFacts(germany, "DE", "BY", "de-DE").days).toBeGreaterThan(german.days);
  });

  it("mirrors computed answers in FAQ JSON-LD for Sweden and Germany", () => {
    for (const [code, country] of [
      ["sv-SE", "SE"],
      ["de-DE", "DE"],
    ] as const) {
      const locale = locales[code];
      const file = readHolidayFile(country, 2027);
      expect(locale && file).toBeTruthy();
      if (!locale || !file) return;
      const settings = defaultSettings(country, 2027);
      settings.budget = locale.defaultBudget;
      const files = filesFor(settings);
      const result = plan(
        toPlanInput(
          settings,
          yearsNeeded(settings).map((year) => files.find((item) => item.year === year)),
          fromIso("2026-10-18"),
        ),
      );
      const text = localizedSeasonal({
        localeCode: code,
        year: 2027,
        where: whereFor(code, null),
        regional: false,
        file,
        country,
        region: null,
        budget: locale.defaultBudget,
        daysOff: result.stats.daysOff,
        multiplier: result.stats.multiplier,
        breaks: result.breaks,
        uiLocale: code,
      });
      expect(text.intro.length).toBeGreaterThanOrEqual(2);
      expect(text.intro.length).toBeLessThanOrEqual(3);
      expect(text.faq.length).toBeGreaterThanOrEqual(3);
      expect(text.faq.length).toBeLessThanOrEqual(5);
      expect(text.updatedDate).toBe(BUILD_DATE);
      expect(text.updatedLabel).toContain(text.updatedDate.slice(0, 4));
      const crumbs = [
        { name: locale.translations.home ?? "Planerare", item: "https://leavemaxxing.com/sv-se/" },
        { name: "Sverige", item: "https://leavemaxxing.com/se/" },
        { name: `${locale.bridgeTerm} 2027`, item: "https://leavemaxxing.com/sv-se/klamdagar-2027/" },
      ];
      const json = pageJsonLd({
        title: text.title,
        description: text.description,
        url: crumbs[2]?.item ?? "",
        inLanguage: locale.lang,
        applicationName: `leavemaxxing: ${text.title}`,
        breadcrumbs: crumbs,
        faq: text.faq,
        dateModified: text.updatedDate,
      });
      const parsed = JSON.parse(JSON.stringify(json)) as {
        "@context": string;
        "@graph": Array<Record<string, unknown>>;
      };
      expect(parsed["@context"]).toBe("https://schema.org");
      const faq = parsed["@graph"].find((node) => node["@type"] === "FAQPage") as {
        mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
      };
      expect(faq.mainEntity.map((item) => item.name)).toEqual(text.faq.map((item) => item.question));
      expect(faq.mainEntity.map((item) => item.acceptedAnswer.text)).toEqual(
        text.faq.map((item) => item.answer),
      );
      const crumbsLd = parsed["@graph"].find((node) => node["@type"] === "BreadcrumbList") as {
        itemListElement: Array<{ position: number; name: string }>;
      };
      expect(crumbsLd.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
      expect(crumbsLd.itemListElement.map((item) => item.name)).toEqual(crumbs.map((item) => item.name));
      const webPage = parsed["@graph"].find((node) => node["@type"] === "WebPage") as {
        dateModified: string;
      };
      expect(webPage.dateModified).toBe(BUILD_DATE);
      for (const item of text.faq) {
        expect(text.intro.join(" ") + item.answer).toContain(String(item.answer.match(/\d+/)?.[0]));
      }
    }
    const germanFile = readHolidayFile("DE", 2027);
    expect(germanFile).toBeTruthy();
    if (!germanFile) return;
    const german = localizedSeasonal({
      localeCode: "de-DE",
      year: 2027,
      where: whereFor("de-DE", null),
      regional: false,
      file: germanFile,
      country: "DE",
      region: null,
      budget: 20,
      daysOff: 45,
      multiplier: 2.2,
      breaks: [],
      uiLocale: "de-DE",
    });
    expect(german.faq[0]?.answer).toContain("1 Brückentag");
    expect(german.intro[0]).toContain("1 Brückentag");
  });
});

describe("seasonal sitemap urls", () => {
  it("marks 2027 and 2028 pages and leaves other urls alone", () => {
    expect(isSeasonalYearUrl("https://leavemaxxing.com/se/2027/")).toBe(true);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/sv-se/klamdagar-2027/")).toBe(true);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/de-de/brueckentage-2027/bayern/")).toBe(true);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/sv-se/best/2028/")).toBe(true);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/best/2027/")).toBe(true);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/se/2026/")).toBe(false);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/og/se/2027.png")).toBe(false);
    expect(isSeasonalYearUrl("https://leavemaxxing.com/sv-se/")).toBe(false);
  });
});
