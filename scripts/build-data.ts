/**
 * Generates holiday data at build time:
 *   public/data/{cc}/{year}.json        one file per country and year
 *   src/data/generated/countries.json   country list with regions
 *   src/data/generated/meta.json        which years were built
 *   src/data/generated/best-{year}.json build-time ranking for /best/{year}/
 *
 * Years: last year through 5 years ahead, plus one extra year so plans can run
 * past New Year. Re-running with the same inputs is skipped (see .stamp).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fromIso } from "../src/lib/dates";
import {
  type CountryInfo,
  type DataMeta,
  flagEmoji,
  type HolidayFile,
  resolveHolidays,
} from "../src/lib/holidays";
import { plan } from "../src/lib/planner/plan";
import { defaultWorkWeek } from "../src/lib/weekends";
import { extractCountryYear, listCountries, listRegions } from "./lib/extract";

const root = new URL("..", import.meta.url).pathname;
const publicData = join(root, "public/data");
const generated = join(root, "src/data/generated");

const thisYear = new Date().getFullYear();
const years = Array.from({ length: 7 }, (_, i) => thisYear - 1 + i);
const extraYear = thisYear + 6;
export const BEST_BUDGETS = [10, 15, 20, 25, 30];
const bestYears = [thisYear, thisYear + 1];

const pkg = JSON.parse(readFileSync(join(root, "node_modules/date-holidays/package.json"), "utf8"));
const stamp = JSON.stringify({ v: pkg.version, years, extraYear, script: 5 });
const stampFile = join(publicData, ".stamp");
if (
  existsSync(stampFile) &&
  readFileSync(stampFile, "utf8") === stamp &&
  existsSync(join(generated, "meta.json"))
) {
  console.log("holiday data is up to date");
  process.exit(0);
}

const started = Date.now();
mkdirSync(generated, { recursive: true });
const countries: CountryInfo[] = [];
const files = new Map<string, HolidayFile>();

for (const [code, name] of Object.entries(listCountries()).sort((a, b) => a[1].localeCompare(b[1]))) {
  let regions: Record<string, string> = {};
  try {
    regions = listRegions(code);
  } catch {
    regions = {};
  }
  const regionCodes = Object.keys(regions);
  let regional = false;
  let ok = true;
  for (const year of [...years, extraYear]) {
    try {
      const file = extractCountryYear(code, year, regionCodes);
      if (file.holidays.some((h) => h.regions || h.national === false)) regional = true;
      const dir = join(publicData, code.toLowerCase());
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${year}.json`), JSON.stringify(file));
      files.set(`${code}/${year}`, file);
    } catch (err) {
      console.warn(`skipping ${code}: ${(err as Error).message}`);
      ok = false;
      break;
    }
  }
  if (ok) countries.push({ code, name, flag: flagEmoji(code), regions, regional });
}

writeFileSync(join(generated, "countries.json"), JSON.stringify(countries));
const meta: DataMeta = { years, extraYear, generatedAt: new Date().toISOString() };
writeFileSync(join(generated, "meta.json"), JSON.stringify(meta));
console.log(`wrote ${files.size} holiday files for ${countries.length} countries`);

// Build-time ranking: where does a leave budget go furthest?
for (const year of bestYears) {
  // Ukraine's public holidays are working days under martial law, so a days-off rank would mislead.
  const rows = countries
    .filter((c) => c.code !== "UA")
    .map((c) => {
      const holidays = resolveHolidays(
        [
          files.get(`${c.code}/${year - 1}`),
          files.get(`${c.code}/${year}`),
          files.get(`${c.code}/${year + 1}`),
        ],
        null,
      );
      const results: Record<number, { daysOff: number; multiplier: number; longest: number }> = {};
      for (const budget of BEST_BUDGETS) {
        const p = plan({
          year,
          yearStart: 1,
          budget,
          holidays,
          workWeek: defaultWorkWeek(c.code),
          customOff: [],
          locked: [],
          blocked: [],
          style: "balanced",
          minBreak: 3,
          maxBreak: null,
          months: [],
          today: fromIso(`${year}-01-01`),
        });
        results[budget] = {
          daysOff: p.stats.daysOff,
          multiplier: Math.round(p.stats.multiplier * 100) / 100,
          longest: p.stats.longest,
        };
      }
      const publicHolidays = holidays.filter(
        (h) => h.day >= fromIso(`${year}-01-01`) && h.day <= fromIso(`${year}-12-31`),
      );
      return {
        code: c.code,
        name: c.name,
        flag: c.flag,
        holidays: new Set(publicHolidays.map((h) => h.day)).size,
        results,
      };
    });
  writeFileSync(join(generated, `best-${year}.json`), JSON.stringify({ year, budgets: BEST_BUDGETS, rows }));
  console.log(`ranked ${rows.length} countries for ${year}`);
}

writeFileSync(stampFile, stamp);
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
