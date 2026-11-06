/**
 * Absolute URL with the query string and hash removed.
 * Canonical, hreflang, and og:url must be the clean path so `?d=` plan variants
 * are not treated as separate pages.
 */
export function cleanUrl(value: string, base = "https://leavemaxxing.com"): string {
  try {
    const url = new URL(value, base);
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return value.split(/[?#]/)[0] ?? value;
  }
}
