/**
 * Bridge-day specific helpers and computations.
 * Calculates optimal bridge-day strategies for different leave budgets.
 */

import { formatRange as formatDateRange, fromIso, parts, toIso } from "./dates";
import type { HolidayFile } from "./holidays";
import { toPlanInput, yearsNeeded } from "./planInput";
import { plan } from "./planner/plan";
import type { Break } from "./planner/types";
import type { Settings } from "./settings";
import { defaultWorkWeek } from "./weekends";

export interface BridgePlan {
  /** Number of leave days used */
  budget: number;
  /** Total days off achieved */
  daysOff: number;
  /** Multiplier (daysOff / budget) */
  multiplier: number;
  /** Longest continuous break */
  longest: number;
  /** All breaks with leave in this plan */
  breaks: Break[];
}

export interface BridgeDayOption {
  /** The holiday this bridge day is associated with */
  holiday: string;
  /** Date of the holiday */
  holidayDate: string;
  /** The bridge day(s) to take */
  bridgeDays: string[];
  /** Total days off including weekend and holiday */
  totalDays: number;
  /** Start and end of the break period */
  period: {
    start: string;
    end: string;
  };
}

/**
 * Calculate optimal bridge plans for multiple budgets.
 * Returns plans for 1, 3, 5, 10, and custom budgets.
 */
export function calculateBridgePlans(
  country: string,
  region: string | null,
  year: number,
  files: HolidayFile[],
  customBudgets?: number[],
): BridgePlan[] {
  const budgets = customBudgets || [1, 3, 5, 10, 20];
  const today = fromIso(`${year}-01-01`);

  return budgets.map((budget) => {
    const settings: Settings = {
      country,
      region,
      year,
      yearStart: 1,
      budget,
      style: "balanced",
      minBreak: 3,
      maxBreak: null,
      months: [],
      workWeek: defaultWorkWeek(country),
      locked: [],
      blocked: [],
      customOff: [],
    };

    const input = toPlanInput(
      settings,
      yearsNeeded(settings).map((y) => files.find((f) => f.year === y)),
      today,
    );

    const result = plan(input);
    const breaksWithLeave = result.breaks.filter((b) => b.leave > 0);

    return {
      budget,
      daysOff: result.stats.daysOff,
      multiplier: result.stats.multiplier,
      longest: result.stats.longest,
      breaks: breaksWithLeave,
    };
  });
}

/**
 * Find the best individual bridge-day opportunities (single-day leave for max gain).
 */
export function findBestBridgeDays(holidays: HolidayFile, _workWeek: boolean[]): BridgeDayOption[] {
  const options: BridgeDayOption[] = [];

  for (const holiday of holidays.holidays) {
    const holidayDate = fromIso(holiday.date);
    const { year, month, day } = parts(holidayDate);
    const holidayDay = new Date(year, month - 1, day).getDay();

    // Check if taking Friday before or Monday after creates a long weekend
    const isoWeekday = holidayDay === 0 ? 7 : holidayDay; // ISO: Mon=1, Sun=7

    // Holiday on Thursday -> bridge Friday
    if (isoWeekday === 4) {
      const friday = fromIso(holiday.date);
      options.push({
        holiday: holiday.name,
        holidayDate: holiday.date,
        bridgeDays: [toIso(friday + 1)],
        totalDays: 4,
        period: {
          start: holiday.date,
          end: toIso(friday + 3),
        },
      });
    }

    // Holiday on Tuesday -> bridge Monday
    if (isoWeekday === 2) {
      const monday = fromIso(holiday.date);
      options.push({
        holiday: holiday.name,
        holidayDate: holiday.date,
        bridgeDays: [toIso(monday - 1)],
        totalDays: 4,
        period: {
          start: toIso(monday - 3),
          end: holiday.date,
        },
      });
    }
  }

  return options;
}

/**
 * Format a break for display with dates and leave info.
 */
export function formatBreak(br: Break): {
  dates: string;
  leaveDays: number;
  totalDays: number;
  efficiency: string;
  holidays: string[];
} {
  return {
    dates: formatDateRange(br.start, br.end),
    leaveDays: br.leave,
    totalDays: br.length,
    efficiency: `${(br.length / br.leave).toFixed(1)}×`,
    holidays: br.holidays.map((h) => h.name),
  };
}

/**
 * Get a description of the year's bridge-day quality.
 */
export function getYearQuality(holidays: HolidayFile): {
  rating: "excellent" | "good" | "average" | "poor";
  weekendHolidays: number;
  weekdayHolidays: number;
  description: string;
} {
  let weekendCount = 0;
  let weekdayCount = 0;

  for (const holiday of holidays.holidays) {
    if (holiday.national === false) continue; // Skip regional-only holidays
    const holidayDate = fromIso(holiday.date);
    const { year, month, day } = parts(holidayDate);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount++;
    } else {
      weekdayCount++;
    }
  }

  const total = weekendCount + weekdayCount;
  const weekendRatio = total > 0 ? weekendCount / total : 0;

  let rating: "excellent" | "good" | "average" | "poor";
  let description: string;

  if (weekendRatio <= 0.15) {
    rating = "excellent";
    description = `${holidays.year} ist ein ausgezeichnetes Jahr: Nur ${weekendCount} von ${total} Feiertagen fallen aufs Wochenende.`;
  } else if (weekendRatio <= 0.3) {
    rating = "good";
    description = `${holidays.year} ist ein gutes Jahr für Brückentage mit ${weekdayCount} Feiertagen unter der Woche.`;
  } else if (weekendRatio <= 0.45) {
    rating = "average";
    description = `${holidays.year} ist ein durchschnittliches Jahr: ${weekendCount} von ${total} Feiertagen fallen aufs Wochenende.`;
  } else {
    rating = "poor";
    description = `${holidays.year} ist ein schwieriges Jahr: ${weekendCount} von ${total} Feiertagen fallen aufs Wochenende.`;
  }

  return {
    rating,
    weekendHolidays: weekendCount,
    weekdayHolidays: weekdayCount,
    description,
  };
}
