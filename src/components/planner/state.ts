import type { DayNum } from "~/lib/dates";
import type { Settings } from "~/lib/settings";
import { defaultWorkWeek } from "~/lib/weekends";

export type DayAction = "lock" | "block" | "custom" | "clear";

export type Action =
  | { type: "set"; patch: Partial<Settings> }
  | { type: "replace"; settings: Settings }
  | { type: "country"; country: string }
  | { type: "day"; day: DayNum; action: DayAction }
  | { type: "resetDays" };

const without = (list: DayNum[], day: DayNum) => list.filter((d) => d !== day);

export function reducer(s: Settings, a: Action): Settings {
  switch (a.type) {
    case "set":
      return { ...s, ...a.patch };
    case "replace":
      return a.settings;
    case "country":
      return a.country === s.country
        ? s
        : { ...s, country: a.country, region: null, workWeek: defaultWorkWeek(a.country) };
    case "day": {
      const next = {
        ...s,
        locked: without(s.locked, a.day),
        blocked: without(s.blocked, a.day),
        customOff: without(s.customOff, a.day),
      };
      if (a.action === "lock") next.locked = [...next.locked, a.day];
      if (a.action === "block") next.blocked = [...next.blocked, a.day];
      if (a.action === "custom") next.customOff = [...next.customOff, a.day];
      return next;
    }
    case "resetDays":
      return { ...s, locked: [], blocked: [], customOff: [] };
  }
}

/** Preferences worth carrying over to a different country or year. */
export function carryPreferences(target: Settings, from: Settings): Settings {
  return {
    ...target,
    budget: from.budget,
    style: from.style,
    minBreak: from.minBreak,
    maxBreak: from.maxBreak,
    months: from.months,
    yearStart: from.yearStart,
    ...(from.country === target.country ? { region: from.region, workWeek: from.workWeek } : {}),
    ...(from.country === target.country && from.year === target.year
      ? { locked: from.locked, blocked: from.blocked, customOff: from.customOff }
      : {}),
  };
}
