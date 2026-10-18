import { type DayNum, weekdayMon0 } from "~/lib/dates";
import type { MemberDayKind } from "./calendar";
import type { MemberRecord } from "./protocol";

/** What a day menu option does to your record, or "propose" to open the proposal sheet there. */
export type DayAction = "block" | "custom" | "clear" | "propose";

/** The day menu's options. Their labels live in the copy. */
export type MenuOption =
  | "cant"
  | "notFree"
  | "dayOff"
  | "canAgain"
  | "freeAgain"
  | "removeDayOff"
  | "propose";

export const OPTION_ACTION: Record<MenuOption, DayAction> = {
  cant: "block",
  notFree: "block",
  dayOff: "custom",
  canAgain: "clear",
  freeAgain: "clear",
  removeDayOff: "clear",
  propose: "propose",
};

/**
 * The options for a day, by what it is for you. Locking leave is left out on purpose: in a group,
 * leave goes into your plan through "Add to my plan" on agreed dates.
 */
export function menuOptions(kind: MemberDayKind, naturallyOff: boolean): MenuOption[] {
  switch (kind) {
    case "work":
      return ["cant", "dayOff", "propose"];
    case "weekend":
    case "holiday":
      return ["notFree", "propose"];
    case "blocked":
      return [naturallyOff ? "freeAgain" : "canAgain"];
    case "custom":
      return ["removeDayOff"];
  }
}

/** A weekend or public holiday, whatever you've marked on it. */
export function isNaturallyOff(
  day: DayNum,
  member: Pick<MemberRecord, "workWeek">,
  holidays: ReadonlyMap<DayNum, unknown>,
): boolean {
  return holidays.has(day) || !(member.workWeek[weekdayMon0(day)] ?? true);
}

type Days = Pick<MemberRecord, "blocked" | "customOff">;

const added = (days: readonly number[], day: number) =>
  days.includes(day) ? [...days] : [...days, day].sort((a, b) => a - b);
const removed = (days: readonly number[], day: number) => days.filter((d) => d !== day);

/** Your blocked days and days off after an action. A day is never both blocked and a day off. */
export function applyDayAction(days: Days, day: DayNum, action: Exclude<DayAction, "propose">): Days {
  switch (action) {
    case "block":
      return { blocked: added(days.blocked, day), customOff: removed(days.customOff, day) };
    case "custom":
      return { blocked: removed(days.blocked, day), customOff: added(days.customOff, day) };
    case "clear":
      return { blocked: removed(days.blocked, day), customOff: removed(days.customOff, day) };
  }
}
