import { describe, expect, it } from "vitest";
import { fromIso } from "./dates";
import { buildIcs, googleCalendarUrl } from "./ics";
import type { Plan } from "./planner/types";

const plan: Plan = {
  suggested: [fromIso("2027-05-07")],
  locked: [],
  breaks: [
    {
      start: fromIso("2027-05-06"),
      end: fromIso("2027-05-09"),
      length: 4,
      leave: 1,
      holidays: [{ day: fromIso("2027-05-06"), name: "Ascension Day" }],
    },
    { start: fromIso("2027-05-15"), end: fromIso("2027-05-17"), length: 3, leave: 0, holidays: [] },
  ],
  stats: { leaveUsed: 1, daysOff: 4, multiplier: 4, longest: 4, breaksWithLeave: 1 },
  warnings: [],
};

describe("ics", () => {
  it("writes one all-day event per break with leave", () => {
    const ics = buildIcs(plan, {
      calendarName: "leavemaxxing 2027",
      includeLeaveDays: false,
      now: new Date(0),
    });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270506\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20270510\r\n");
    expect(ics).toContain("SUMMARY:Time off · 4 days");
    expect(ics).toContain("Public holidays: Ascension Day");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("can add each leave day", () => {
    const ics = buildIcs(plan, { calendarName: "x", includeLeaveDays: true });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("UID:leave-20270507@leavemaxxing.com");
  });

  it("builds Google Calendar links with an exclusive end date", () => {
    const url = new URL(googleCalendarUrl(plan.breaks[0] as Plan["breaks"][0], plan.suggested));
    expect(url.searchParams.get("dates")).toBe("20270506/20270510");
  });
});
