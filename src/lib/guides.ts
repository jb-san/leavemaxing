/**
 * Travel guides: routes, copy, reading time, structured data and RSS. Pure, so it is unit-tested
 * (guides.test.ts); the pages read the content collection and pass entries in. See docs/guides.md.
 */
import type { HreflangLink } from "./hreflang";

/** Languages with guide pages. Other UI locales link to the English guides. */
export const GUIDE_LOCALE_CODES = ["en", "sv-SE", "de-DE"] as const;
export type GuideLocale = (typeof GUIDE_LOCALE_CODES)[number];

export const GUIDE_CATEGORIES = ["destinations", "holiday-breaks", "planning-tips"] as const;
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

/** Organisation that writes and publishes the guides. No person is named anywhere. */
export const GUIDE_AUTHOR = "leavemaxxing";

export interface GuideCopy {
  /** <html lang> and JSON-LD inLanguage. */
  lang: string;
  /** Intl locale for dates. */
  dateLocale: string;
  hubTitle: string;
  hubDescription: string;
  hubH1: string;
  hubIntro: string;
  hubBreadcrumb: string;
  homeBreadcrumb: string;
  allCategories: string;
  categories: Record<GuideCategory, { label: string; title: string; description: string }>;
  published: string;
  updated: string;
  /** `{n}` minutes. */
  minRead: string;
  byline: string;
  rss: string;
  rssTitle: string;
  rssDescription: string;
  /** Heading of the guide list on planner pages. */
  plannerHeading: string;
  plannerIntro: string;
  /** End of a guide. */
  plannerCta: string;
  plannerCtaBody: string;
  moreGuides: string;
  otherLanguages: string;
  checkNote: string;
  /** Lime line on the link preview image. */
  ogTagline: string;
}

