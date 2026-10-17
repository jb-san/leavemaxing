import { describe, expect, it } from "vitest";
import { locales, replaceTokens } from "~/data/locales";
import { shouldIndexCountry, shouldIndexPage } from "~/data/sitemap-config";
import { extractCountryYear, listCountries, listRegions } from "../../scripts/lib/extract";
import { calculateBridgePlans, findBestBridgeDays } from "./bridgeDays";
import { toIso } from "./dates";
import { appliesTo } from "./holidays";
import { englishCountryAlternates, localizedPageAlternates, siblingLocaleAlternates } from "./hreflang";
import { regionCopy, SPANISH_COMMUNITIES } from "./regionLabels";
import { DISTINCT_HOLIDAY_REGIONS, publishedRegionCodes, regionDiffersFromNational } from "./regionSets";

const YEARS = [2027, 2028] as const;
const WAVE2 = ["fr-FR", "fr-BE", "nl-BE", "fr-LU", "es-ES", "it-IT", "pt-PT", "cs-CZ"] as const;

describe("wave 2 locales", () => {
  it("uses the search term people actually use, as a short ASCII slug", () => {
    expect(locales["fr-FR"]).toMatchObject({
      slug: "ponts",
      bridgeTerm: "ponts",
      country: "FR",
      defaultBudget: 25,
    });
    expect(locales["fr-BE"]).toMatchObject({ slug: "ponts", country: "BE", defaultBudget: 20 });
    expect(locales["nl-BE"]).toMatchObject({
      slug: "brugdagen",
      bridgeTerm: "brugdagen",
      country: "BE",
      lang: "nl",
    });
    expect(locales["fr-LU"]).toMatchObject({ slug: "ponts", country: "LU", defaultBudget: 26 });
    expect(locales["es-ES"]).toMatchObject({ slug: "puentes", bridgeTerm: "puentes", defaultBudget: 22 });
    expect(locales["it-IT"]).toMatchObject({ slug: "ponti", bridgeTerm: "ponti" });
    expect(locales["pt-PT"]).toMatchObject({ slug: "pontes", bridgeTerm: "pontes", defaultBudget: 22 });
    expect(locales["cs-CZ"]).toMatchObject({
      slug: "prodlouzene-vikendy",
      bridgeTerm: "prodloužené víkendy",
      defaultBudget: 20,
    });
    for (const code of WAVE2) {
      expect(locales[code]?.slug).toMatch(/^[a-z0-9-]+$/);
    }
    expect(listCountries().LU).toBeTruthy();
    expect(listCountries().FR).toBeTruthy();
  });

  it("keeps Belgian French and Dutch as separate copy, and Czech off the Dutch template", () => {
    const frBe = locales["fr-BE"];
    const frFr = locales["fr-FR"];
    const nlBe = locales["nl-BE"];
    const nlNl = locales["nl-NL"];
    expect(frBe && frFr && nlBe && nlNl).toBeTruthy();
    expect(frBe?.translations.faq[0]?.answer).not.toBe(frFr?.translations.faq[0]?.answer);
    expect(frBe?.translations.intro).toContain("Belgique");
    expect(frBe?.translations.faq.map((item) => item.answer).join(" ")).toMatch(/remplac/i);
    expect(frFr?.translations.faq.map((item) => item.answer).join(" ")).toMatch(/solidarité/);
    expect(nlBe?.translations.faq[0]?.answer).not.toBe(nlNl?.translations.faq[0]?.answer);
    expect(nlBe?.translations.intro).toContain("België");
    expect(nlBe?.translations.leaveDays).toBe("verlofdagen");
    expect(locales["cs-CZ"]?.translations.h1).toBe("Prodloužené víkendy {year}");
  });

  it("publishes a page per locale-year and a Spanish community page only when the calendar differs", () => {
    const urls: string[] = [];
    for (const code of WAVE2) {
      const locale = locales[code];
      expect(locale, code).toBeDefined();
      if (!locale) continue;
      for (const year of YEARS) {
        const path = `/${code.toLowerCase()}/${locale.slug}-${year}/`;
        urls.push(path);
        expect(shouldIndexPage(`https://leavemaxxing.com${path}`)).toBe(true);
        if (code !== "es-ES") continue;
        const regionCodes = Object.keys(listRegions("ES"));
        const file = extractCountryYear("ES", year, regionCodes);
        const published = publishedRegionCodes("ES", regionCodes, file);
        expect(published).toHaveLength(Object.keys(SPANISH_COMMUNITIES).length);
        expect(published).toContain("MD");
        for (const region of published) {
          expect(regionDiffersFromNational(file.holidays, region), `${region} ${year}`).toBe(true);
          const copy = regionCopy("ES", region, "");
          const regional = `${path}${copy.slug}/`;
          urls.push(regional);
          expect(copy.slug).toMatch(/^[a-z0-9-]+$/);
          expect(shouldIndexPage(`https://leavemaxxing.com${regional}`)).toBe(true);
        }
      }
    }
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(16 + 19 * 2);
    expect(urls).toContain("/fr-fr/ponts-2027/");
    expect(urls).toContain("/fr-lu/ponts-2028/");
    expect(urls).toContain("/es-es/puentes-2027/madrid/");
    expect(urls).toContain("/cs-cz/prodlouzene-vikendy-2027/");
    expect(shouldIndexCountry("LU")).toBe(true);
  });

  it("names Spanish communities in Spanish and points Madrid at /madrid/", () => {
    const madrid = regionCopy("ES", "MD", "Comunidad de Madrid");
    const es = locales["es-ES"];
    expect(madrid).toMatchObject({ slug: "madrid", name: "Comunidad de Madrid", h1Region: "Madrid" });
    expect(es).toBeDefined();
    if (!es) return;
    expect(replaceTokens(es.translations.h1Region, { year: 2027, region: madrid.h1Region })).toBe(
      "Puentes 2027 en Madrid",
    );
    expect(
      replaceTokens(es.translations.pageTitle, {
        year: 2027,
        region: madrid.titleRegion,
        leave: 22,
        total: 59,
      }),
    ).toContain("Puentes 2027 en Madrid");
    expect(regionCopy("ES", "CT", "Catalonia").name).toBe("Cataluña");
    expect(regionCopy("ES", "IB", "Illes Balears").name).toBe("Islas Baleares");
    expect(regionCopy("ES", "VC", "Comunitat Valenciana").name).toBe("Comunidad Valenciana");
    expect(regionCopy("ES", "CM", "Castile-La Mancha").name).toBe("Castilla-La Mancha");
    expect(regionCopy("ES", "PV", "Basque Country").h1Region).toBe("el País Vasco");
    for (const code of Object.keys(listRegions("ES"))) {
      expect(SPANISH_COMMUNITIES[code], code).toBeDefined();
    }
  });

  it("links fr-BE and nl-BE to each other, with x-default on the English Belgium page", () => {
    const fr = "https://leavemaxxing.com/fr-be/ponts-2027/";
    const nl = "https://leavemaxxing.com/nl-be/brugdagen-2027/";
    const en = "https://leavemaxxing.com/be/2027/";
    const all = Object.values(locales);
    expect(
      localizedPageAlternates(
        "fr-BE",
        fr,
        en,
        siblingLocaleAlternates("fr-BE", 2027, "https://leavemaxxing.com", all),
      ),
    ).toEqual([
      { lang: "fr-BE", url: fr },
      { lang: "nl-BE", url: nl },
      { lang: "x-default", url: en },
    ]);
    expect(
      localizedPageAlternates(
        "nl-BE",
        nl,
        en,
        siblingLocaleAlternates("nl-BE", 2027, "https://leavemaxxing.com", all),
      ),
    ).toEqual([
      { lang: "nl-BE", url: nl },
      { lang: "fr-BE", url: fr },
      { lang: "x-default", url: en },
    ]);
    expect(siblingLocaleAlternates("fr-FR", 2027, "https://leavemaxxing.com", all)).toEqual([]);
    const english = englishCountryAlternates(
      all
        .filter((locale) => locale.country === "BE")
        .map((locale) => ({
          code: locale.code,
          url: `https://leavemaxxing.com/${locale.code.toLowerCase()}/${locale.slug}-2027/`,
        })),
      en,
    );
    expect(english.map((link) => link.lang).sort()).toEqual(["en", "fr-BE", "nl-BE", "x-default"]);
  });
});

