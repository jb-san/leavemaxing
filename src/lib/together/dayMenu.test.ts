import { describe, expect, it } from "vitest";
import { dayNum } from "~/lib/dates";
import { applyDayAction, isNaturallyOff, menuOptions, OPTION_ACTION } from "./dayMenu";

const WORK_WEEK = [true, true, true, true, true, false, false];
const sat = dayNum(2027, 1, 9);
const mon = dayNum(2027, 1, 11);
const tue = dayNum(2027, 1, 12);

describe("menuOptions", () => {
  it("offers can't, a day off and proposing on a workday", () => {
    expect(menuOptions("work", false)).toEqual(["cant", "dayOff", "propose"]);
  });

  it("offers not free and proposing on a weekend or holiday", () => {
    expect(menuOptions("weekend", true)).toEqual(["notFree", "propose"]);
    expect(menuOptions("holiday", true)).toEqual(["notFree", "propose"]);
  });

  it("offers to clear a block, worded by whether the day is naturally off", () => {
    expect(menuOptions("blocked", false)).toEqual(["canAgain"]);
    expect(menuOptions("blocked", true)).toEqual(["freeAgain"]);
  });

  it("offers to remove your own day off", () => {
    expect(menuOptions("custom", false)).toEqual(["removeDayOff"]);
  });

  it("maps each option to what it does", () => {
    expect(OPTION_ACTION).toEqual({
      cant: "block",
      notFree: "block",
      dayOff: "custom",
      canAgain: "clear",
      freeAgain: "clear",
      removeDayOff: "clear",
      propose: "propose",
    });
  });
});

describe("isNaturallyOff", () => {
  const me = { workWeek: WORK_WEEK };
  it("is true on weekends and public holidays only", () => {
    const holidays = new Map([[mon, ["Holiday"]]]);
    expect(isNaturallyOff(sat, me, holidays)).toBe(true);
    expect(isNaturallyOff(mon, me, holidays)).toBe(true);
    expect(isNaturallyOff(tue, me, holidays)).toBe(false);
  });
});

describe("applyDayAction", () => {
  const none = { blocked: [] as number[], customOff: [] as number[] };

  it("blocks a day in order", () => {
    expect(applyDayAction({ blocked: [3, 9], customOff: [] }, 5, "block")).toEqual({
      blocked: [3, 5, 9],
      customOff: [],
    });
  });

  it("takes a day off in order", () => {
    expect(applyDayAction({ blocked: [], customOff: [9, 3] }, 5, "custom")).toEqual({
      blocked: [],
      customOff: [3, 5, 9],
    });
  });

  it("keeps a day out of the day offs when blocking it", () => {
    expect(applyDayAction({ blocked: [], customOff: [5, 7] }, 5, "block")).toEqual({
      blocked: [5],
      customOff: [7],
    });
  });

  it("keeps a day out of the blocked days when taking it off", () => {
    expect(applyDayAction({ blocked: [5, 7], customOff: [] }, 5, "custom")).toEqual({
      blocked: [7],
      customOff: [5],
    });
  });

  it("doesn't add a day twice", () => {
    expect(applyDayAction({ blocked: [5], customOff: [] }, 5, "block")).toEqual({
      blocked: [5],
      customOff: [],
    });
    expect(applyDayAction({ blocked: [], customOff: [5] }, 5, "custom")).toEqual({
      blocked: [],
      customOff: [5],
    });
  });

  it("clears a day from both", () => {
    expect(applyDayAction({ blocked: [5, 6], customOff: [5, 7] }, 5, "clear")).toEqual({
      blocked: [6],
      customOff: [7],
    });
    expect(applyDayAction(none, 5, "clear")).toEqual(none);
  });
});
