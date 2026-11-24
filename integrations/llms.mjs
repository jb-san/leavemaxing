// Writes dist/llms.txt and dist/llms-full.txt after the build (https://llmstxt.org).
//
// The page list is the build's own: every page Astro rendered, kept or dropped with the
// sitemap's rule (inSitemap in src/data/sitemap-config.ts). Titles and descriptions are read
// back from the built HTML. So both files change whenever the routes or the copy do.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inSitemap } from "../src/data/sitemap-config.ts";
import { BUILD_DATE } from "../src/lib/buildDate.ts";

const SITE = "https://leavemaxxing.com";

const LOCALE_HOME = /^\/([a-z]{2}-[a-z]{2})\/$/;
const BRIDGE = /^\/([a-z]{2}-[a-z]{2})\/[a-z0-9-]+-(\d{4})\/$/;
const BRIDGE_REGION = /^\/([a-z]{2}-[a-z]{2})\/[a-z0-9-]+-(\d{4})\/[a-z0-9-]+\/$/;
const COUNTRY = /^\/([a-z]{2})\/$/;
const COUNTRY_YEAR = /^\/([a-z]{2})\/(\d{4})\/$/;
const BEST = /^\/(?:[a-z]{2}-[a-z]{2}\/)?best\/(\d{4})\/$/;
const ABOUT = /^\/(?:[a-z]{2}-[a-z]{2}\/)?about\/$/;

const decode = (text) =>
  text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

function readMeta(out, path) {
  try {
    const html = readFileSync(join(out, path, "index.html"), "utf8");
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? path;
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
    return { title: decode(title), description: decode(description) };
  } catch {
    return { title: path, description: "" };
  }
}

const link = (page, withDescription = false) =>
  `- [${page.title}](${SITE}${page.path})${withDescription && page.description ? `: ${page.description}` : ""}`;

