/**
 * Countries to include in sitemap for indexability focus.
 * Wave 1: Top markets with strong demand for bridge-day planners.
 * Wave 2: Secondary markets with good potential.
 *
 * All countries remain browsable; this controls sitemap and robots indexing.
 */

export const SITEMAP_PRIORITY_COUNTRIES = new Set([
  // Wave 1: Primary markets (DACH, Nordics, PL, NL, UK/IE, US, CA, AU, NZ)
  "DE", // Germany
  "AT", // Austria
  "CH", // Switzerland
  "SE", // Sweden
  "NO", // Norway
  "DK", // Denmark
  "FI", // Finland
  "PL", // Poland
  "NL", // Netherlands
  "GB", // United Kingdom
  "IE", // Ireland
  "US", // United States
  "CA", // Canada
  "AU", // Australia
  "NZ", // New Zealand

  // Wave 2: Secondary markets
  "FR", // France
  "BE", // Belgium
  "ES", // Spain
  "IT", // Italy
  "PT", // Portugal
  "CZ", // Czech Republic

  // Additional high-value markets
  "SG", // Singapore
  "JP", // Japan
  "KR", // South Korea
  "HK", // Hong Kong
  "IN", // India
  "BR", // Brazil
  "MX", // Mexico
  "AR", // Argentina
  "ZA", // South Africa
  "IL", // Israel
  "AE", // UAE
  "SA", // Saudi Arabia
  "TR", // Turkey
  "GR", // Greece
  "RO", // Romania
  "HU", // Hungary
  "SK", // Slovakia
  "SI", // Slovenia
  "HR", // Croatia
  "BG", // Bulgaria
  "RS", // Serbia
]);

/**
 * Years to include in sitemap. Focus on current and next 2 years.
 * Past years get noindex.
 */
export const SITEMAP_YEARS = [2026, 2027, 2028];

/**
 * Check if a country should be included in sitemap
 */
export function shouldIndexCountry(countryCode: string): boolean {
  return SITEMAP_PRIORITY_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Check if a year should be included in sitemap
 */
export function shouldIndexYear(year: number): boolean {
  return SITEMAP_YEARS.includes(year);
}

/**
 * Determine if a page should be indexed based on URL
 */
export function shouldIndexPage(url: string): boolean {
  const match = url.match(/\/([a-z]{2})\/(\d{4})\//);
  if (match) {
    const [, cc, yearStr] = match;
    const year = parseInt(yearStr, 10);
    return shouldIndexCountry(cc) && shouldIndexYear(year);
  }

  const hubMatch = url.match(/\/([a-z]{2})\/$/);
  if (hubMatch) {
    const [, cc] = hubMatch;
    return shouldIndexCountry(cc);
  }

  return true;
}
