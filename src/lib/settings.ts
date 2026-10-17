import { type DayNum, dayNum } from "./dates";
import type { Style } from "./planner/types";
import { defaultWorkWeek, sameWeek } from "./weekends";

export interface Settings {
  country: string;
  region: string | null;
  year: number;
  yearStart: number;
  budget: number;
  style: Style;
  minBreak: number;
  maxBreak: number | null;
  months: number[];
  /** Index 0 = Monday, true = working day. */
  workWeek: boolean[];
  locked: DayNum[];
  blocked: DayNum[];
  customOff: DayNum[];
}

export const DEFAULT_BUDGET = 20;
export const MAX_BUDGET = 80;
const STYLES: Style[] = ["weekends", "balanced", "long"];

export function defaultSettings(country: string, year: number): Settings {
  return {
    country,
    region: null,
    year,
    yearStart: 1,
    budget: DEFAULT_BUDGET,
    style: "balanced",
    minBreak: 3,
    maxBreak: null,
    months: [],
    workWeek: defaultWorkWeek(country),
    locked: [],
    blocked: [],
    customOff: [],
  };
}

/** Days are written relative to 1 Jan of the plan year, base 36, with ranges: `3-7.2c`. */
export function encodeDays(days: DayNum[], year: number): string {
  const base = dayNum(year, 1, 1);
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] as number) + 1) j++;
    const a = ((sorted[i] as number) - base).toString(36);
    parts.push(j > i ? `${a}-${((sorted[j] as number) - base).toString(36)}` : a);
    i = j + 1;
  }
  return parts.join(".");
}

export function decodeDays(text: string, year: number): DayNum[] | null {
  const base = dayNum(year, 1, 1);
  const out: DayNum[] = [];
  for (const part of text.split(".")) {
    if (!part) continue;
    const m = /^(-?[0-9a-z]+)(?:-(-?[0-9a-z]+))?$/.exec(part);
    if (!m) return null;
    const a = Number.parseInt(m[1] as string, 36);
    const b = m[2] ? Number.parseInt(m[2], 36) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a || b - a > 800 || Math.abs(a) > 1200) return null;
    for (let d = a; d <= b; d++) out.push(base + d);
  }
  return out;
}

/** Query string for everything except country and year (those live in the path). */
export function toQuery(s: Settings): URLSearchParams {
  const q = new URLSearchParams();
  if (s.region) q.set("r", s.region);
  if (s.budget !== DEFAULT_BUDGET) q.set("d", String(s.budget));
  if (s.style !== "balanced") q.set("s", s.style);
  if (s.minBreak !== 3) q.set("min", String(s.minBreak));
  if (s.maxBreak !== null) q.set("max", String(s.maxBreak));
  if (s.months.length) q.set("m", [...s.months].sort((a, b) => a - b).join("."));
  if (s.yearStart !== 1) q.set("ys", String(s.yearStart));
  if (!sameWeek(s.workWeek, defaultWorkWeek(s.country)))
    q.set("ww", s.workWeek.map((w) => (w ? "1" : "0")).join(""));
  if (s.locked.length) q.set("lk", encodeDays(s.locked, s.year));
  if (s.blocked.length) q.set("bk", encodeDays(s.blocked, s.year));
  if (s.customOff.length) q.set("co", encodeDays(s.customOff, s.year));
  return q;
}

export function planPath(country: string, year: number): string {
  return `/${country.toLowerCase()}/${year}/`;
}

export function shareUrl(s: Settings, origin = "https://leavemaxxing.com"): string {
  const q = toQuery(s).toString();
  return `${origin}${planPath(s.country, s.year)}${q ? `?${q}` : ""}`;
}

const int = (v: string | null, min: number, max: number): number | null => {
  if (v === null || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
};

/**
 * Apply query parameters on top of `base`. Unknown or invalid values are ignored
 * and reported in `invalid` so the UI can say so.
 */
export function fromQuery(
  q: URLSearchParams,
  base: Settings,
  regions: Record<string, string>,
): { settings: Settings; invalid: string[]; touched: boolean } {
  const s: Settings = { ...base };
  const invalid: string[] = [];
  let touched = false;
  const take = (key: string, apply: (v: string) => boolean) => {
    const v = q.get(key);
    if (v === null) return;
    touched = true;
    if (!apply(v)) invalid.push(key);
  };

  take("r", (v) => {
    if (!(v in regions)) return false;
    s.region = v;
    return true;
  });
  take("d", (v) => {
    const n = int(v, 0, MAX_BUDGET);
    if (n === null) return false;
    s.budget = n;
    return true;
  });
  take("s", (v) => {
    if (!STYLES.includes(v as Style)) return false;
    s.style = v as Style;
    return true;
  });
  take("min", (v) => {
    const n = int(v, 1, 30);
    if (n === null) return false;
    s.minBreak = n;
    return true;
  });
  take("max", (v) => {
    const n = int(v, 2, 60);
    if (n === null) return false;
    s.maxBreak = n;
    return true;
  });
  take("m", (v) => {
    const ms = v.split(".").map((x) => int(x, 1, 12));
    if (ms.some((x) => x === null)) return false;
    s.months = [...new Set(ms as number[])];
    return true;
  });
  take("ys", (v) => {
    const n = int(v, 1, 12);
    if (n === null) return false;
    s.yearStart = n;
    return true;
  });
  take("ww", (v) => {
    if (!/^[01]{7}$/.test(v)) return false;
    s.workWeek = [...v].map((c) => c === "1");
    return true;
  });
  for (const [key, field] of [
    ["lk", "locked"],
    ["bk", "blocked"],
    ["co", "customOff"],
  ] as const) {
    take(key, (v) => {
      const days = decodeDays(v, s.year);
      if (!days) return false;
      s[field] = days;
      return true;
    });
  }
  if (s.maxBreak !== null && s.maxBreak < s.minBreak) {
    s.maxBreak = null;
    invalid.push("max");
  }
  return { settings: s, invalid, touched };
}
