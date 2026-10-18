import { describe, expect, it } from "vitest";
import { countries } from "~/data";
import { isRegionalCountry, locales, UKRAINE_MARTIAL_LAW_NOTICE } from "~/data/locales";
import { filesFor, readHolidayFile } from "~/data/server";
import { isSeasonalYearUrl } from "~/data/sitemap-config";
import { findBridgeFacts } from "./bridgeFacts";
import { BUILD_DATE } from "./buildDate";
import { fromIso, toIso } from "./dates";
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

const PLACEHOLDER = /\{[A-Za-z][A-Za-z0-9]*\}/;

function cluster(leave: number, length: number) {
  return {
    days: ["2027-05-07"],
    holidays: ["Holiday"],
    start: fromIso("2027-05-06"),
    end: fromIso("2027-05-09"),
    leave,
    length,
  };
}

function seasonalBlob(
  localeCode: string,
  count: number,
  leave: number,
  length: number,
  daysOff: number,
): string {
  const text = seasonalText({
    localeCode,
    year: 2027,
    where: whereFor(localeCode, null),
    regional: false,
    facts: { days: count, bridges: count, best: count === 0 ? null : cluster(leave, length) },
    budget: 20,
    daysOff,
    multiplier: 2,
    longest: count === 0 ? null : { leave, length, start: fromIso("2026-12-31"), end: fromIso("2027-01-10") },
    uiLocale: localeCode,
  });
  return [
    text.title,
    text.description,
    text.updatedLabel,
    ...text.intro,
    ...text.faq.flatMap((item) => [item.question, item.answer]),
  ].join("\n");
}

