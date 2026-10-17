import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countryByCode } from "~/data";
import { locales, replaceTokens } from "~/data/locales";
import { shouldIndexPage } from "~/data/sitemap-config";
import { englishCountryAlternates, localizedPageAlternates, regionalPageAlternates } from "./hreflang";
import { legacyRegionSlug, regionCopy, SWISS_CANTONS, swissCantonRedirects } from "./regionLabels";

describe("Swiss canton slugs and German region names", () => {
  it("maps every canton to the German slug and the old English slug", () => {
    expect(Object.keys(SWISS_CANTONS)).toHaveLength(26);
    expect(regionCopy("CH", "BL", "Canton of Basel-Country")).toMatchObject({
      slug: "basel-landschaft",
      name: "Basel-Landschaft",
    });
    expect(regionCopy("CH", "NE", "Canton of Neuchâtel")).toMatchObject({
      slug: "neuenburg",
      name: "Neuenburg",
    });
    expect(regionCopy("CH", "GR", "Canton of Grisons")).toMatchObject({
      slug: "graubuenden",
      name: "Graubünden",
    });
    expect(regionCopy("CH", "ZH", "Canton of Zürich")).toMatchObject({
      slug: "zuerich",
      name: "Zürich",
    });
    expect(regionCopy("CH", "GE", "Canton of Geneva").name).toBe("Genf");
    expect(legacyRegionSlug("Canton of Neuchâtel")).toBe("canton-of-neuch-tel");
    expect(legacyRegionSlug("Canton of Basel-Country")).toBe("canton-of-basel-country");
  });

  it("covers every Swiss region in the holiday data and redirects the old URL", () => {
    const swiss = countryByCode.get("CH");
    expect(swiss).toBeDefined();
    const redirects = readFileSync(join(process.cwd(), "public/_redirects"), "utf8");
    for (const [code, sourceName] of Object.entries(swiss?.regions ?? {})) {
      const canton = SWISS_CANTONS[code];
      expect(canton, code).toBeDefined();
      expect(legacyRegionSlug(sourceName)).toBe(canton?.legacySlug);
      const copy = regionCopy("CH", code, sourceName);
      expect(copy.slug).toBe(canton?.slug);
      expect(copy.name).not.toMatch(/canton of/i);
      for (const year of [2027, 2028]) {
        const line = `/de-ch/brueckentage-${year}/${canton?.legacySlug}/ /de-ch/brueckentage-${year}/${canton?.slug}/ 301`;
        expect(redirects).toContain(line);
        expect(shouldIndexPage(`https://leavemaxxing.com/de-ch/brueckentage-${year}/${copy.slug}/`)).toBe(
          true,
        );
      }
    }
    expect(swissCantonRedirects()).toHaveLength(52);
  });

  it("uses German state and Austrian names in titles and H1s", () => {
    const de = locales["de-DE"];
    const at = locales["de-AT"];
    const ch = locales["de-CH"];
    expect(de && at && ch).toBeTruthy();
    if (!de || !at || !ch) return;

    const bayern = regionCopy("DE", "BY", "Bayern");
    const bw = regionCopy("DE", "BW", "Baden-Württemberg");
    const th = regionCopy("DE", "TH", "Thüringen");
    expect(bayern).toMatchObject({ slug: "bayern", name: "Bayern", h1Region: "Bayern" });
    expect(bw.name).toBe("Baden-Württemberg");
    expect(bw.slug).toBe("baden-wuerttemberg");
    expect(th.name).toBe("Thüringen");
    expect(replaceTokens(de.translations.h1Region, { year: 2027, region: bayern.h1Region })).toBe(
      "Brückentage 2027 in Bayern",
    );
    expect(
      replaceTokens(de.translations.pageTitle, { year: 2027, region: bw.titleRegion, leave: 20, total: 47 }),
    ).toContain("Baden-Württemberg");

    const wien = regionCopy("AT", "9", "Vienna");
    const lower = regionCopy("AT", "3", "Lower Austria");
    const carinthia = regionCopy("AT", "2", "Carinthia");
    const styria = regionCopy("AT", "6", "Styria");
    const tyrol = regionCopy("AT", "7", "Tyrol");
    expect(wien.name).toBe("Wien");
    expect(lower.name).toBe("Niederösterreich");
    expect(carinthia.name).toBe("Kärnten");
    expect(styria.name).toBe("Steiermark");
    expect(tyrol.name).toBe("Tirol");
    expect(replaceTokens(at.translations.h1Region, { year: 2027, region: wien.h1Region })).toBe(
      "Fenstertage 2027 in Wien",
    );
    expect(
      replaceTokens(at.translations.pageTitle, {
        year: 2027,
        region: lower.titleRegion,
        leave: 25,
        total: 40,
      }),
    ).toContain("Niederösterreich");

    const zurich = regionCopy("CH", "ZH", "Canton of Zürich");
    expect(replaceTokens(ch.translations.h1Region, { year: 2027, region: zurich.h1Region })).toBe(
      "Brückentage 2027 im Kanton Zürich",
    );
    expect(
      replaceTokens(ch.translations.pageTitle, {
        year: 2027,
        region: zurich.titleRegion,
        leave: 20,
        total: 40,
      }),
    ).toContain("Kanton Zürich");
    expect(
      replaceTokens(ch.translations.h1Region, { year: 2028, region: regionCopy("CH", "GR", "").h1Region }),
    ).toBe("Brückentage 2028 im Kanton Graubünden");
    expect(
      replaceTokens(ch.translations.h1Region, { year: 2027, region: regionCopy("CH", "GE", "").h1Region }),
    ).toContain("Genf");
  });
});

