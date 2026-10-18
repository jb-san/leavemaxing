import { type DayNum, leaveYearRange, parts } from "~/lib/dates";
import { defaultSettings, type Settings } from "~/lib/settings";
import { type ScoreMember, workingDays } from "./score";

/**
 * The planner settings for taking a group's dates off: my working days in the window become locked
 * leave days. They join my last plan when it's for the same country and leave year, or start a fresh
 * plan for my country in the window's year. Only days inside that leave year are locked, because the
 * planner shows one leave year at a time.
 */
export function planSettingsFor(
  me: ScoreMember,
  w: { start: DayNum; end: DayNum },
  last: Settings | null,
): Settings {
  const lastYear = last ? leaveYearRange(last.year, last.yearStart) : null;
  if (last && lastYear && last.country === me.record.country && inside(lastYear, w.start)) {
    return { ...last, locked: union(last.locked, lockable(me, w, lastYear)) };
  }
  const base = defaultSettings(me.record.country, parts(w.start).year);
  const year = leaveYearRange(base.year, base.yearStart);
  return {
    ...base,
    region: me.record.region,
    workWeek: [...me.record.workWeek],
    customOff: me.record.customOff.filter((d) => inside(year, d)),
    locked: lockable(me, w, year),
  };
}

type Span = { start: DayNum; end: DayNum };

const inside = (span: Span, day: DayNum) => day >= span.start && day <= span.end;

function lockable(me: ScoreMember, w: Span, year: Span): DayNum[] {
  return workingDays(me, Math.max(w.start, year.start), Math.min(w.end, year.end));
}

function union(a: readonly DayNum[], b: readonly DayNum[]): DayNum[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}
