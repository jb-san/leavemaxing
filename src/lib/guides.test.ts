import { describe, expect, it } from "vitest";
import {
  GUIDE_CATEGORIES,
  GUIDE_COPY,
  GUIDE_LOCALE_CODES,
  type GuideSummary,
  formatGuideDate,
  guideAlternates,
  guideCategoryPath,
  guideHubPath,
  guideJsonLd,
  guideLocaleFor,
  guidePath,
  guideRss,
  guidesForPlanner,
  hubAlternates,
  readingMinutes,
  rssDate,
  slugFromId,
  sortGuides,
  wordCount,
} from "./guides";

const SITE = "https://leavemaxxing.com";

function guide(overrides: Partial<GuideSummary> = {}): GuideSummary {
  return {
    slug: "midsummer-2027-sweden",
    locale: "en",
    translationKey: "midsummer-2027-sweden",
    title: "Midsummer 2027 in Sweden",
    description: "Dates & tips <for> Midsummer",
    category: "holiday-breaks",
    published: "2026-11-24",
    updated: "2026-11-25",
    countries: ["SE"],
    years: [2027],
    words: 1200,
    ...overrides,
  };
}

describe("guide routes", () => {
  it("prefixes localized guides with the locale", () => {
    expect(guideHubPath("en")).toBe("/guides/");
    expect(guideHubPath("sv-SE")).toBe("/sv-se/guides/");
    expect(guidePath("de-DE", "ostern-2027")).toBe("/de-de/guides/ostern-2027/");
    expect(guideCategoryPath("en", "planning-tips")).toBe("/guides/category/planning-tips/");
    expect(slugFromId("sv-se/midsommar-2027")).toBe("midsommar-2027");
  });

  it("sends Swedish and German UIs to their own guides, the rest to English", () => {
    expect(guideLocaleFor("sv-SE")).toBe("sv-SE");
    expect(guideLocaleFor("de-at")).toBe("de-DE");
    expect(guideLocaleFor("nb-NO")).toBe("en");
    expect(guideLocaleFor(undefined)).toBe("en");
  });

  it("has copy for every guide language and category", () => {
    for (const locale of GUIDE_LOCALE_CODES) {
      for (const category of GUIDE_CATEGORIES) expect(GUIDE_COPY[locale].categories[category].label).not.toBe("");
      expect(GUIDE_COPY[locale].minRead).toContain("{n}");
    }
  });
});

describe("word count and reading time", () => {
  it("counts running text, not markup or link targets", () => {
    const md = "## Heading here\n\nOne two [three four](flights:STO/anywhere/2027-05-06/2027-05-09) five.\n\n| a | b |\n| --- | --- |\n| six | 7 |";
    expect(wordCount(md)).toBe(11);
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1100)).toBe(5);
  });

  it("formats dates per language in UTC", () => {
    expect(formatGuideDate("en", "2026-11-25")).toBe("25 November 2026");
    expect(formatGuideDate("sv-SE", "2026-11-25")).toBe("25 november 2026");
    expect(formatGuideDate("de-DE", "2026-11-25")).toBe("25. November 2026");
  });
});

describe("hreflang", () => {
  const en = guide();
  const sv = guide({ locale: "sv-SE", slug: "midsommar-2027" });
  const other = guide({ slug: "x", translationKey: "x" });

  it("pairs language versions of one guide, with x-default on English", () => {
    expect(guideAlternates(sv, [en, sv, other], SITE)).toEqual([
      { lang: "en", url: `${SITE}/guides/midsummer-2027-sweden/` },
      { lang: "sv-SE", url: `${SITE}/sv-se/guides/midsommar-2027/` },
      { lang: "x-default", url: `${SITE}/guides/midsummer-2027-sweden/` },
    ]);
    expect(guideAlternates(other, [en, sv, other], SITE)).toEqual([]);
  });

  it("pairs hubs and category pages in every guide language", () => {
    const links = hubAlternates(SITE, "destinations");
    expect(links.map((link) => link.lang)).toEqual(["de-DE", "en", "sv-SE", "x-default"]);
    expect(links.at(-1)?.url).toBe(`${SITE}/guides/category/destinations/`);
  });
});

describe("structured data", () => {
  it("is a BlogPosting by the organisation, with breadcrumbs", () => {
    const data = guideJsonLd({ guide: guide(), siteUrl: SITE, image: "/og/guides/en/midsummer-2027-sweden.png" });
    const [post, crumbs] = data["@graph"] as Array<Record<string, unknown>>;
    expect(post).toMatchObject({
      "@type": "BlogPosting",
      headline: "Midsummer 2027 in Sweden",
      datePublished: "2026-11-24",
      dateModified: "2026-11-25",
      inLanguage: "en",
      image: `${SITE}/og/guides/en/midsummer-2027-sweden.png`,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/guides/midsummer-2027-sweden/` },
      author: { "@type": "Organization", name: "leavemaxxing" },
      publisher: { "@type": "Organization", name: "leavemaxxing" },
    });
    expect(JSON.stringify(data)).not.toContain('"Person"');
    expect(crumbs?.["@type"]).toBe("BreadcrumbList");
  });
});

describe("RSS", () => {
  it("lists guides newest first with escaped text", () => {
    const xml = guideRss("en", [guide({ slug: "old", published: "2026-11-18", title: "Old" }), guide()], SITE);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.indexOf("midsummer-2027-sweden")).toBeLessThan(xml.indexOf("/guides/old/"));
    expect(xml).toContain("<description>Dates &amp; tips &lt;for&gt; Midsummer</description>");
    expect(xml).toContain(`<atom:link href="${SITE}/guides/rss.xml" rel="self" type="application/rss+xml"/>`);
    expect(rssDate("2026-11-24")).toBe("Tue, 24 Nov 2026 12:00:00 GMT");
  });
});

describe("planner links", () => {
  it("picks guides for the page's language, country and year", () => {
    const list = [guide(), guide({ slug: "de", countries: ["DE"] }), guide({ slug: "any", years: [] })];
    expect(guidesForPlanner(list, "en", "se", 2027).map((item) => item.slug)).toEqual(["midsummer-2027-sweden", "any"]);
    expect(guidesForPlanner(list, "en", "SE", 2028).map((item) => item.slug)).toEqual(["any"]);
    expect(guidesForPlanner(list, "sv-SE", "SE", 2027)).toEqual([]);
  });

  it("sorts newest first", () => {
    expect(sortGuides([guide({ published: "2026-11-18" }), guide({ published: "2026-11-20" })]).map((g) => g.published)).toEqual([
      "2026-11-20",
      "2026-11-18",
    ]);
  });
});