describe("hreflang locale codes", () => {
  const english = "https://leavemaxxing.com/de/2027/";
  const localized = "https://leavemaxxing.com/de-de/brueckentage-2027/";

  it("uses full locale codes on localized pages and en plus x-default on the English page", () => {
    expect(localizedPageAlternates("de-DE", localized, english)).toEqual([
      { lang: "de-DE", url: localized },
      { lang: "x-default", url: english },
    ]);
    expect(
      localizedPageAlternates(
        "de-AT",
        "https://leavemaxxing.com/de-at/fenstertage-2027/",
        "https://leavemaxxing.com/at/2027/",
      ),
    ).toEqual([
      { lang: "de-AT", url: "https://leavemaxxing.com/de-at/fenstertage-2027/" },
      { lang: "x-default", url: "https://leavemaxxing.com/at/2027/" },
    ]);
    expect(
      localizedPageAlternates(
        "sv-SE",
        "https://leavemaxxing.com/sv-se/klamdagar-2027/",
        "https://leavemaxxing.com/se/2027/",
      )[0]?.lang,
    ).toBe("sv-SE");
    expect(
      localizedPageAlternates(
        "nb-NO",
        "https://leavemaxxing.com/nb-no/inneklemte-dager-2027/",
        "https://leavemaxxing.com/no/2027/",
      )[0]?.lang,
    ).toBe("nb-NO");
    expect(englishCountryAlternates([{ code: "de-DE", url: localized }], english)).toEqual([
      { lang: "de-DE", url: localized },
      { lang: "en", url: english },
      { lang: "x-default", url: english },
    ]);
    expect(englishCountryAlternates([], english)).toEqual([]);
  });

  it("pairs a regional page with an English regional URL when one exists", () => {
    const self = "https://leavemaxxing.com/de-ch/brueckentage-2027/zuerich/";
    const country = "https://leavemaxxing.com/ch/2027/";
    expect(regionalPageAlternates("de-CH", self, null, country)).toEqual([
      { lang: "de-CH", url: self },
      { lang: "x-default", url: country },
    ]);
    const englishRegional = "https://leavemaxxing.com/ch/2027/zuerich/";
    expect(regionalPageAlternates("de-CH", self, englishRegional, country)).toEqual([
      { lang: "de-CH", url: self },
      { lang: "en", url: englishRegional },
      { lang: "x-default", url: englishRegional },
    ]);
  });
});