describe("seasonal plurals and placeholders", () => {
  it("fills every locale without leaving a placeholder", () => {
    for (const code of Object.keys(locales)) {
      for (const daysOff of [1, 4, 5, 21, 22, 40]) {
        for (const length of [1, 4, 5, 11, 21, 22]) {
          expect(
            seasonalBlob(code, 1, 1, length, daysOff),
            `${code} length ${length} off ${daysOff}`,
          ).not.toMatch(PLACEHOLDER);
        }
      }
      for (const off of [1, 4, 5, 21, 22, 31, 45]) {
        const ranking = bestPageText({
          localeCode: code,
          year: 2027,
          where: whereFor(code, null),
          place: "Land",
          countries: 206,
          days: 20,
          off,
          topName: "Top",
          topOff: off,
          isTop: false,
          uiLocale: code,
        });
        const joined = [ranking.title, ranking.description, ...ranking.intro, ranking.updatedLabel].join(
          "\n",
        );
        expect(joined, `${code} ranking ${off}`).not.toMatch(PLACEHOLDER);
      }
    }
  });

  it("uses the plural category of each count, including a length that differs from the leave", () => {
    expect(seasonalBlob("sv-SE", 1, 1, 4, 40)).toContain("1 klämdag");
    expect(seasonalBlob("sv-SE", 1, 1, 4, 40)).not.toContain("1 klämdagar");
    expect(seasonalBlob("sv-SE", 1, 1, 1, 40)).toContain("1 dag ledigt");
    expect(seasonalBlob("sv-SE", 5, 5, 5, 40)).toContain("5 klämdagar");

    expect(seasonalBlob("pl-PL", 1, 1, 4, 40)).toContain("1 długi weekend");
    expect(seasonalBlob("pl-PL", 2, 2, 4, 40)).toContain("2 długie weekendy");
    expect(seasonalBlob("pl-PL", 5, 5, 5, 40)).toContain("5 długich weekendów");
    expect(seasonalBlob("pl-PL", 22, 22, 4, 40)).toContain("22 długie weekendy");
    expect(seasonalBlob("pl-PL", 1, 1, 4, 40)).toContain("4 dni wolne");
    expect(seasonalBlob("pl-PL", 1, 1, 4, 40)).not.toContain("4 dni wolnych");
    expect(seasonalBlob("pl-PL", 1, 1, 5, 40)).toContain("5 dni wolnych");
    expect(seasonalBlob("pl-PL", 1, 1, 1, 40)).toContain("1 dzień");

    expect(seasonalBlob("cs-CZ", 1, 1, 4, 40)).toContain("1 prodloužený víkend");
    expect(seasonalBlob("cs-CZ", 2, 2, 4, 40)).toContain("2 prodloužené víkendy");
    expect(seasonalBlob("cs-CZ", 5, 5, 5, 40)).toContain("5 prodloužených víkendů");
    expect(seasonalBlob("cs-CZ", 1, 1, 4, 40)).toContain("4 volné dny");
    expect(seasonalBlob("cs-CZ", 1, 1, 5, 40)).toContain("5 volných dnů");
    expect(seasonalBlob("cs-CZ", 1, 1, 1, 40)).toContain("1 den");

    expect(seasonalBlob("uk-UA", 1, 1, 4, 40)).toContain("1 довгі вихідні");
    expect(seasonalBlob("uk-UA", 2, 2, 4, 40)).toContain("2 довгі вихідні");
    expect(seasonalBlob("uk-UA", 5, 5, 5, 40)).toContain("5 довгих вихідних");
    expect(seasonalBlob("uk-UA", 21, 21, 4, 40)).toContain("21 довгі вихідні");
    expect(seasonalBlob("uk-UA", 22, 22, 4, 40)).toContain("22 довгі вихідні");
    expect(seasonalBlob("uk-UA", 1, 1, 4, 40)).toContain("4 вільні дні");
    expect(seasonalBlob("uk-UA", 1, 1, 5, 40)).toContain("5 вільних днів");
    expect(seasonalBlob("uk-UA", 1, 1, 21, 40)).toContain("21 вільний день");
    expect(seasonalBlob("uk-UA", 1, 1, 22, 40)).toContain("22 вільні дні");
    expect(seasonalBlob("uk-UA", 1, 1, 21, 40)).toContain("21 день");

    expect(seasonalBlob("fr-FR", 1, 1, 4, 40)).toContain("1 pont");
    expect(seasonalBlob("fr-FR", 1, 1, 4, 40)).not.toContain("1 ponts");
    expect(seasonalBlob("fr-FR", 2, 2, 4, 40)).toContain("2 ponts");
    expect(seasonalBlob("fr-FR", 0, 1, 4, 1)).toContain("1 jour de repos");
    expect(seasonalBlob("de-DE", 1, 1, 1, 1)).toContain("1 freien Tag");
    expect(seasonalBlob("de-DE", 1, 1, 1, 1)).toContain("1 freier Tag");

    const polish = bestPageText({
      localeCode: "pl-PL",
      year: 2027,
      where: whereFor("pl-PL", null),
      place: "Polska",
      countries: 206,
      days: 20,
      off: 4,
      topName: "Top",
      topOff: 21,
      isTop: false,
      uiLocale: "pl-PL",
    });
    expect(polish.intro.join(" ")).toContain("4 dni wolne");
    expect(polish.intro.join(" ")).toContain("21 dniami wolnymi");
    expect(polish.description).toContain("4 dni wolne");
  });
});

