import { describe, expect, it } from "vitest";
import { extractCountryYear, listRegions } from "../../../scripts/lib/extract";
import { type DayNum, dayNum, fromIso, leaveYearRange, toIso, weekdayMon0 } from "../dates";
import { resolveHolidays } from "../holidays";
import { defaultWorkWeek } from "../weekends";
import { breakValue, classifyDays, plan } from "./plan";
import type { PlanInput, Style } from "./types";

function holidaysFor(country: string, region: string | null, years: number[]) {
  const regions = Object.keys(listRegions(country) ?? {});
  return resolveHolidays(
    years.map((y) => extractCountryYear(country, y, regions)),
    region,
  );
}

const bavaria = holidaysFor("DE", "BY", [2026, 2027, 2028]);

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    year: 2027,
    yearStart: 1,
    budget: 14,
    holidays: bavaria,
    workWeek: defaultWorkWeek("DE"),
    customOff: [],
    locked: [],
    blocked: [],
    style: "balanced",
    minBreak: 3,
    maxBreak: null,
    months: [],
    today: dayNum(2026, 10, 17),
    ...overrides,
  };
}

function isFree(i: PlanInput, d: DayNum): boolean {
  if (i.blocked.includes(d)) return false;
  return (
    !(i.workWeek[weekdayMon0(d)] ?? true) || i.holidays.some((h) => h.day === d) || i.customOff.includes(d)
  );
}

function checkInvariants(i: PlanInput) {
  const p = plan(i);
  const range = leaveYearRange(i.year, i.yearStart);
  const lockedInYear = i.locked.filter((d) => d >= range.start && d <= range.end && !isFree(i, d));
  expect(p.suggested.length + lockedInYear.length).toBeLessThanOrEqual(
    Math.max(i.budget, lockedInYear.length),
  );
  for (const d of p.suggested) {
    expect(isFree(i, d), `leave on a free day ${toIso(d)}`).toBe(false);
    expect(i.blocked.includes(d), `leave on a blocked day ${toIso(d)}`).toBe(false);
    expect(i.locked.includes(d)).toBe(false);
    expect(d).toBeGreaterThanOrEqual(Math.max(range.start, i.today));
    expect(d).toBeLessThanOrEqual(range.end);
  }
  for (const b of p.breaks.filter((x) => x.leave > 0)) {
    expect(b.length).toBeGreaterThanOrEqual(i.minBreak);
    if (i.maxBreak) expect(b.length).toBeLessThanOrEqual(i.maxBreak);
  }
  return p;
}

describe("dates", () => {
  it("knows weekdays without time zones", () => {
    expect(weekdayMon0(fromIso("2027-12-25"))).toBe(5); // Saturday
    expect(weekdayMon0(fromIso("2027-05-06"))).toBe(3); // Thursday
    expect(weekdayMon0(fromIso("1970-01-01"))).toBe(3); // Thursday
    expect(toIso(fromIso("2032-02-29"))).toBe("2032-02-29");
  });
});

