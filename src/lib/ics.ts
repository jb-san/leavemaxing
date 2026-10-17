import { type DayNum, formatShort, toIso } from "./dates";
import type { Break, Plan } from "./planner/types";

const compact = (day: DayNum) => toIso(day).replaceAll("-", "");

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function breakTitle(b: Break): string {
  return `Time off · ${b.length} days`;
}

export function breakDetails(b: Break, leaveDays: DayNum[]): string {
  const lines = [];
  const mine = leaveDays.filter((d) => d >= b.start && d <= b.end);
  if (mine.length) lines.push(`Take leave on: ${mine.map(formatShort).join(", ")}`);
  if (b.holidays.length)
    lines.push(`Public holidays: ${[...new Set(b.holidays.map((h) => h.name))].join(", ")}`);
  lines.push("Planned with leavemaxxing.com");
  return lines.join("\n");
}

export function buildIcs(
  plan: Plan,
  opts: { calendarName: string; includeLeaveDays: boolean; now?: Date },
): string {
  const stamp = `${(opts.now ?? new Date()).toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const leaveDays = [...plan.suggested, ...plan.locked].sort((a, b) => a - b);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//leavemaxxing//planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.calendarName)}`,
  ];
  for (const b of plan.breaks.filter((x) => x.leave > 0)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:break-${compact(b.start)}-${compact(b.end)}@leavemaxxing.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(b.start)}`,
      `DTEND;VALUE=DATE:${compact(b.end + 1)}`,
      `SUMMARY:${escapeText(breakTitle(b))}`,
      `DESCRIPTION:${escapeText(breakDetails(b, leaveDays))}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  if (opts.includeLeaveDays) {
    for (const d of leaveDays) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:leave-${compact(d)}@leavemaxxing.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compact(d)}`,
        `DTEND;VALUE=DATE:${compact(d + 1)}`,
        "SUMMARY:Leave day",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function googleCalendarUrl(b: Break, leaveDays: DayNum[]): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: breakTitle(b),
    dates: `${compact(b.start)}/${compact(b.end + 1)}`,
    details: breakDetails(b, leaveDays),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function downloadFile(name: string, content: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
