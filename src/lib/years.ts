/**
 * Years a person can choose in a planner.
 *
 * The static build still publishes every year in `meta.years` (including past
 * ones) so existing URLs keep working. Pickers offer a shorter window: the
 * current calendar year and the two that follow. That window is computed from
 * the date, so it rolls forward each January.
 *
 * Pages render the window for the build date. `useOfferedYears` applies the
 * same rule again in the browser, which drops a year that ended after the
 * build and reveals the next one the build already generated.
 */

/** Current year plus the two after it. */
export const PLANNER_YEAR_SPAN = 3;

/** Locale homes already switch to next year from October (month index 9). */
export const LATE_YEAR_MONTH = 9;

export type YearPolicy = "calendar" | "late" | "next";

/** The year a fresh visit should open on, before snapping to years the build has. */
export function preferredPlanYear(now = new Date(), policy: YearPolicy = "calendar"): number {
  const year = now.getFullYear();
  if (policy === "next") return year + 1;
  if (policy === "late" && now.getMonth() >= LATE_YEAR_MONTH) return year + 1;
  return year;
}

/**
 * Years to show from a build-time list.
 * Drops anything before this year, and anything more than two years ahead.
 */
export function offeredYears(built: readonly number[], now = new Date()): number[] {
  const start = now.getFullYear();
  const end = start + PLANNER_YEAR_SPAN - 1;
  return [...new Set(built.filter((year) => year >= start && year <= end))].sort((a, b) => a - b);
}

/** Preferred year, or the closest year the picker can actually show. */
export function selectPlanYear(
  offered: readonly number[],
  now = new Date(),
  policy: YearPolicy = "calendar",
): number {
  const preferred = preferredPlanYear(now, policy);
  if (offered.includes(preferred)) return preferred;
  const current = now.getFullYear();
  if (preferred !== current && offered.includes(current)) return current;
  const sorted = [...offered].sort((a, b) => a - b);
  const first = sorted[0];
  if (first === undefined) return preferred;
  return sorted.reduce(
    (best, year) => (Math.abs(year - preferred) < Math.abs(best - preferred) ? year : best),
    first,
  );
}

/**
 * Year named by the page URL, when the page is about that year.
 * `/se/2025/` and `/de-de/brueckentage-2027/bayern/` both count; `/se/` does not.
 */
export function pinnedYear(pathname: string): number | null {
  const slug = /-(\d{4})(?:\/|$)/.exec(pathname);
  if (slug?.[1]) return Number(slug[1]);
  const segment = /\/(\d{4})(?:\/|$)/.exec(pathname);
  if (segment?.[1]) return Number(segment[1]);
  return null;
}

/**
 * Keep a year the URL asked for. Otherwise, if the current choice is already
 * over or outside the picker, move to the year a fresh visit would open on.
 */
export function correctPlanYear(
  year: number,
  options: { offered: readonly number[]; pinned: number | null; now?: Date; policy?: YearPolicy },
): number {
  if (options.pinned !== null) return options.pinned;
  const now = options.now ?? new Date();
  if (year >= now.getFullYear() && options.offered.includes(year)) return year;
  return selectPlanYear(options.offered, now, options.policy ?? "calendar");
}

/**
 * A shared link names a year. Keep it when the build has that year's data,
 * including years the picker no longer offers. Otherwise use `fallback`.
 */
export function referencedYear(requested: number | null, built: readonly number[], fallback: number): number {
  if (requested !== null && Number.isInteger(requested) && built.includes(requested)) return requested;
  return fallback;
}
