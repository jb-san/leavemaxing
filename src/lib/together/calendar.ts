import { type DayNum, weekdayMon0 } from "~/lib/dates";
import type { MemberRecord, Vote, WindowKey } from "./protocol";
import type { Helper } from "./score";

/** What a day is for one member. A blocked day is never off, whatever else it is. */
export type MemberDayKind = "blocked" | "holiday" | "custom" | "weekend" | "work";

export function memberDayKind(
  day: DayNum,
  member: Pick<MemberRecord, "blocked" | "customOff" | "workWeek">,
  holidays: ReadonlyMap<DayNum, unknown>,
): MemberDayKind {
  if (member.blocked.includes(day)) return "blocked";
  if (holidays.has(day)) return "holiday";
  if (member.customOff.includes(day)) return "custom";
  if (!(member.workWeek[weekdayMon0(day)] ?? true)) return "weekend";
  return "work";
}

/** The days with the day added, or removed if it was there, in order. */
export function toggleDay(days: readonly number[], day: number): number[] {
  if (days.includes(day)) return days.filter((d) => d !== day);
  return [...days, day].sort((a, b) => a - b);
}

/** For each day, the ids of the members who can't do it, in member order. */
export function blockedBy(members: Iterable<[string, Pick<MemberRecord, "blocked">]>): Map<DayNum, string[]> {
  const out = new Map<DayNum, string[]>();
  for (const [id, m] of members) {
    for (const day of m.blocked) {
      const ids = out.get(day);
      if (!ids) out.set(day, [id]);
      else if (!ids.includes(id)) ids.push(id);
    }
  }
  return out;
}

/** The first `max` items, and how many more there are. */
export function overflow<T>(items: readonly T[], max: number): { shown: T[]; more: number } {
  return { shown: items.slice(0, max), more: Math.max(0, items.length - max) };
}

export type Band = "ranked" | "agreed";

/** The days covered by suggested windows, overlaps merged. A window everyone agreed on wins. */
export function bandsOf(
  ranked: readonly { start: DayNum; end: DayNum }[],
  agreed: readonly { start: DayNum; end: DayNum }[],
): Map<DayNum, Band> {
  const out = new Map<DayNum, Band>();
  for (const w of ranked) for (let d = w.start; d <= w.end; d++) out.set(d, "ranked");
  for (const w of agreed) for (let d = w.start; d <= w.end; d++) out.set(d, "agreed");
  return out;
}

/** Whether a banded day starts or ends its run of the same band. */
export function bandEdges(bands: ReadonlyMap<DayNum, Band>, day: DayNum): { start: boolean; end: boolean } {
  const band = bands.get(day);
  return { start: bands.get(day - 1) !== band, end: bands.get(day + 1) !== band };
}

/** Holidays that save leave in a window, one per day and name, with every member it helps. */
export function groupHelps(helps: readonly Helper[]): { day: DayNum; name: string; memberIds: string[] }[] {
  const out: { day: DayNum; name: string; memberIds: string[] }[] = [];
  for (const h of helps) {
    const same = out.find((o) => o.day === h.day && o.name === h.name);
    if (!same) out.push({ day: h.day, name: h.name, memberIds: [h.memberId] });
    else if (!same.memberIds.includes(h.memberId)) same.memberIds.push(h.memberId);
  }
  return out;
}

/** How many members voted each way on a window. */
export function voteCounts(
  members: Iterable<Pick<MemberRecord, "votes">>,
  key: WindowKey,
): Record<Vote, number> {
  const counts: Record<Vote, number> = { yes: 0, maybe: 0, no: 0 };
  for (const m of members) {
    const v = m.votes[key];
    if (v) counts[v]++;
  }
  return counts;
}

/** Votes with this window's vote set, or removed when `vote` is null. */
export function withVote(
  votes: Record<WindowKey, Vote>,
  key: WindowKey,
  vote: Vote | null,
): Record<WindowKey, Vote> {
  const next = { ...votes };
  if (vote === null) delete next[key];
  else next[key] = vote;
  return next;
}

/** The calendar years a set of months touches. */
export function yearsOf(months: readonly { year: number; month: number }[]): number[] {
  return [...new Set(months.map((m) => m.year))].sort((a, b) => a - b);
}

/** The vote control's options, in order. */
export const VOTES: readonly Vote[] = ["yes", "maybe", "no"];

/** Tapping a vote picks it, or clears it when it's already yours. */
export function clickedVote(current: Vote | undefined, clicked: Vote): Vote | null {
  return current === clicked ? null : clicked;
}

/** The vote an arrow key moves to from option `index`, wrapping at the ends. Null for other keys. */
export function arrowVote(index: number, key: string): Vote | null {
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[key];
  if (!step) return null;
  return VOTES[(index + step + VOTES.length) % VOTES.length] ?? null;
}
