/**
 * Count the number of localized bridge-day pages that will be generated
 */

import { countryByCode } from "../src/data/index.js";
import { locales, isRegionalCountry } from "../src/data/locales.js";

const years = [2027, 2028];

let totalPages = 0;
const pagesByLocale: Record<string, { national: number; regional: number; total: number }> = {};

for (const [localeCode, locale] of Object.entries(locales)) {
  const country = countryByCode.get(locale.country);
  if (!country) continue;

  const nationalPages = years.length; // One page per year
  let regionalPages = 0;

  if (isRegionalCountry(locale.country) && country.regional) {
    const regionCount = Object.keys(country.regions).length;
    regionalPages = regionCount * years.length;
  }

  const localeTotal = nationalPages + regionalPages;
  totalPages += localeTotal;

  pagesByLocale[localeCode] = {
    national: nationalPages,
    regional: regionalPages,
    total: localeTotal,
  };
}

console.log("\n=== Localized Bridge-Day Pages Count ===\n");

for (const [localeCode, counts] of Object.entries(pagesByLocale)) {
  const locale = locales[localeCode];
  if (!locale) continue;
  
  const country = countryByCode.get(locale.country);
  if (!country) continue;

  console.log(`${locale.lang.toUpperCase()} - ${country.name} (${localeCode})`);
  console.log(`  National pages: ${counts.national}`);
  if (counts.regional > 0) {
    const regionCount = counts.regional / years.length;
    console.log(`  Regional pages: ${counts.regional} (${regionCount} regions × ${years.length} years)`);
  }
  console.log(`  Total: ${counts.total}`);
  console.log();
}

console.log(`TOTAL PAGES: ${totalPages}\n`);

// List example URLs
console.log("=== Example URLs ===\n");
console.log("National pages:");
console.log("  /de-de/brueckentage-2027/");
console.log("  /de-at/fenstertage-2027/");
console.log("  /sv-se/klamdagar-2027/");
console.log("  /nb-no/inneklemte-dager-2027/");
console.log("  /pl-pl/dlugie-weekendy-2027/");
console.log();

console.log("Regional pages:");
console.log("  /de-de/brueckentage-2027/bayern/");
console.log("  /de-de/brueckentage-2027/nordrhein-westfalen/");
console.log("  /de-at/fenstertage-2027/wien/");
console.log("  /de-ch/brueckentage-2027/zuerich/");
console.log();
