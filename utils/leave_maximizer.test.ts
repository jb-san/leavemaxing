// Test file for leave_maximizer.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import type { Holiday } from "./holidays.ts";
import {
  calculateOptimalLeave,
  findFreeBlocks,
  formatDate,
  getAllFreeDays,
  getWorkdays,
  isWeekend,
  parseDateUTC,
} from "./leave_maximizer.ts";

Deno.test("isWeekend identifies Sundays", () => {
  const sunday = new Date("2024-03-10T12:00:00Z"); // A Sunday
  assert(isWeekend(sunday));
});

Deno.test("isWeekend identifies Saturdays", () => {
  const saturday = new Date("2024-03-09T12:00:00Z"); // A Saturday
  assert(isWeekend(saturday));
});

Deno.test("isWeekend identifies weekdays", () => {
  const monday = new Date("2024-03-11T12:00:00Z"); // A Monday
  assertEquals(isWeekend(monday), false);
  const friday = new Date("2024-03-15T12:00:00Z"); // A Friday
  assertEquals(isWeekend(friday), false);
});

Deno.test("parseDateUTC converts string to UTC Date", () => {
  const dateString = "2024-07-04";
  const expectedDate = new Date(Date.UTC(2024, 6, 4)); // Month is 0-indexed
  const actualDate = parseDateUTC(dateString);
  assertEquals(actualDate.getTime(), expectedDate.getTime());
  assertEquals(actualDate.getUTCFullYear(), 2024);
  assertEquals(actualDate.getUTCMonth(), 6); // July
  assertEquals(actualDate.getUTCDate(), 4);
});

Deno.test("formatDate converts Date to YYYY-MM-DD string", () => {
  const date = new Date(Date.UTC(2024, 11, 25)); // December 25th, 2024
  const expectedString = "2024-12-25";
  assertEquals(formatDate(date), expectedString);
});

