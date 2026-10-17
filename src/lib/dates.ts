/**
 * Calendar days as integers: days since 1970-01-01 (UTC). Using plain day numbers
 * instead of Date objects keeps weekdays stable in every time zone.
 */
export type DayNum = number;

const MS_PER_DAY = 86_400_000;

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** Monday-first weekday labels. */
export const WEEKDAYS_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function dayNum(year: number, month: number, day: number): DayNum {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Parse `YYYY-MM-DD`. */
export function fromIso(iso: string): DayNum {
  const [y, m, d] = iso.split("-").map(Number);
  return dayNum(y as number, m as number, d as number);
}

export function toIso(day: DayNum): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function parts(day: DayNum): { year: number; month: number; day: number } {
  const d = new Date(day * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 0 = Monday … 6 = Sunday. 1970-01-01 was a Thursday. */
export function weekdayMon0(day: DayNum): number {
  return (((day + 3) % 7) + 7) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The user's local calendar date (not the UTC date). */
export function localToday(now: Date = new Date()): DayNum {
  return dayNum(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** First and last day of a leave year that starts on `startMonth` (1-12) of `year`. */
export function leaveYearRange(year: number, startMonth: number): { start: DayNum; end: DayNum } {
  const start = dayNum(year, startMonth, 1);
  const end = startMonth === 1 ? dayNum(year, 12, 31) : dayNum(year + 1, startMonth, 1) - 1;
  return { start, end };
}

/** Months (as {year, month}) covered by a leave year. */
export function leaveYearMonths(year: number, startMonth: number): { year: number; month: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m0 = startMonth - 1 + i;
    return { year: year + Math.floor(m0 / 12), month: (m0 % 12) + 1 };
  });
}

export function leaveYearLabel(year: number, startMonth: number): string {
  return startMonth === 1 ? String(year) : `${year}–${String((year + 1) % 100).padStart(2, "0")}`;
}

/** "Thu 6 May" */
export function formatShort(day: DayNum): string {
  const p = parts(day);
  return `${WEEKDAYS_LONG[weekdayMon0(day)]?.slice(0, 3)} ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** "6 May" */
export function formatDayMonth(day: DayNum): string {
  const p = parts(day);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** "6–14 May" or "28 Dec – 3 Jan" */
export function formatRange(start: DayNum, end: DayNum): string {
  const a = parts(start);
  const b = parts(end);
  if (start === end) return formatDayMonth(start);
  if (a.month === b.month && a.year === b.year) return `${a.day}–${b.day} ${MONTHS_SHORT[a.month - 1]}`;
  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}