export const GUIDE_COPY: Record<GuideLocale, GuideCopy> = {
  en: {
    lang: "en",
    dateLocale: "en-GB",
    hubTitle: "Travel guides for bridge days and holiday breaks · leavemaxxing",
    hubDescription:
      "Where to go on the long weekends and holiday breaks of 2026 and 2027, how many leave days each one takes, and practical tips for booking and packing.",
    hubH1: "Travel guides",
    hubIntro:
      "Ideas and practical advice for the breaks our planner finds: where to go when the holidays line up, how many leave days a trip really takes, and how to book and pack for short breaks without wasting them.",
    hubBreadcrumb: "Guides",
    homeBreadcrumb: "Planner",
    allCategories: "All guides",
    categories: {
      destinations: {
        label: "Destinations",
        title: "Destination guides · leavemaxxing",
        description: "Where to go on a holiday break: destinations matched to real 2026 and 2027 holiday dates.",
      },
      "holiday-breaks": {
        label: "Holiday breaks",
        title: "Holiday break guides · leavemaxxing",
        description: "How to turn Easter, Ascension, Midsummer and Christmas into longer trips with a few leave days.",
      },
      "planning-tips": {
        label: "Planning tips",
        title: "Trip planning tips · leavemaxxing",
        description: "Booking flights, packing light and planning short breaks so the days off go to the trip.",
      },
    },
    published: "Published",
    updated: "Updated",
    minRead: "{n} min read",
    byline: "By the leavemaxxing team",
    rss: "RSS feed",
    rssTitle: "leavemaxxing travel guides",
    rssDescription: "Travel guides for bridge days, long weekends and holiday breaks.",
    plannerHeading: "Travel guides",
    plannerIntro: "Where to go on these breaks, and how to book them.",
    plannerCta: "Plan your own dates",
    plannerCtaBody:
      "The planner checks every way of spending your leave days around the public holidays where you live, region included.",
    moreGuides: "More guides",
    otherLanguages: "Also in",
    checkNote:
      "Holiday dates are from our holiday data and checked against the calendar. Prices, timetables and opening dates change: check them before you book.",
    ogTagline: "Where to go on your days off.",
  },
  "sv-SE": {
    lang: "sv-SE",
    dateLocale: "sv-SE",
    hubTitle: "Reseguider för klämdagar och långledigheter · leavemaxxing",
    hubDescription:
      "Vart du kan resa på långhelger och ledigheter 2026 och 2027, hur många semesterdagar varje ledighet kräver och praktiska tips om bokning och packning.",
    hubH1: "Reseguider",
    hubIntro:
      "Idéer och praktiska råd för ledigheterna som planeraren hittar: vart du kan åka när röda dagarna hamnar rätt, hur många semesterdagar en resa faktiskt kostar och hur du bokar och packar för korta resor.",
    hubBreadcrumb: "Guider",
    homeBreadcrumb: "Planerare",
    allCategories: "Alla guider",
    categories: {
      destinations: {
        label: "Resmål",
        title: "Guider om resmål · leavemaxxing",
        description: "Vart du kan åka på ledigheten: resmål kopplade till de riktiga datumen 2026 och 2027.",
      },
      "holiday-breaks": {
        label: "Långledigheter",
        title: "Guider om långledigheter · leavemaxxing",
        description: "Så gör du påsk, Kristi himmelfärd, midsommar och jul till längre ledigheter med några semesterdagar.",
      },
      "planning-tips": {
        label: "Planeringstips",
        title: "Tips för att planera resan · leavemaxxing",
        description: "Flygbokning, packning och planering för korta resor, så att de lediga dagarna går till resan.",
      },
    },
    published: "Publicerad",
    updated: "Uppdaterad",
    minRead: "{n} min läsning",
    byline: "Av leavemaxxing-redaktionen",
    rss: "RSS-flöde",
    rssTitle: "leavemaxxing reseguider",
    rssDescription: "Reseguider för klämdagar, långhelger och ledigheter.",
    plannerHeading: "Reseguider",
    plannerIntro: "Vart du kan åka på de här ledigheterna, och hur du bokar dem.",
    plannerCta: "Planera dina egna datum",
    plannerCtaBody:
      "Planeraren provar alla sätt att lägga dina semesterdagar runt röda dagar, så att du får ut så många lediga dagar som möjligt.",
    moreGuides: "Fler guider",
    otherLanguages: "Finns även på",
    checkNote:
      "Helgdagarna kommer från vår helgdagsdata och är kontrollerade mot kalendern. Priser, tidtabeller och öppettider ändras: kontrollera dem innan du bokar.",
    ogTagline: "Vart du åker när du är ledig.",
  },
  "de-DE": {
    lang: "de-DE",
    dateLocale: "de-DE",
    hubTitle: "Reiseratgeber für Brückentage und Feiertage · leavemaxxing",
    hubDescription:
      "Wohin an den langen Wochenenden und Feiertagen 2026 und 2027, wie viele Urlaubstage jede Reise kostet und praktische Tipps zu Buchung und Gepäck.",
    hubH1: "Reiseratgeber",
    hubIntro:
      "Ideen und praktische Tipps für die freien Tage, die unser Planer findet: wohin, wenn die Feiertage günstig liegen, wie viele Urlaubstage eine Reise wirklich kostet und wie man Kurzurlaube bucht und packt.",
    hubBreadcrumb: "Ratgeber",
    homeBreadcrumb: "Planer",
    allCategories: "Alle Ratgeber",
    categories: {
      destinations: {
        label: "Reiseziele",
        title: "Ratgeber zu Reisezielen · leavemaxxing",
        description: "Wohin an den freien Tagen: Reiseziele passend zu den Feiertagen 2026 und 2027.",
      },
      "holiday-breaks": {
        label: "Feiertage & Brückentage",
        title: "Ratgeber zu Feiertagen und Brückentagen · leavemaxxing",
        description: "Wie aus Ostern, Christi Himmelfahrt, Pfingsten und Weihnachten mit wenigen Urlaubstagen eine richtige Reise wird.",
      },
      "planning-tips": {
        label: "Planungstipps",
        title: "Tipps zur Reiseplanung · leavemaxxing",
        description: "Flüge buchen, leicht packen und Kurzurlaube planen, damit die freien Tage der Reise gehören.",
      },
    },
    published: "Veröffentlicht",
    updated: "Aktualisiert",
    minRead: "{n} Min. Lesezeit",
    byline: "Von der leavemaxxing-Redaktion",
    rss: "RSS-Feed",
    rssTitle: "leavemaxxing Reiseratgeber",
    rssDescription: "Reiseratgeber für Brückentage, lange Wochenenden und Feiertage.",
    plannerHeading: "Reiseratgeber",
    plannerIntro: "Wohin an diesen freien Tagen und wie man sie bucht.",
    plannerCta: "Eigene Termine planen",
    plannerCtaBody:
      "Der Planer prüft jede Möglichkeit, deine Urlaubstage um die Feiertage deines Bundeslandes zu legen.",
    moreGuides: "Weitere Ratgeber",
    otherLanguages: "Auch auf",
    checkNote:
      "Die Feiertage stammen aus unseren Feiertagsdaten und sind mit dem Kalender abgeglichen. Preise, Fahrpläne und Öffnungszeiten ändern sich: bitte vor der Buchung prüfen.",
    ogTagline: "Wohin an den freien Tagen.",
  },
};

