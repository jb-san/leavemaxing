import { describe, expect, it } from "vitest";
import { dayNum } from "~/lib/dates";
import { dayLabel, joinNames, monthsPhrase } from "./copy";

describe("monthsPhrase", () => {
  it("names a single month", () => {
    expect(monthsPhrase([{ year: 2027, month: 6 }])).toBe("June 2027");
  });

  it("names a range within one year, in order", () => {
    expect(
      monthsPhrase([
        { year: 2027, month: 11 },
        { year: 2027, month: 6 },
        { year: 2027, month: 8 },
      ]),
    ).toBe("June to November 2027");
  });

  it("names both years when the range crosses one", () => {
    expect(
      monthsPhrase([
        { year: 2028, month: 2 },
        { year: 2027, month: 11 },
      ]),
    ).toBe("November 2027 to February 2028");
  });
});

describe("joinNames", () => {
  it("joins with commas and a final and", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Sam"])).toBe("Sam");
    expect(joinNames(["Sam", "Alex"])).toBe("Sam and Alex");
    expect(joinNames(["Sam", "Alex", "Kim"])).toBe("Sam, Alex and Kim");
  });
});

describe("dayLabel", () => {
  const sat = dayNum(2027, 1, 9);
  const mon = dayNum(2027, 1, 11);

  it("gives the date, what the day is for you, and who can't", () => {
    expect(dayLabel(sat, "weekend", [], ["Sam", "Alex"])).toBe("Sat 9 Jan, weekend. Sam and Alex can't.");
  });

  it("names public holidays", () => {
    expect(dayLabel(mon, "holiday", ["Epiphany"], [])).toBe("Mon 11 Jan, public holiday Epiphany.");
  });

  it("says when you can't", () => {
    expect(dayLabel(mon, "blocked", ["Epiphany"], ["Alex"])).toBe("Mon 11 Jan, you can't. Alex can't.");
  });

  it("says who proposed dates that cover the day", () => {
    expect(dayLabel(mon, "work", [], ["Alex"], ["Sam", "Alex"])).toBe(
      "Mon 11 Jan, workday. Alex can't. Proposed by Sam and Alex.",
    );
    expect(dayLabel(mon, "work", [], [], [])).toBe("Mon 11 Jan, workday.");
  });

  it("calls an ordinary day a workday", () => {
    expect(dayLabel(dayNum(2027, 1, 12), "work", [], [])).toBe("Tue 12 Jan, workday.");
  });
});