describe("Ukraine martial law in seasonal pages", () => {
  it("adds the notice to Ukraine FAQ JSON-LD and keeps Ukraine out of the ranking claim", () => {
    const file = readHolidayFile("UA", 2027);
    expect(file).toBeTruthy();
    if (!file) return;
    for (const [code, pattern] of [
      ["en", /martial law/],
      ["uk-UA", /воєнн/],
    ] as const) {
      const text = localizedSeasonal({
        localeCode: code,
        year: 2027,
        where: code === "en" ? "in Ukraine" : whereFor(code, null),
        regional: false,
        file,
        country: "UA",
        region: null,
        budget: 24,
        daysOff: 60,
        multiplier: 2.5,
        breaks: [],
        uiLocale: code,
      });
      expect(text.faq.length).toBeGreaterThanOrEqual(3);
      expect(text.faq.length).toBeLessThanOrEqual(5);
      const answer = text.faq.at(-1)?.answer ?? "";
      expect(answer).toMatch(pattern);
      expect(answer).toMatch(code === "en" ? /working days/ : /робоч/);
      expect(
        [text.description, ...text.intro, ...text.faq.flatMap((item) => [item.question, item.answer])].join(
          "\n",
        ),
      ).not.toMatch(PLACEHOLDER);
      const json = pageJsonLd({
        title: text.title,
        description: text.description,
        url: "https://leavemaxxing.com/ua/2027/",
        inLanguage: code === "en" ? "en" : "uk-UA",
        faq: text.faq,
      });
      const parsed = JSON.parse(JSON.stringify(json)) as {
        "@graph": Array<{ "@type"?: string; mainEntity?: Array<{ acceptedAnswer?: { text?: string } }> }>;
      };
      const faq = parsed["@graph"].find((node) => node["@type"] === "FAQPage");
      expect(faq?.mainEntity?.at(-1)?.acceptedAnswer?.text).toBe(answer);
    }
    expect(UKRAINE_MARTIAL_LAW_NOTICE).toMatch(/martial law/);

    const sweden = localizedSeasonal({
      localeCode: "sv-SE",
      year: 2027,
      where: whereFor("sv-SE", null),
      regional: false,
      file,
      country: "SE",
      region: null,
      budget: 25,
      daysOff: 53,
      multiplier: 2.1,
      breaks: [],
      uiLocale: "sv-SE",
    });
    expect(sweden.faq).toHaveLength(4);

    const unranked = bestPageText({
      localeCode: "uk-UA",
      year: 2027,
      where: whereFor("uk-UA", null),
      place: "Україна",
      countries: 206,
      days: 20,
      off: 0,
      topName: "Іспанія",
      topOff: 53,
      isTop: false,
      uiLocale: "uk-UA",
      ranked: false,
      notice: locales["uk-UA"]?.translations.notice,
    });
    const intro = unranked.intro.join(" ");
    expect(intro).toMatch(/воєнн/);
    expect(intro).toMatch(/робоч/);
    expect(intro).not.toContain("0 вільних");
    expect(unranked.description).toMatch(/не включено до рейтингу/);
    expect(unranked.description).toMatch(/воєнн/);
    expect(`${unranked.description}\n${intro}`).not.toMatch(PLACEHOLDER);
  });
});

describe("Swedish midsummer in seasonal facts", () => {
  it("plans the Friday 19–25 June eve and does not cite 18 June", () => {
    const sweden = readHolidayFile("SE", 2027);
    expect(sweden).toBeTruthy();
    if (!sweden) return;
    const eve = sweden.holidays.find(
      (holiday) => holiday.local === "Midsommarafton" || holiday.names?.sv === "Midsommarafton",
    );
    expect(eve?.date).toBe("2027-06-25");
    expect(sweden.holidays.some((holiday) => holiday.date === "2027-06-18")).toBe(false);
    const facts = findBridgeFacts(sweden, "SE", null, "sv-SE");
    expect(JSON.stringify(facts)).not.toContain("2027-06-18");
    expect(facts.best?.days).toContain("2027-05-07");

    const locale = locales["sv-SE"];
    expect(locale).toBeTruthy();
    if (!locale) return;
    const settings = defaultSettings("SE", 2027);
    settings.budget = locale.defaultBudget;
    const files = filesFor(settings);
    const result = plan(
      toPlanInput(
        settings,
        yearsNeeded(settings).map((year) => files.find((item) => item.year === year)),
        fromIso("2026-10-18"),
      ),
    );
    const eveDay = fromIso("2027-06-25");
    const midsummer = result.breaks.find((item) => item.start <= eveDay && item.end >= eveDay);
    expect(midsummer && toIso(midsummer.start)).toBe("2027-06-19");
    expect(midsummer && toIso(midsummer.end)).toBe("2027-06-27");

    const text = localizedSeasonal({
      localeCode: "sv-SE",
      year: 2027,
      where: whereFor("sv-SE", null),
      regional: false,
      file: sweden,
      country: "SE",
      region: null,
      budget: locale.defaultBudget,
      daysOff: result.stats.daysOff,
      multiplier: result.stats.multiplier,
      breaks: result.breaks,
      uiLocale: "sv-SE",
    });
    const blob = [text.description, ...text.intro, ...text.faq.map((item) => item.answer)].join(" ");
    expect(blob).not.toMatch(/18 juni|18 June|2027-06-18/);
    expect(blob).not.toMatch(PLACEHOLDER);
  });
});