/** Guide language for a UI locale: Swedish and German pages get their own guides, the rest English. */
export function guideLocaleFor(uiLocale: string | undefined | null): GuideLocale {
  const code = (uiLocale ?? "en").toLowerCase();
  if (code === "sv-se") return "sv-SE";
  if (code.startsWith("de-")) return "de-DE";
  return "en";
}

function prefix(locale: GuideLocale): string {
  return locale === "en" ? "" : `/${locale.toLowerCase()}`;
}

export function guideHubPath(locale: GuideLocale): string {
  return `${prefix(locale)}/guides/`;
}

export function guidePath(locale: GuideLocale, slug: string): string {
  return `${prefix(locale)}/guides/${slug}/`;
}

export function guideCategoryPath(locale: GuideLocale, category: GuideCategory): string {
  return `${prefix(locale)}/guides/category/${category}/`;
}

export function guideRssPath(locale: GuideLocale): string {
  return `${prefix(locale)}/guides/rss.xml`;
}

/** Link preview image for one guide, rendered at build time by src/pages/og/guides/. */
export function guideOgPath(locale: GuideLocale, slug: string): string {
  return `/og/guides/${locale.toLowerCase()}/${slug}.png`;
}

/** Slug of a collection entry id such as `sv-se/midsommar-2027`. */
export function slugFromId(id: string): string {
  return id.split("/").pop()?.replace(/\.md$/, "") ?? id;
}

/**
 * Words of running text in a markdown body: no frontmatter, HTML, link targets, images, code or
 * markdown punctuation.
 */
export function wordCount(markdown: string): number {
  const text = markdown
    .replace(/^---[\s\S]*?---/, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_|`~-]+/g, " ");
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Reading time at about 220 words a minute, never less than a minute. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

/** `25 November 2026` / `25 november 2026` / `25. November 2026`, from a `YYYY-MM-DD` day. */
export function formatGuideDate(locale: GuideLocale, iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(GUIDE_COPY[locale].dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y as number, (m as number) - 1, d as number)));
}

export interface GuideSummary {
  slug: string;
  locale: GuideLocale;
  translationKey: string;
  title: string;
  description: string;
  category: GuideCategory;
  published: string;
  updated: string;
  countries: string[];
  years: number[];
  words: number;
}

/** Newest first: by published date, then updated date, then title. */
export function sortGuides<T extends Pick<GuideSummary, "published" | "updated" | "title">>(guides: T[]): T[] {
  return [...guides].sort(
    (a, b) =>
      b.published.localeCompare(a.published) || b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title),
  );
}

/**
 * hreflang for one guide: every language version with the same translationKey, plus x-default on
 * the English version (or this page when there is no English one).
 */
export function guideAlternates(
  self: Pick<GuideSummary, "locale" | "slug" | "translationKey">,
  all: Array<Pick<GuideSummary, "locale" | "slug" | "translationKey">>,
  siteUrl: string,
): HreflangLink[] {
  const versions = all.filter((guide) => guide.translationKey === self.translationKey);
  if (versions.length < 2) return [];
  const url = (guide: Pick<GuideSummary, "locale" | "slug">) => `${siteUrl}${guidePath(guide.locale, guide.slug)}`;
  const english = versions.find((guide) => guide.locale === "en");
  const links = versions
    .map((guide) => ({ lang: guide.locale, url: url(guide) }))
    .sort((a, b) => a.lang.localeCompare(b.lang));
  return [...links, { lang: "x-default", url: english ? url(english) : url(self) }];
}

/** Hubs and category pages exist in every guide language, so they always pair up. */
export function hubAlternates(siteUrl: string, category?: GuideCategory): HreflangLink[] {
  const path = (locale: GuideLocale) => (category ? guideCategoryPath(locale, category) : guideHubPath(locale));
  return [
    ...GUIDE_LOCALE_CODES.map((locale) => ({ lang: locale, url: `${siteUrl}${path(locale)}` })).sort((a, b) =>
      a.lang.localeCompare(b.lang),
    ),
    { lang: "x-default", url: `${siteUrl}${path("en")}` },
  ];
}

const organization = (siteUrl: string) => ({
  "@type": "Organization",
  name: GUIDE_AUTHOR,
  url: `${siteUrl}/`,
  logo: { "@type": "ImageObject", url: `${siteUrl}/icons/icon-512.png` },
});

/** BlogPosting plus BreadcrumbList for one guide. Author and publisher are the organisation. */
export function guideJsonLd(input: {
  guide: GuideSummary;
  siteUrl: string;
  image: string;
}): Record<string, unknown> {
  const { guide, siteUrl, image } = input;
  const copy = GUIDE_COPY[guide.locale];
  const url = `${siteUrl}${guidePath(guide.locale, guide.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: guide.title,
        description: guide.description,
        datePublished: guide.published,
        dateModified: guide.updated,
        inLanguage: copy.lang,
        articleSection: copy.categories[guide.category].label,
        wordCount: guide.words,
        image: `${siteUrl}${image}`,
        author: organization(siteUrl),
        publisher: organization(siteUrl),
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        isPartOf: { "@type": "Blog", "@id": `${siteUrl}${guideHubPath(guide.locale)}#blog`, name: copy.hubH1 },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: copy.homeBreadcrumb, item: `${siteUrl}${guide.locale === "en" ? "/" : `/${guide.locale.toLowerCase()}/`}` },
          { "@type": "ListItem", position: 2, name: copy.hubBreadcrumb, item: `${siteUrl}${guideHubPath(guide.locale)}` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };
}

/** Blog (the hub) or a category page, with its posts and breadcrumbs. */
export function hubJsonLd(input: {
  locale: GuideLocale;
  siteUrl: string;
  guides: GuideSummary[];
  category?: GuideCategory;
}): Record<string, unknown> {
  const { locale, siteUrl, guides, category } = input;
  const copy = GUIDE_COPY[locale];
  const hub = `${siteUrl}${guideHubPath(locale)}`;
  const url = category ? `${siteUrl}${guideCategoryPath(locale, category)}` : hub;
  const crumbs = [
    { name: copy.homeBreadcrumb, item: `${siteUrl}${locale === "en" ? "/" : `/${locale.toLowerCase()}/`}` },
    { name: copy.hubBreadcrumb, item: hub },
    ...(category ? [{ name: copy.categories[category].label, item: url }] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": category ? "CollectionPage" : "Blog",
        "@id": category ? url : `${hub}#blog`,
        url,
        name: category ? copy.categories[category].label : copy.hubH1,
        description: category ? copy.categories[category].description : copy.hubDescription,
        inLanguage: copy.lang,
        publisher: organization(siteUrl),
        [category ? "hasPart" : "blogPost"]: guides.map((guide) => ({
          "@type": "BlogPosting",
          headline: guide.title,
          url: `${siteUrl}${guidePath(guide.locale, guide.slug)}`,
          datePublished: guide.published,
          dateModified: guide.updated,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })),
      },
    ],
  };
}

const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/** RFC 822 date for RSS, at noon UTC so no reader's time zone moves the day. */
export function rssDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number, 12)).toUTCString();
}

