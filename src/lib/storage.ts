import type { Settings } from "./settings";

const LAST_KEY = "lm:last:v1";
const PLANS_KEY = "lm:plans:v1";
const BEST_KEY = "lm:best:v1";

export interface SavedPlan {
  id: string;
  name: string;
  savedAt: string;
  settings: Settings;
  summary: { place: string; yearLabel: string; leaveUsed: number; daysOff: number; multiplier: number };
}

function read<T>(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const isNumArray = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number");

/** Defensive check so corrupt or old data is ignored instead of crashing the app. */
export function isSettings(v: unknown): v is Settings {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.country === "string" &&
    (s.region === null || typeof s.region === "string") &&
    typeof s.year === "number" &&
    typeof s.yearStart === "number" &&
    typeof s.budget === "number" &&
    (s.style === "weekends" || s.style === "balanced" || s.style === "long") &&
    typeof s.minBreak === "number" &&
    (s.maxBreak === null || typeof s.maxBreak === "number") &&
    isNumArray(s.months) &&
    Array.isArray(s.workWeek) &&
    s.workWeek.length === 7 &&
    isNumArray(s.locked) &&
    isNumArray(s.blocked) &&
    isNumArray(s.customOff)
  );
}

export function loadLast(): Settings | null {
  const v = read(LAST_KEY);
  return isSettings(v) ? v : null;
}

export function saveLast(s: Settings): void {
  write(LAST_KEY, s);
}

export function loadPlans(): SavedPlan[] {
  const v = read(PLANS_KEY);
  if (!Array.isArray(v)) return [];
  return v.filter(
    (p): p is SavedPlan =>
      !!p && typeof p.id === "string" && typeof p.name === "string" && isSettings(p.settings) && !!p.summary,
  );
}

export function savePlans(plans: SavedPlan[]): boolean {
  return write(PLANS_KEY, plans);
}

export function addPlan(plan: Omit<SavedPlan, "id" | "savedAt">): SavedPlan | null {
  const saved: SavedPlan = {
    ...plan,
    id: Math.random().toString(36).slice(2, 10),
    savedAt: new Date().toISOString(),
  };
  return savePlans([saved, ...loadPlans()]) ? saved : null;
}

/** Highest multiplier seen per country-year, used to celebrate a new best. */
export function recordBest(key: string, multiplier: number): boolean {
  const v = read(BEST_KEY);
  const best = v && typeof v === "object" ? (v as Record<string, number>) : {};
  const prev = best[key] ?? 0;
  if (multiplier > prev + 0.05) {
    best[key] = multiplier;
    write(BEST_KEY, best);
    return prev > 0;
  }
  return false;
}
