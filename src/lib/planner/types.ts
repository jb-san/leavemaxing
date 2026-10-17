import type { DayNum } from "../dates";

export type Style = "weekends" | "balanced" | "long";

export const STYLES: { id: Style; label: string; hint: string }[] = [
  { id: "weekends", label: "Long weekends", hint: "Lots of 3–5 day breaks" },
  { id: "balanced", label: "Balanced", hint: "Mostly week-long breaks" },
  { id: "long", label: "One big trip", hint: "Pile leave into long breaks" },
];

export interface HolidayDay {
  day: DayNum;
  name: string;
}

export interface PlanInput {
  /** Leave year label year (e.g. 2027) and the month it starts in (1-12). */
  year: number;
  yearStart: number;
  budget: number;
  /** Public holidays already resolved for the chosen region, any years. */
  holidays: HolidayDay[];
  /** Index 0 = Monday. true = a normal working day. */
  workWeek: boolean[];
  customOff: DayNum[];
  locked: DayNum[];
  blocked: DayNum[];
  style: Style;
  minBreak: number;
  /** null = no upper limit. */
  maxBreak: number | null;
  /** Preferred months, 1-12. Empty = no preference. */
  months: number[];
  /** Leave is never suggested before this day. */
  today: DayNum;
}

export interface Break {
  start: DayNum;
  end: DayNum;
  length: number;
  /** Leave days (suggested + locked) inside the break. */
  leave: number;
  holidays: HolidayDay[];
}

export interface Plan {
  /** Suggested leave days (excludes locked days). */
  suggested: DayNum[];
  locked: DayNum[];
  /** Breaks of 3+ off days that contain leave or a holiday. */
  breaks: Break[];
  stats: {
    leaveUsed: number;
    /** Days off in breaks that contain leave. */
    daysOff: number;
    multiplier: number;
    longest: number;
    breaksWithLeave: number;
  };
  warnings: string[];
}

export type DayKind = "work" | "weekend" | "holiday" | "custom" | "leave" | "locked" | "blocked";
