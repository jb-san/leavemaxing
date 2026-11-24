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

  it("is a well-formed RFC 5545 calendar", () => {
    const tricky: Plan = {
      ...plan,
      suggested: [fromIso("2027-12-27"), fromIso("2027-12-28"), fromIso("2027-12-29")],
      breaks: [
        ...plan.breaks,
        {
          start: fromIso("2027-12-24"),
          end: fromIso("2027-12-31"),
          length: 8,
          leave: 3,
          holidays: [
            { day: fromIso("2027-12-25"), name: "Christmas Day; the long one, with \\ and commas" },
            { day: fromIso("2027-12-26"), name: "Stephanstag – Sankt Stefan, Štěpán, Szczepan, Стефан" },
          ],
        },
      ],
    };
    const ics = buildIcs(tricky, {
      calendarName: "Plan, 2027; mine",
      includeLeaveDays: true,
      now: new Date(Date.UTC(2026, 10, 23, 9, 5, 7)),
    });

    // Every line ends in CRLF: no bare LF or CR anywhere.
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);

    // Folded lines are at most 75 octets and unfold back to the original content lines.
    const physical = ics.slice(0, -2).split("\r\n");
    for (const line of physical) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const lines = ics.slice(0, -2).replaceAll("\r\n ", "").split("\r\n");
    expect(physical.length).toBeGreaterThan(lines.length);

    expect(lines.slice(0, 3)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//leavemaxxing//planner//EN",
    ]);
    expect(lines.at(-1)).toBe("END:VCALENDAR");
    expect(lines).toContain("X-WR-CALNAME:Plan\\, 2027\\; mine");

    // One VEVENT per break with leave (holiday-only breaks are skipped), plus one per leave day.
    const events: string[][] = [];
    let current: string[] | null = null;
    for (const line of lines) {
      if (line === "BEGIN:VEVENT") current = [];
      else if (line === "END:VEVENT") {
        events.push(current ?? []);
        current = null;
      } else current?.push(line);
    }
    expect(current).toBeNull();
    const breaks = events.filter((e) => e.some((l) => l.startsWith("UID:break-")));
    const days = events.filter((e) => e.some((l) => l.startsWith("UID:leave-")));
    expect(breaks).toHaveLength(2);
    expect(days).toHaveLength(3);

    const uids = events.map((e) => e.find((l) => l.startsWith("UID:")));
    expect(new Set(uids).size).toBe(events.length);
    for (const e of events) {
      expect(e).toContain("DTSTAMP:20261123T090507Z");
      expect(e.filter((l) => /^DTSTART;VALUE=DATE:\d{8}$/.test(l))).toHaveLength(1);
      expect(e.filter((l) => /^DTEND;VALUE=DATE:\d{8}$/.test(l))).toHaveLength(1);
    }

    // All-day events end on the day after the last day (exclusive), across the year end too.
    const christmas = breaks[1] as string[];
    expect(christmas).toContain("DTSTART;VALUE=DATE:20271224");
    expect(christmas).toContain("DTEND;VALUE=DATE:20280101");
    expect(days[0]).toContain("DTSTART;VALUE=DATE:20271227");
    expect(days[0]).toContain("DTEND;VALUE=DATE:20271228");

    // TEXT values escape backslash, semicolon, comma and newline.
    const description = christmas.find((l) => l.startsWith("DESCRIPTION:")) ?? "";
    expect(description).toContain("Christmas Day\\; the long one\\, with \\\\ and commas");
    expect(description).toContain("\\nPublic holidays: ");
    expect(description).toContain("Štěpán\\, Szczepan\\, Стефан");
    expect(description).not.toMatch(/(^|[^\\]),/);
  });
});