/** @param {Array<{ path: string; title: string; description: string }>} pages */
function llmsTxt(pages, years) {
  const by = (re) => pages.filter((p) => re.test(p.path));
  const localeHomes = by(LOCALE_HOME);
  const bridge = by(BRIDGE);
  const bridgeRegions = by(BRIDGE_REGION);
  const bridgeYears = [...new Set(bridge.map((p) => Number(BRIDGE.exec(p.path)?.[2])))].sort();
  const countries = by(COUNTRY);
  const countryYears = by(COUNTRY_YEAR);
  const best = by(BEST);
  const about = by(ABOUT);
  const home = pages.find((p) => p.path === "/");
  const dataYear = years.includes(2027) ? 2027 : years[0];
  const lines = [
    "# leavemaxxing",
    "",
    `> Free leave planner. Pick a country and how many leave days you have, and leavemaxxing finds the workdays that join weekends and public holidays into the longest breaks (bridge days). It covers 200+ countries and their regions, in ${localeHomes.length + 1} locales (English plus ${localeHomes.length} localized sites). No account: plans run in the browser.`,
    "",
    `Generated ${BUILD_DATE} from the same page list as the sitemap (${SITE}/sitemap-index.xml). Every number on the site is computed at build time from the holiday data; pages show the date they were last updated, which is also their schema.org dateModified.`,
    "",
    "## How the planner works",
    "",
    "- Public holidays come from the open source date-holidays project (CC BY 3.0) and are rebuilt every week. Regional holidays apply when a region is picked.",
    "- Every day of the leave year is a day off (weekend, public holiday, or a day off the user adds) or a workday that could be taken as leave.",
    "- The planner is exact, not a heuristic: a dynamic programme checks every way of spending the leave days and keeps the best plan for the chosen style. Styles: `weekends` (many 3 to 5 day breaks), `balanced` (week-long breaks, the default) and `long` (one big trip). Leave is spread across the year.",
    "- A bridge day is a working day in a gap of one or two working days between a public holiday and the weekend (or between two holidays). Taking it joins the holiday to the weekend.",
    "- Page numbers use the balanced style, the national holidays (or the page's region), plans that start on the build date for the current year, and a default of 20 leave days. Localized bridge-day pages use their country's usual allowance (for example 25 in Sweden and Austria).",
    "",
    "## Key pages",
    "",
    ...(home ? [link(home, true)] : []),
    ...localeHomes.map((p) => link(p)),
    "",
    ...bridgeYears.flatMap((year) => [
      `## Bridge-day pages ${year}, one per locale`,
      "",
      ...bridge.filter((p) => BRIDGE.exec(p.path)?.[2] === String(year)).map((p) => link(p, true)),
      "",
    ]),
    `Regional bridge-day pages (${bridgeRegions.length}) follow the pattern /{locale}/{slug}-{year}/{region}/, for example ${SITE}${bridgeRegions.find((p) => p.path.startsWith("/de-de/"))?.path ?? bridgeRegions[0]?.path ?? "/"}. They are listed in llms-full.txt and the sitemap.`,
    "",
    "## Country pages",
    "",
    `Each country has a planner hub at /{cc}/ and a page per year at /{cc}/{year}/ (cc is the lowercase ISO 3166-1 code). Indexed hubs (${countries.length}):`,
    "",
    ...countries.map((p) => link(p)),
    "",
    `Country-year pages in the sitemap: ${countryYears.length}, for example ${SITE}/de/2027/ and ${SITE}/se/2027/.`,
    "",
    "## Rankings",
    "",
    ...best.map((p) => link(p)),
    "",
    "## About",
    "",
    ...about.map((p) => link(p)),
    "",
    "## Data (JSON)",
    "",
    `- [Index of every file](${SITE}/data/best/index.json)`,
    `- ${SITE}/data/best/{cc}/{year}.json: best bridges and the recommended plan for one country and year (${years.join(", ")}), for example ${SITE}/data/best/de/${dataYear}.json. Fields: country, year, region (null), generatedAt, holidays (count), publicHolidays, bridgeDays, bestBreaks (start, end, leaveDays, leaveDates, daysOff, efficiency, holidays), recommendedPlan (leaveDays, leaveUsed, daysOff, multiplier, longestBreak, breaks).`,
    `- ${SITE}/data/{cc}/{year}.json: the raw public holidays the planner uses.`,
    "",
    "## Deep links",
    "",
    "The planner opens with a plan from URL parameters, on the home page, country pages and bridge-day pages:",
    "",
    `- ${SITE}/?country=DE&region=BY&year=2027&days=25&style=long`,
    `- Keys: country (ISO code), region (region code, for example BY), year, days (leave days, 0 to 80), style (weekends, balanced or long), months (preferred months, for example 7.8), min and max (shortest and longest break). The planner's own share links use short keys (d, r, s, m, ys, min, max, ww, lk, bk, co) with the country and year in the path, for example ${SITE}/de/2027/?d=25&r=BY&s=long. When both forms are given, the short key wins.`,
    "",
    "## Optional",
    "",
    `- [Every indexed page with its title and description](${SITE}/llms-full.txt)`,
    `- [Sitemap](${SITE}/sitemap-index.xml)`,
    "",
  ];
  return lines.join("\n");
}

function llmsFull(pages) {
  return [
    "# leavemaxxing: every indexed page",
    "",
    `> The pages in the sitemap with their titles and descriptions, generated ${BUILD_DATE}. See ${SITE}/llms.txt for what the site is and how it plans.`,
    "",
    ...pages.map((p) => link(p, true)),
    "",
  ].join("\n");
}

/** @returns {import("astro").AstroIntegration} */
export default function llms() {
  return {
    name: "leavemaxxing-llms",
    hooks: {
      "astro:build:done": ({ dir, pages, logger }) => {
        const out = fileURLToPath(dir);
        const paths = [
          ...new Set(
            pages
              .map((page) => `/${page.pathname}`.replace(/\/+/g, "/"))
              .filter((path) => path.endsWith("/") && !path.startsWith("/404")),
          ),
        ]
          .filter((path) => inSitemap(`${SITE}${path}`))
          .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
        const list = paths.map((path) => ({ path, ...readMeta(out, path) }));
        let years = [];
        try {
          years = JSON.parse(readFileSync(join(out, "data/best/index.json"), "utf8")).years ?? [];
        } catch {
          logger.warn("dist/data/best/index.json is missing; llms.txt lists no data years");
        }
        writeFileSync(join(out, "llms.txt"), llmsTxt(list, years));
        writeFileSync(join(out, "llms-full.txt"), llmsFull(list));
        logger.info(`llms.txt and llms-full.txt written (${list.length} pages)`);
      },
    },
  };
}