describe("known 2027 bridge plans", () => {
  it("makes Friday 7 May the Ascension bridge in France", () => {
    const file = extractCountryYear("FR", 2027, []);
    const ascension = findBestBridgeDays(file, []).find((bridge) => bridge.holiday === "Ascension Day");
    expect(ascension).toMatchObject({
      holidayDate: "2027-05-06",
      bridgeDays: ["2027-05-07"],
      totalDays: 4,
      period: { start: "2027-05-06", end: "2027-05-09" },
    });

    const plan = calculateBridgePlans("FR", null, 2027, [file], [5])[0];
    const bridge = plan?.breaks.find((item) =>
      item.holidays.some((holiday) => holiday.name === "Ascension Day"),
    );
    expect(bridge?.leave).toBe(1);
    expect(bridge?.length).toBe(4);
    expect(bridge ? toIso(bridge.start) : "").toBe("2027-05-06");
    expect(bridge ? toIso(bridge.end) : "").toBe("2027-05-09");
  });

  it("gives Madrid a different 2027 puente plan from the national calendar", () => {
    const regions = Object.keys(listRegions("ES"));
    const file = extractCountryYear("ES", 2027, regions);
    const datesFor = (region: string | null) =>
      file.holidays.filter((holiday) => appliesTo(holiday, region)).map((holiday) => holiday.date);

    expect(datesFor("MD")).toEqual(expect.arrayContaining(["2027-03-25", "2027-05-03"]));
    expect(datesFor(null)).not.toContain("2027-03-25");
    expect(datesFor(null)).not.toContain("2027-05-03");

    const national = calculateBridgePlans("ES", null, 2027, [file], [5])[0];
    const madrid = calculateBridgePlans("ES", "MD", 2027, [file], [5])[0];
    expect(national?.daysOff).toBe(20);
    expect(madrid?.daysOff).toBe(22);
    const community = madrid?.breaks.find((item) =>
      item.holidays.some((holiday) => holiday.name.includes("Comunidad de Madrid")),
    );
    const maundy = madrid?.breaks.find((item) =>
      item.holidays.some((holiday) => holiday.name === "Maundy Thursday"),
    );
    expect(community).toMatchObject({ leave: 1, length: 4 });
    expect(maundy).toMatchObject({ leave: 1, length: 5 });
    expect(community ? toIso(community.start) : "").toBe("2027-04-30");
    expect(maundy ? toIso(maundy.start) : "").toBe("2027-03-24");
  });

  it("finds no Bundesland calendar that differs from the Austrian national set", () => {
    const regions = Object.keys(listRegions("AT"));
    expect(regions.length).toBeGreaterThan(0);
    for (const year of YEARS) {
      const file = extractCountryYear("AT", year, regions);
      for (const code of regions) {
        expect(regionDiffersFromNational(file.holidays, code), `${code} ${year}`).toBe(false);
      }
      expect(DISTINCT_HOLIDAY_REGIONS.has("AT")).toBe(true);
      expect(publishedRegionCodes("AT", regions, file)).toEqual([]);
    }
  });
});
