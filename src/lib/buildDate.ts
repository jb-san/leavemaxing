/** Calendar day of this build (UTC). Pages and the sitemap share it. */
export const BUILD_DATE = new Date().toISOString().slice(0, 10);

export function formatBuildDate(locale: string, iso = BUILD_DATE): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1)));
}
