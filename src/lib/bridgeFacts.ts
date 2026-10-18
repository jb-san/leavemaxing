/**
 * Bridge days for a country-year.
 *
 * A bridge day is a working day in a gap of one or two working days between a
 * public holiday and the weekend, or between two public holidays. Taking those
 * days joins the holiday to the time off on the other side. A holiday that
 * already sits on a weekend, or directly against one, is not a bridge.
 */

import { type DayNum, fromIso, toIso, weekdayMon0 } from "./dates";
import { appliesTo, type HolidayFile, holidayName } from "./holidays";
import { defaultWorkWeek } from "./weekends";

export interface BridgeCluster {
  /** ISO dates of the leave days, ascending. */
  days: string[];
  /** Holidays this bridge attaches to, in the page language. */
  holidays: string[];
  start: DayNum;
  end: DayNum;
  /** Calendar days off once the bridge days are taken, including the holiday and weekend. */
  length: number;
  leave: number;
}

export interface BridgeFacts {
  /** Unique working days that belong to a one- or two-day bridge. */
  days: number;
  /** Distinct bridges. A two-day gap is one bridge. */
  bridges: number;
  best: BridgeCluster | null;
}

export function findBridgeFacts(
  file: HolidayFile,
  country: string,
  region: string | null,
  locale?: string | null,
): BridgeFacts {
  const workWeek = defaultWorkWeek(country);
  const yearStart = fromIso(`${file.year}-01-01`);
  const yearEnd = fromIso(`${file.year}-12-31`);
  const names = new Map<DayNum, string[]>();

  for (const holiday of file.holidays) {
    if (!appliesTo(holiday, region)) continue;
    const day = fromIso(holiday.date);
    const name = holidayName(holiday, locale);
    const list = names.get(day);
    if (list) {
      if (!list.includes(name)) list.push(name);
    } else names.set(day, [name]);
  }

  const holidayDays = new Set(names.keys());
  const isWeekend = (day: DayNum) => workWeek[weekdayMon0(day)] !== true;
  const isHoliday = (day: DayNum) => holidayDays.has(day);
  const clusters = new Map<string, { days: DayNum[]; holidays: DayNum[] }>();

  for (const holiday of holidayDays) {
    if (holiday < yearStart || holiday > yearEnd) continue;
    for (const dir of [-1, 1] as const) {
      const gap: DayNum[] = [];
      let cursor = holiday + dir;
      const min = yearStart - 7;
      const max = yearEnd + 7;
      while (cursor >= min && cursor <= max && gap.length < 3) {
        if (isWeekend(cursor) || isHoliday(cursor)) break;
        gap.push(cursor);
        cursor += dir;
      }
      if ((gap.length !== 1 && gap.length !== 2) || cursor < min || cursor > max) continue;
      if (!isWeekend(cursor) && !isHoliday(cursor)) continue;
      if (gap.some((day) => day < yearStart || day > yearEnd)) continue;

      const anchors = [holiday];
      if (isHoliday(cursor)) anchors.push(cursor);
      const ordered = [...gap].sort((a, b) => a - b);
      const key = ordered.join(",");
      const existing = clusters.get(key);
      if (existing) {
        for (const day of anchors) {
          if (!existing.holidays.includes(day)) existing.holidays.push(day);
        }
      } else {
        clusters.set(key, { days: ordered, holidays: anchors });
      }
    }
  }

  const built: BridgeCluster[] = [];
  for (const cluster of clusters.values()) {
    const taken = new Set(cluster.days);
    const isOff = (day: DayNum) => taken.has(day) || isHoliday(day) || isWeekend(day);
    let start = cluster.days[0] ?? yearStart;
    let end = cluster.days[cluster.days.length - 1] ?? yearEnd;
    const boundMin = yearStart - 7;
    const boundMax = yearEnd + 7;
    while (start - 1 >= boundMin && isOff(start - 1)) start -= 1;
    while (end + 1 <= boundMax && isOff(end + 1)) end += 1;
    const holidays = cluster.holidays
      .flatMap((day) => names.get(day) ?? [])
      .filter((name, index, all) => all.indexOf(name) === index);
    built.push({
      days: cluster.days.map(toIso),
      holidays,
      start,
      end,
      length: end - start + 1,
      leave: cluster.days.length,
    });
  }

  built.sort((a, b) => {
    const ratio = b.length / b.leave - a.length / a.leave;
    if (ratio !== 0) return ratio;
    if (b.length !== a.length) return b.length - a.length;
    if (a.leave !== b.leave) return a.leave - b.leave;
    return (a.days[0] ?? "").localeCompare(b.days[0] ?? "");
  });

  const unique = new Set(built.flatMap((cluster) => cluster.days));
  return { days: unique.size, bridges: built.length, best: built[0] ?? null };
}