Deno.test("getAllFreeDays identifies weekends and holidays", () => {
  const year = 2024;
  // Mock holidays: New Year's Day (Mon), a mid-week holiday (Wed), Christmas (Wed)
  const holidays: Holiday[] = [
    {
      date: "2024-01-01",
      localName: "New Year",
      name: "New Year",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
    {
      date: "2024-07-17",
      localName: "Mid Week",
      name: "Mid Week",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
    {
      date: "2024-12-25",
      localName: "Christmas",
      name: "Christmas",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
  ];

  const freeDays = getAllFreeDays(year, holidays);

  // Check holidays
  assert(freeDays.has("2024-01-01")); // Holiday (Monday)
  assert(freeDays.has("2024-07-17")); // Holiday (Wednesday)
  assert(freeDays.has("2024-12-25")); // Holiday (Wednesday)

  // Check some weekends (adjust dates if needed for 2024)
  assert(freeDays.has("2024-01-06")); // Saturday
  assert(freeDays.has("2024-01-07")); // Sunday
  assert(freeDays.has("2024-12-28")); // Saturday
  assert(freeDays.has("2024-12-29")); // Sunday

  // Check some weekdays that are NOT holidays
  assertEquals(freeDays.has("2024-01-02"), false); // Tuesday
  assertEquals(freeDays.has("2024-07-18"), false); // Thursday
  assertEquals(freeDays.has("2024-12-26"), false); // Thursday

  // Rough check on size (will vary slightly based on year start/end days)
  // Expected weekends: 52 * 2 = 104. Add 3 holidays. Jan 1st 2024 is Mon, Dec 31st 2024 is Tue.
  // 2024 is a leap year. 104 weekends + 3 holidays (none fall on weekend) = 107
  // Let's verify Jan 1st calculation: 2024 starts on Mon. First weekend is Jan 6/7.
  // Dec 31st 2024 is Tue. Last weekend is Dec 28/29.
  // Total days = 366. Weekdays = 366 - 104 = 262.
  // Holidays are Mon, Wed, Wed. All are weekdays.
  // Total free days = 104 weekends + 3 unique weekday holidays = 107
  assertEquals(freeDays.size, 107);
});

Deno.test("getWorkdays identifies workdays correctly", () => {
  const year = 2024;
  // Use the same mock holidays as getAllFreeDays test
  const holidays: Holiday[] = [
    {
      date: "2024-01-01",
      localName: "New Year",
      name: "New Year",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
    {
      date: "2024-07-17",
      localName: "Mid Week",
      name: "Mid Week",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
    {
      date: "2024-12-25",
      localName: "Christmas",
      name: "Christmas",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
  ];

  const freeDays = getAllFreeDays(year, holidays);
  const workdays = getWorkdays(year, freeDays);

  // Check total number of workdays (366 total days in 2024 - 107 free days)
  assertEquals(workdays.length, 366 - 107);

  // Check specific dates
  assert(workdays.includes("2024-01-02")); // Tuesday after holiday
  assert(workdays.includes("2024-07-18")); // Thursday after holiday
  assert(workdays.includes("2024-12-26")); // Thursday after holiday

  assertEquals(workdays.includes("2024-01-01"), false); // Holiday
  assertEquals(workdays.includes("2024-01-06"), false); // Saturday
  assertEquals(workdays.includes("2024-01-07"), false); // Sunday
  assertEquals(workdays.includes("2024-07-17"), false); // Holiday
  assertEquals(workdays.includes("2024-12-25"), false); // Holiday
});

Deno.test("findFreeBlocks identifies blocks correctly", () => {
  const dates1 = new Set(["2024-01-01", "2024-01-02", "2024-01-03"]);
  assertEquals(findFreeBlocks(dates1), [
    { start: "2024-01-01", end: "2024-01-03", length: 3 },
  ]);

  const dates2 = new Set(["2024-03-10", "2024-03-12", "2024-03-13"]);
  assertEquals(findFreeBlocks(dates2), [
    { start: "2024-03-10", end: "2024-03-10", length: 1 },
    { start: "2024-03-12", end: "2024-03-13", length: 2 },
  ]);

  const dates3 = new Set(["2024-05-01", "2024-05-03", "2024-05-05"]);
  assertEquals(findFreeBlocks(dates3), [
    { start: "2024-05-01", end: "2024-05-01", length: 1 },
    { start: "2024-05-03", end: "2024-05-03", length: 1 },
    { start: "2024-05-05", end: "2024-05-05", length: 1 },
  ]);

  const dates4 = new Set([
    "2024-07-04",
    "2024-07-05",
    "2024-07-06",
    "2024-07-07",
    "2024-07-09",
  ]);
  assertEquals(findFreeBlocks(dates4), [
    { start: "2024-07-04", end: "2024-07-07", length: 4 },
    { start: "2024-07-09", end: "2024-07-09", length: 1 },
  ]);

  const dates5 = new Set<string>();
  assertEquals(findFreeBlocks(dates5), []);

  const dates6 = new Set(["2024-12-31", "2025-01-01"]);
  assertEquals(findFreeBlocks(dates6), [
    { start: "2024-12-31", end: "2025-01-01", length: 2 },
  ]);
});

// --- Tests for calculateOptimalLeave (Bridge Finder) ---

Deno.test("calculateOptimalLeave (Bridge) returns empty if no leave days", () => {
  const holidays: Holiday[] = [{
    date: "2024-12-25",
    localName: "Xmas",
    name: "Xmas",
    countryCode: "XX",
    fixed: true,
    global: true,
    counties: null,
    launchYear: null,
    types: ["Public"],
  }];
  assertEquals(calculateOptimalLeave(holidays, 0, 2024, "any"), []);
});

Deno.test("calculateOptimalLeave (Bridge) returns empty if no holidays", () => {
  assertEquals(calculateOptimalLeave([], 5, 2024, "any"), []);
});

Deno.test("calculateOptimalLeave (Bridge) suggests simple bridge Fri for Thu holiday", () => {
  const year = 2024;
  // Holiday: Thursday, March 14th. Free blocks: [..., Mar 9-10], [Mar 14], [Mar 16-17], ...
  // Gap between Mar 10 (Sun) and Mar 14 (Thu) = 3 workdays (Mon, Tue, Wed)
  // Gap between Mar 14 (Thu) and Mar 16 (Sat) = 1 workday (Fri)
  const holidays: Holiday[] = [
    {
      date: "2024-03-14",
      localName: "H",
      name: "H",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
  ];
  // Bridge Fri(15): connects Thu(14) + Sat(16)+Sun(17). Cost=1, Benefit=1+1+2=4. Score=4/1=4.
  // Bridge Mon,Tue,Wed(11,12,13): connects Sat(9)+Sun(10) + Thu(14). Cost=3, Benefit=2+3+1=6. Score=6/3=2.
  // Best score is 4.
  const result = calculateOptimalLeave(holidays, 1, year, "any");
  assertEquals(result, ["2024-03-15"]);
});

Deno.test("calculateOptimalLeave (Bridge) suggests simple bridge Mon for Tue holiday", () => {
  const year = 2024;
  // Holiday: Tuesday, March 12th. Free blocks: [..., Mar 9-10], [Mar 12], [Mar 16-17], ...
  // Gap between Mar 10 (Sun) and Mar 12 (Tue) = 1 workday (Mon)
  // Gap between Mar 12 (Tue) and Mar 16 (Sat) = 3 workdays (Wed, Thu, Fri)
  const holidays: Holiday[] = [
    {
      date: "2024-03-12",
      localName: "H",
      name: "H",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
  ];
  // Bridge Mon(11): connects Sat(9)+Sun(10) + Tue(12). Cost=1, Benefit=2+1+1=4. Score=4/1=4.
  // Bridge Wed,Thu,Fri(13,14,15): connects Tue(12) + Sat(16)+Sun(17). Cost=3, Benefit=1+3+2=6. Score=6/3=2.
  // Best score is 4.
  const result = calculateOptimalLeave(holidays, 1, year, "any");
  assertEquals(result, ["2024-03-11"]);
});

Deno.test("calculateOptimalLeave (Bridge) suggests bridge Wed between Tue/Thu holidays", () => {
  const year = 2024;
  // Holidays: Tue Mar 12th, Thu Mar 14th.
  // Free blocks: [..., Mar 9-10], [Mar 12], [Mar 14], [Mar 16-17], ...
  // Gap Sun(10) <> Tue(12) = 1 workday (Mon 11). Score=4/1=4
  // Gap Tue(12) <> Thu(14) = 1 workday (Wed 13). Score=(1+1+1)/1=3
  // Gap Thu(14) <> Sat(16) = 1 workday (Fri 15). Score=(1+1+2)/1=4
  const holidays: Holiday[] = [
    {
      date: "2024-03-12",
      localName: "H1",
      name: "H1",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
    {
      date: "2024-03-14",
      localName: "H2",
      name: "H2",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
  ];
  // Highest scores are 4 (Mon or Fri). Algorithm picks Mon (shorter gap tiebreak - actually no, score is primary). It should pick Mon or Fri.
  // Let's assume stable sort keeps Mon first if scores equal.
  const result1 = calculateOptimalLeave(holidays, 1, year, "any");
  assert(
    result1.includes("2024-03-11") || result1.includes("2024-03-15"),
    "Should pick Mon or Fri for 1 day",
  );
  assertEquals(result1.length, 1);

  // If 2 days available, it should pick Mon AND Fri (both score 4)
  const result2 = calculateOptimalLeave(holidays, 2, year, "any");
  assertEquals(result2.sort(), ["2024-03-11", "2024-03-15"].sort());

  // If 3 days available, it should pick Mon, Fri (score 4), AND Wed (score 3)
  const result3 = calculateOptimalLeave(holidays, 3, year, "any");
  assertEquals(
    result3.sort(),
    ["2024-03-11", "2024-03-13", "2024-03-15"].sort(),
  );
});

Deno.test("calculateOptimalLeave (Bridge) handles multi-day gap", () => {
  const year = 2024;
  // Holiday: Fri Dec 20. Next Free: Sat Dec 28
  // Gap: Mon 23, Tue 24, Wed 25(H?), Thu 26, Fri 27. --> Assume Wed 25 is NOT holiday for test
  // Free blocks: [..., Dec 14-15], [Dec 20], [Dec 21-22 should be free too? No, 20th is Fri.], [Dec 28-29] ...
  // Let's adjust: Holiday Thu Dec 19. Weekend Dec 21-22. Next Weekend Dec 28-29.
  // Free blocks: [..., Dec 14-15], [Dec 19], [Dec 21-22], [Dec 28-29], ...
  // Gap1: Dec 15 <> Dec 19 => Mon 16, Tue 17, Wed 18 (3 days)
  // Gap2: Dec 19 <> Dec 21 => Fri 20 (1 day)
  // Gap3: Dec 22 <> Dec 28 => Mon 23, Tue 24, Wed 25, Thu 26, Fri 27 (5 days)
  const holidays: Holiday[] = [
    {
      date: "2024-12-19",
      localName: "H",
      name: "H",
      countryCode: "XX",
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ["Public"],
    },
  ];
  // Score Gap1 (Mon-Wed): connect (2) + 3 + (1) = 6. Score = 6/3 = 2
  // Score Gap2 (Fri): connect (1) + 1 + (2) = 4. Score = 4/1 = 4
  // Score Gap3 (Mon-Fri): connect (2) + 5 + (2) = 9. Score = 9/5 = 1.8

  // Available = 1 day: Should pick Fri Dec 20 (Score 4)
  assertEquals(calculateOptimalLeave(holidays, 1, year, "any"), ["2024-12-20"]);
  // Available = 2 days: Should pick Fri Dec 20 (Score 4). Cannot afford next best (Gap1, cost 3). Result is only Fri Dec 20.
  assertEquals(
    calculateOptimalLeave(holidays, 2, year, "any").sort(),
    ["2024-12-20"].sort(),
    "Should pick Fri 20 only",
  );
  // Available = 4 days: Should pick Fri Dec 20 (1 day, score 4) + Mon,Tue,Wed Dec 16,17,18 (3 days, score 2)
  assertEquals(
    calculateOptimalLeave(holidays, 4, year, "any").sort(),
    ["2024-12-16", "2024-12-17", "2024-12-18", "2024-12-20"].sort(),
  );
  // Available = 6 days: Should pick Gap2(1) + Gap1(3)
  assertEquals(
    calculateOptimalLeave(holidays, 6, year, "any").sort(),
    ["2024-12-16", "2024-12-17", "2024-12-18", "2024-12-20"].sort(),
    "With 6 days, should pick Gap 2 + Gap 1",
  );
});

// TODO: Add new tests specific to the bridge finding algorithm
// - Scenario: Simple bridge Fri for Thu holiday
// - Scenario: Simple bridge Mon for Tue holiday
// - Scenario: Bridge Wed between Tue/Thu holidays
// - Scenario: Multiple gaps, limited leave days (picks best score)
// - Scenario: Gap requires more leave days than available
// - Scenario: No gaps exist
