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

/**
 * The link a plan is shared with: the plan page, the leave days, and every other setting that
 * differs from the defaults. `d` is always there, even at the default, because the page a link
 * opens may have a different default (localized pages) and because link previews read it
 * (functions/_middleware.ts). `path` is the page to open, the English country page by default.
 */
export function shareUrl(
  s: Settings,
  origin = "https://leavemaxxing.com",
  path = planPath(s.country, s.year),
): string {
  const q = new URLSearchParams({ d: String(s.budget) });
  for (const [key, value] of toQuery(s)) if (key !== "d") q.set(key, value);
  return `${origin}${path}?${q}`;
}

const int = (v: string | null, min: number, max: number): number | null => {
  if (v === null || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
};

/**
 * Readable deep-link keys and the share keys they stand for, so `?region=BY&days=25&style=long`
 * plans the same as `?r=BY&d=25&s=long`. When a link has both, the share key wins: it is what the
 * planner writes, and what link previews read (functions/_middleware.ts). `min` and `max` are
 * already readable and have no alias.
 */
export const LINK_ALIASES: Readonly<Record<string, string>> = {
  region: "r",
  days: "d",
  style: "s",
  months: "m",
  yearStart: "ys",
};

/** Deep-link keys that pick the page rather than a setting on it. */
export const LINK_PAGE_KEYS = ["country", "year"] as const;

/** The query in share format: aliases become share keys (share keys win), and `country`/`year` are dropped. */
export function normalizeQuery(q: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of q) {
    if ((LINK_PAGE_KEYS as readonly string[]).includes(key)) continue;
    const short = LINK_ALIASES[key];
    if (short === undefined) out.append(key, value);
    else if (!q.has(short) && !out.has(short)) out.set(short, value);
  }
  return out;
}

/**
 * Apply query parameters on top of `base`. Unknown or invalid values are ignored
 * and reported in `invalid` so the UI can say so. Accepts the share format and the
 * readable aliases in `LINK_ALIASES`.
 */
export function fromQuery(
  query: URLSearchParams,
  base: Settings,
  regions: Record<string, string>,
): { settings: Settings; invalid: string[]; touched: boolean } {
  const q = normalizeQuery(query);
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
    const code = v in regions ? v : Object.keys(regions).find((k) => k.toLowerCase() === v.toLowerCase());
    if (code === undefined) return false;
    s.region = code;
    return true;
  });
  take("d", (v) => {
    const n = int(v, 0, MAX_BUDGET);
    if (n === null) return false;
    s.budget = n;
    return true;
  });
  take("s", (v) => {
    const style = v.toLowerCase() as Style;
    if (!STYLES.includes(style)) return false;
    s.style = style;
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

/**
 * A deep link: `?country=DE&region=BY&year=2027&days=25&style=long`, or the share format
 * (`?d=25&r=BY&s=long`) on a page whose path names the country and year. `country` and `year`
 * are optional and default to `base`; a different country starts from that country's defaults
 * (keeping the leave days of `base`), a different year drops the picked days, which belong to
 * a year. Everything else goes through `fromQuery`.
 *
 * `year` is returned when the link asked for a valid one, so the planner can keep it even if the
 * picker no longer offers it.
 */
export function fromLink(
  q: URLSearchParams,
  base: Settings,
  options: {
    /** Regions of a country, or undefined when the country doesn't exist. */
    regionsOf: (country: string) => Record<string, string> | undefined;
    /** Years with holiday data. */
    years: readonly number[];
  },
): { settings: Settings; invalid: string[]; touched: boolean; year: number | null } {
  const invalid: string[] = [];
  let country = base.country;
  let year: number | null = null;
  const cc = q.get("country");
  if (cc !== null) {
    const code = cc.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && options.regionsOf(code)) country = code;
    else invalid.push("country");
  }
  const y = q.get("year");
  if (y !== null) {
    const n = int(y.trim(), 1000, 9999);
    if (n !== null && options.years.includes(n)) year = n;
    else invalid.push("year");
  }
  const targetYear = year ?? base.year;
  let start = base;
  if (country !== base.country) start = { ...defaultSettings(country, targetYear), budget: base.budget };
  else if (targetYear !== base.year)
    start = { ...base, year: targetYear, locked: [], blocked: [], customOff: [] };
  const r = fromQuery(q, start, options.regionsOf(country) ?? {});
  return {
    settings: r.settings,
    invalid: [...invalid, ...r.invalid],
    touched: r.touched || cc !== null || y !== null,
    year,
  };
}