/** RSS 2.0 feed of one language's guides, newest first. */
export function guideRss(locale: GuideLocale, guides: GuideSummary[], siteUrl: string): string {
  const copy = GUIDE_COPY[locale];
  const sorted = sortGuides(guides);
  const latest = sorted.reduce((max, guide) => (guide.updated > max ? guide.updated : max), sorted[0]?.updated ?? "");
  const items = sorted.map((guide) => {
    const url = `${siteUrl}${guidePath(guide.locale, guide.slug)}`;
    return [
      "    <item>",
      `      <title>${escapeXml(guide.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <description>${escapeXml(guide.description)}</description>`,
      `      <category>${escapeXml(copy.categories[guide.category].label)}</category>`,
      `      <pubDate>${rssDate(guide.published)}</pubDate>`,
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(copy.rssTitle)}</title>`,
    `    <link>${siteUrl}${guideHubPath(locale)}</link>`,
    `    <atom:link href="${siteUrl}${guideRssPath(locale)}" rel="self" type="application/rss+xml"/>`,
    `    <description>${escapeXml(copy.rssDescription)}</description>`,
    `    <language>${copy.lang.toLowerCase()}</language>`,
    ...(latest ? [`    <lastBuildDate>${rssDate(latest)}</lastBuildDate>`] : []),
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** Guides for a planner page: same language, about this country, and this year when one is given. */
export function guidesForPlanner<T extends Pick<GuideSummary, "locale" | "countries" | "years">>(
  guides: T[],
  locale: GuideLocale,
  country: string,
  year?: number,
): T[] {
  return guides.filter(
    (guide) =>
      guide.locale === locale &&
      guide.countries.includes(country.toUpperCase()) &&
      (year === undefined || guide.years.length === 0 || guide.years.includes(year)),
  );
}
