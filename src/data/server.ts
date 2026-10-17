import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { localToday } from "~/lib/dates";
import type { HolidayFile } from "~/lib/holidays";
import { toPlanInput, yearsNeeded } from "~/lib/planInput";
import { plan } from "~/lib/planner/plan";
import type { Settings } from "~/lib/settings";

const dataDir = join(process.cwd(), "public/data");
const cache = new Map<string, HolidayFile | undefined>();

/** Build-time read of a generated holiday file. */
export function readHolidayFile(country: string, year: number): HolidayFile | undefined {
  const key = `${country}/${year}`;
  if (!cache.has(key)) {
    const path = join(dataDir, country.toLowerCase(), `${year}.json`);
    cache.set(key, existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as HolidayFile) : undefined);
  }
  return cache.get(key);
}

export function filesFor(s: Settings): HolidayFile[] {
  return yearsNeeded(s)
    .map((y) => readHolidayFile(s.country, y))
    .filter((f): f is HolidayFile => !!f);
}

export const buildToday = localToday();

/** The plan the page ships with, before the visitor changes anything. */
export function serverPlan(s: Settings) {
  const files = filesFor(s);
  const input = toPlanInput(
    s,
    yearsNeeded(s).map((y) => files.find((f) => f.year === y)),
    buildToday,
  );
  return { input, plan: plan(input), files };
}