describe("plan", () => {
  it("spends the whole budget on Bavaria 2027 and multiplies it", () => {
    const p = checkInvariants(input());
    expect(p.stats.leaveUsed).toBe(14);
    expect(p.stats.multiplier).toBeGreaterThan(2.3);
    expect(p.warnings).toEqual([]);
  });

  it("spends a single day where it buys the most", () => {
    const p = checkInvariants(input({ budget: 1, style: "weekends" }));
    // Next to the Easter weekend one day turns a 4-day weekend into 5 days off.
    expect(["2027-03-25", "2027-03-30"]).toContain(toIso(p.suggested[0] as number));
    expect(p.stats.daysOff).toBe(5);
  });

  it("bridges a Thursday holiday with the Friday", () => {
    const blocked = ["2027-03-25", "2027-03-30"].map(fromIso);
    const p = checkInvariants(input({ budget: 1, style: "weekends", blocked }));
    // Any 4-for-1: after New Year's Day (Fri), or the Friday after Ascension / Corpus Christi.
    expect(p.stats.daysOff).toBe(4);
  });

  it("keeps locked days and never uses blocked days", () => {
    const locked = [fromIso("2027-08-16"), fromIso("2027-08-17")];
    const blocked = [fromIso("2027-05-07"), fromIso("2027-05-28"), fromIso("2027-03-30")];
    const p = checkInvariants(input({ locked, blocked }));
    expect(p.locked).toEqual(locked);
    expect(p.stats.leaveUsed).toBe(14);
  });

  it("never suggests leave before today", () => {
    const p = checkInvariants(input({ year: 2026, today: dayNum(2026, 10, 17) }));
    expect(p.suggested.every((d) => d >= dayNum(2026, 10, 17))).toBe(true);
    expect(p.warnings).toEqual([]);
  });

  it("warns when the budget is bigger than the workdays left", () => {
    const p = plan(input({ year: 2026, budget: 200, today: dayNum(2026, 12, 1) }));
    expect(p.warnings.join(" ")).toMatch(/workdays are left/);
  });

  it("respects Friday-Saturday weekends", () => {
    const il = holidaysFor("IL", null, [2026, 2027, 2028]);
    const i = input({ holidays: il, workWeek: defaultWorkWeek("IL"), budget: 20 });
    const p = checkInvariants(i);
    expect(p.suggested.some((d) => weekdayMon0(d) === 6)).toBe(true); // Sundays are workdays
    expect(p.suggested.every((d) => weekdayMon0(d) !== 4 && weekdayMon0(d) !== 5)).toBe(true);
  });

  it("supports leave years that start in April and breaks across New Year", () => {
    const gb = holidaysFor("GB", "ENG", [2026, 2027, 2028, 2029]);
    const i = input({ holidays: gb, yearStart: 4, budget: 25 });
    const p = checkInvariants(i);
    expect(p.suggested.every((d) => d >= dayNum(2027, 4, 1) && d < dayNum(2028, 4, 1))).toBe(true);
    expect(p.breaks.some((b) => b.start < dayNum(2028, 1, 1) && b.end >= dayNum(2028, 1, 1))).toBe(true);
  });

  it("spreads balanced plans across the year", () => {
    const p = checkInvariants(input({ budget: 20, today: dayNum(2027, 1, 1) }));
    const quarters = [0, 0, 0, 0];
    for (const d of p.suggested) {
      const q = Math.floor((Number(toIso(d).slice(5, 7)) - 1) / 3);
      quarters[q] = (quarters[q] ?? 0) + 1;
    }
    expect(Math.min(...quarters)).toBeGreaterThanOrEqual(2);
  });

  it("styles change the shape of the plan", () => {
    const weekends = plan(input({ budget: 20, style: "weekends" }));
    const long = plan(input({ budget: 20, style: "long" }));
    expect(weekends.stats.breaksWithLeave).toBeGreaterThan(long.stats.breaksWithLeave);
    expect(long.stats.longest).toBeGreaterThan(weekends.stats.longest);
  });

  it("honours min and max break lengths", () => {
    checkInvariants(input({ budget: 20, minBreak: 5, maxBreak: 9 }));
    checkInvariants(input({ budget: 20, style: "long", maxBreak: 12 }));
  });

  it("prefers the chosen months", () => {
    const p = checkInvariants(input({ budget: 10, months: [8] }));
    expect(p.suggested.filter((d) => toIso(d).slice(5, 7) === "08").length).toBeGreaterThanOrEqual(5);
  });

  it("holds its invariants across random inputs", () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const styles: Style[] = ["weekends", "balanced", "long"];
    for (let k = 0; k < 25; k++) {
      const pick = () => dayNum(2027, 1, 1) + Math.floor(rand() * 365);
      const minBreak = 1 + Math.floor(rand() * 5);
      checkInvariants(
        input({
          budget: Math.floor(rand() * 35),
          style: styles[k % 3] as Style,
          minBreak,
          maxBreak: rand() < 0.5 ? null : minBreak + 2 + Math.floor(rand() * 10),
          locked: Array.from({ length: Math.floor(rand() * 4) }, pick),
          blocked: Array.from({ length: Math.floor(rand() * 20) }, pick),
          customOff: Array.from({ length: Math.floor(rand() * 3) }, pick),
          yearStart: 1 + Math.floor(rand() * 12),
          months: rand() < 0.3 ? [1 + Math.floor(rand() * 12)] : [],
          today: dayNum(2026, 1, 1),
        }),
      );
    }
  });

  it("finds the true optimum (brute force on a small window)", () => {
    // Block everything except a handful of days so all combinations can be enumerated.
    const range = leaveYearRange(2027, 1);
    const open = [
      "2027-05-03",
      "2027-05-04",
      "2027-05-05",
      "2027-05-07",
      "2027-05-10",
      "2027-05-14",
      "2027-05-18",
      "2027-05-21",
      "2027-05-24",
      "2027-05-25",
      "2027-05-28",
    ].map(fromIso);
    const blocked: DayNum[] = [];
    // Only workdays: blocking a weekend or holiday would make it a workday too.
    for (let d = range.start; d <= range.end; d++)
      if (!open.includes(d) && !isFree(input(), d)) blocked.push(d);

    for (const style of ["weekends", "balanced", "long"] as Style[]) {
      for (const budget of [2, 3, 4]) {
        const i = input({ blocked, style, budget, today: dayNum(2026, 1, 1) });
        const p = plan(i, { spread: false });
        const score = (leave: DayNum[]) => objective(i, new Set(leave));
        let best = Number.NEGATIVE_INFINITY;
        for (const combo of combinations(open, budget)) best = Math.max(best, score(combo));
        expect(score(p.suggested)).toBeCloseTo(best, 6);
      }
    }
  });
});

