import { type DayNum, leaveYearRange } from "./dates";
import { type HolidayFile, resolveHolidays } from "./holidays";
import type { PlanInput } from "./planner/types";
import type { Settings } from "./settings";

/** Years of holiday data a plan needs: the December before through the January after. */
export function yearsNeeded(s: Pick<Settings, "year" | "yearStart">): number[] {
  return s.yearStart === 1 ? [s.year - 1, s.year, s.year + 1] : [s.year - 1, s.year, s.year + 1, s.year + 2];
}

/**
 * For a leave year that is already over, plan it in hindsight from its first day,
 * so past years still show what was possible.
 */
export function planningToday(s: Pick<Settings, "year" | "yearStart">, today: DayNum): DayNum {
  const range = leaveYearRange(s.year, s.yearStart);
  return range.end < today ? range.start : today;
}

export function toPlanInput(
  s: Settings,
  files: (HolidayFile | undefined)[],
  today: DayNum,
  locale?: string | null,
): PlanInput {
  return {
    year: s.year,
    yearStart: s.yearStart,
    budget: s.budget,
    holidays: resolveHolidays(files, s.region, locale),
    workWeek: s.workWeek,
    customOff: s.customOff,
    locked: s.locked,
    blocked: s.blocked,
    style: s.style,
    minBreak: s.minBreak,
    maxBreak: s.maxBreak,
    months: s.months,
    today: planningToday(s, today),
  };
}
