import { describe, expect, it } from "vitest";
import { dayNum } from "~/lib/dates";
import { dayLabel, joinNames, menuNote, monthsPhrase, noWindowsNote, saveNote, t, votesPhrase } from "./copy";

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

  it("says your own day off is a day off", () => {
    expect(dayLabel(dayNum(2027, 1, 12), "custom", [], [])).toBe("Tue 12 Jan, your day off.");
  });

  it("gives the votes on each window that holds the day", () => {
    const sam = { name: "Sam", you: false };
    expect(
      dayLabel(
        mon,
        "work",
        [],
        [],
        [],
        [
          {
            start: dayNum(2027, 1, 9),
            end: dayNum(2027, 1, 12),
            votes: [
              { ...sam, vote: "yes" },
              { name: "Alex", you: false, vote: "no" },
              { name: "Jo", you: false, vote: null },
            ],
          },
          { start: dayNum(2027, 1, 11), end: dayNum(2027, 1, 20), votes: [{ ...sam, vote: "maybe" }] },
        ],
      ),
    ).toBe(
      "Mon 11 Jan, workday. In 9–12 Jan: Sam works, Alex can't, Jo hasn't voted. In 11–20 Jan: Sam says maybe.",
    );
  });
});

describe("votesPhrase", () => {
  it("names each vote, with your own in the second person", () => {
    expect(
      votesPhrase(dayNum(2027, 11, 12), dayNum(2027, 11, 15), [
        { name: "Sam", you: true, vote: "yes" },
        { name: "Alex", you: false, vote: "no" },
        { name: "Jo", you: false, vote: null },
      ]),
    ).toBe("In 12–15 Nov: you work, Alex can't, Jo hasn't voted.");
    expect(
      votesPhrase(dayNum(2027, 11, 12), dayNum(2027, 11, 15), [
        { name: "Sam", you: true, vote: "maybe" },
        { name: "Kim", you: false, vote: "maybe" },
      ]),
    ).toBe("In 12–15 Nov: you say maybe, Kim says maybe.");
    expect(
      votesPhrase(dayNum(2027, 11, 12), dayNum(2027, 11, 15), [{ name: "Sam", you: true, vote: null }]),
    ).toBe("In 12–15 Nov: you haven't voted.");
  });
});

describe("menuNote", () => {
  it("says what the day is for you and who else can't", () => {
    expect(menuNote("holiday", ["Epiphany", "Other"], ["Alex"])).toBe(
      "Public holiday: Epiphany, Other. Alex can't.",
    );
    expect(menuNote("holiday", [], [])).toBe("Public holiday.");
    expect(menuNote("weekend", [], ["Sam", "Alex"])).toBe("Weekend. Sam and Alex can't.");
    expect(menuNote("blocked", [], [])).toBe("You can't do this day.");
    expect(menuNote("custom", [], [])).toBe("Your day off. It costs no leave.");
    expect(menuNote("work", [], ["Kim"])).toBe("Kim can't.");
    expect(menuNote("work", [], [])).toBeNull();
  });
});

describe("noWindowsNote", () => {
  it("tells the admin to widen the months", () => {
    expect(noWindowsNote(true, "Sam")).toBe(t.noWindows);
  });

  it("tells everyone else who can", () => {
    expect(noWindowsNote(false, "Sam")).toBe(
      "No dates work for everyone in these months. Ask Sam to widen the months or the trip length.",
    );
    expect(noWindowsNote(false, null)).toBe(
      "No dates work for everyone in these months. Ask whoever started the group to widen the months or the trip length.",
    );
  });
});

describe("saveNote", () => {
  it("says nothing once everything is saved", () => {
    expect(saveNote("online", false)).toBeNull();
    expect(saveNote("offline", false)).toBeNull();
  });

  it("says saving while edits are on their way", () => {
    expect(saveNote("online", true)).toBe("Saving…");
  });

  it("says offline while edits wait for the connection", () => {
    for (const status of ["offline", "connecting"] as const) {
      expect(saveNote(status, true)).toBe("Offline. Changes will save when you're back.");
    }
  });
});
