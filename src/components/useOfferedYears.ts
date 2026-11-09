import { useEffect, useState } from "react";
import { offeredYears } from "~/lib/years";

/**
 * Years to offer in a picker.
 * The first render uses the build year, so the server HTML and hydration match.
 * After mount, the visitor's calendar year is applied, and a stale build stops
 * offering a year that has already ended.
 */
export function useOfferedYears(built: readonly number[], buildYear: number): number[] {
  const [year, setYear] = useState(buildYear);
  useEffect(() => {
    const current = new Date().getFullYear();
    setYear((prev) => (prev === current ? prev : current));
  }, []);
  return offeredYears(built, new Date(year, 0, 1));
}
