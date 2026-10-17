/**
 * Visible region names and URL slugs for localized pages.
 * German-language pages use German names. Swiss cantons drop the English
 * "canton-of" prefix. Germany already stores German names; Austria's source
 * names are English and are translated here for titles and H1s.
 */

export interface SwissCanton {
  slug: string;
  name: string;
  /** Slug produced from the English source name, kept for 301 redirects. */
  legacySlug: string;
}

export const SWISS_CANTONS: Record<string, SwissCanton> = {
  ZH: { slug: "zuerich", name: "Zürich", legacySlug: "canton-of-zuerich" },
  BE: { slug: "bern", name: "Bern", legacySlug: "canton-of-bern" },
  LU: { slug: "luzern", name: "Luzern", legacySlug: "canton-of-lucerne" },
  UR: { slug: "uri", name: "Uri", legacySlug: "canton-of-uri" },
  SZ: { slug: "schwyz", name: "Schwyz", legacySlug: "canton-of-schwyz" },
  OW: { slug: "obwalden", name: "Obwalden", legacySlug: "canton-of-obwalden" },
  NW: { slug: "nidwalden", name: "Nidwalden", legacySlug: "canton-of-nidwalden" },
  GL: { slug: "glarus", name: "Glarus", legacySlug: "canton-of-glarus" },
  ZG: { slug: "zug", name: "Zug", legacySlug: "canton-of-zug" },
  FR: { slug: "freiburg", name: "Freiburg", legacySlug: "canton-of-fribourg" },
  SO: { slug: "solothurn", name: "Solothurn", legacySlug: "canton-of-solothurn" },
  BS: { slug: "basel-stadt", name: "Basel-Stadt", legacySlug: "canton-of-basel-city" },
  BL: { slug: "basel-landschaft", name: "Basel-Landschaft", legacySlug: "canton-of-basel-country" },
  SH: { slug: "schaffhausen", name: "Schaffhausen", legacySlug: "canton-of-schaffhausen" },
  AR: {
    slug: "appenzell-ausserrhoden",
    name: "Appenzell Ausserrhoden",
    legacySlug: "canton-of-appenzell-outer-rhodes",
  },
  AI: {
    slug: "appenzell-innerrhoden",
    name: "Appenzell Innerrhoden",
    legacySlug: "canton-of-appenzell-inner-rhodes",
  },
  SG: { slug: "st-gallen", name: "St. Gallen", legacySlug: "canton-of-st-gallen" },
  GR: { slug: "graubuenden", name: "Graubünden", legacySlug: "canton-of-grisons" },
  AG: { slug: "aargau", name: "Aargau", legacySlug: "canton-of-aargau" },
  TG: { slug: "thurgau", name: "Thurgau", legacySlug: "canton-of-thurgau" },
  TI: { slug: "tessin", name: "Tessin", legacySlug: "canton-of-ticino" },
  VD: { slug: "waadt", name: "Waadt", legacySlug: "canton-of-vaud" },
  VS: { slug: "wallis", name: "Wallis", legacySlug: "canton-of-valais" },
  NE: { slug: "neuenburg", name: "Neuenburg", legacySlug: "canton-of-neuch-tel" },
  GE: { slug: "genf", name: "Genf", legacySlug: "canton-of-geneva" },
  JU: { slug: "jura", name: "Jura", legacySlug: "canton-of-jura" },
};

/** English source names from date-holidays, keyed by the numeric AT region code. */
export const AUSTRIAN_STATES: Record<string, { slug: string; name: string }> = {
  "1": { slug: "burgenland", name: "Burgenland" },
  "2": { slug: "kaernten", name: "Kärnten" },
  "3": { slug: "niederoesterreich", name: "Niederösterreich" },
  "4": { slug: "oberoesterreich", name: "Oberösterreich" },
  "5": { slug: "salzburg", name: "Salzburg" },
  "6": { slug: "steiermark", name: "Steiermark" },
  "7": { slug: "tirol", name: "Tirol" },
  "8": { slug: "vorarlberg", name: "Vorarlberg" },
  "9": { slug: "wien", name: "Wien" },
};

export interface RegionCopy {
  slug: string;
  /** Name used in headings, breadcrumbs, and region lists. */
  name: string;
  /** `{region}` token for the page title, including a leading space. */
  titleRegion: string;
  /** `{region}` token for the meta description. */
  descriptionRegion: string;
  /** `{region}` token for the H1. Swiss H1 templates already say "im Kanton". */
  h1Region: string;
}

/** Slug previously generated from an English region name such as "Canton of Neuchâtel". */
export function legacyRegionSlug(sourceName: string): string {
  return sourceName
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function regionCopy(country: string, code: string, sourceName: string): RegionCopy {
  if (country === "CH") {
    const canton = SWISS_CANTONS[code];
    const name = canton?.name ?? sourceName;
    const slug = canton?.slug ?? legacyRegionSlug(sourceName);
    return {
      slug,
      name,
      titleRegion: ` Kanton ${name}`,
      descriptionRegion: ` im Kanton ${name}`,
      h1Region: name,
    };
  }

  if (country === "AT") {
    const state = AUSTRIAN_STATES[code];
    const name = state?.name ?? sourceName;
    const slug = state?.slug ?? legacyRegionSlug(name);
    return {
      slug,
      name,
      titleRegion: ` ${name}`,
      descriptionRegion: ` in ${name}`,
      h1Region: name,
    };
  }

  const slug = legacyRegionSlug(sourceName);
  return {
    slug,
    name: sourceName,
    titleRegion: ` ${sourceName}`,
    descriptionRegion: ` in ${sourceName}`,
    h1Region: sourceName,
  };
}

export const CANTON_REDIRECT_YEARS = [2027, 2028] as const;

/** Cloudflare Pages redirect lines for the old English canton URLs. */
export function swissCantonRedirects(): string[] {
  const lines: string[] = [];
  for (const year of CANTON_REDIRECT_YEARS) {
    for (const canton of Object.values(SWISS_CANTONS)) {
      lines.push(
        `/de-ch/brueckentage-${year}/${canton.legacySlug}/ /de-ch/brueckentage-${year}/${canton.slug}/ 301`,
      );
    }
  }
  return lines;
}