function objective(i: PlanInput, leave: Set<DayNum>): number {
  const range = leaveYearRange(i.year, i.yearStart);
  let total = 0;
  let run = 0;
  let hasLeave = false;
  for (let d = range.start - 21; d <= range.end + 22; d++) {
    const off = isFree(i, d) || leave.has(d);
    if (off) {
      run++;
      if (leave.has(d)) hasLeave = true;
    } else {
      if (hasLeave) total += run < i.minBreak ? Number.NEGATIVE_INFINITY : breakValue(i.style, run);
      run = 0;
      hasLeave = false;
    }
  }
  return total;
}

function* combinations<T>(items: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield [...acc];
    return;
  }
  for (let j = start; j < items.length; j++) {
    acc.push(items[j] as T);
    yield* combinations(items, k, j + 1, acc);
    acc.pop();
  }
}

describe("blocking a weekend or holiday", () => {
  // Easter weekend in Bavaria: Good Friday 26 Mar, Easter Monday 29 Mar 2027.
  const sat = dayNum(2027, 3, 27);
  const goodFriday = dayNum(2027, 3, 26);

  it("splits breaks at a blocked Saturday", () => {
    const p = plan(input({ blocked: [sat] }));
    expect(p.breaks.some((b) => b.start <= sat && b.end >= sat)).toBe(false);
  });

  it("splits breaks at a blocked public holiday", () => {
    const p = plan(input({ blocked: [goodFriday] }));
    expect(p.breaks.some((b) => b.start <= goodFriday && b.end >= goodFriday)).toBe(false);
  });

  it("shows blocked weekend and holiday days as blocked", () => {
    const i = input({ blocked: [sat, goodFriday] });
    const kinds = classifyDays(i, plan(i), goodFriday, sat);
    expect(kinds.get(sat)).toBe("blocked");
    expect(kinds.get(goodFriday)).toBe("blocked");
  });
});
