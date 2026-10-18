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

/** A band's fill: soft lime for suggested dates, solid lime for agreed ones, red hatching for vetoed ones. */
export type Band = "ranked" | "agreed" | "vetoed";

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
export function bandEdges<T>(bands: ReadonlyMap<DayNum, T>, day: DayNum): { start: boolean; end: boolean } {
  const band = bands.get(day);
  return { start: bands.get(day - 1) !== band, end: bands.get(day + 1) !== band };
}

/**
 * For each day inside an open proposal, who proposed it, in order and once each. A proposal everyone
 * agreed on is left out: it is drawn as agreed instead.
 */
export function proposedDays(
  proposals: readonly { key: WindowKey; start: DayNum; end: DayNum; proposedBy: readonly string[] }[],
  agreed: readonly { key: WindowKey }[],
): Map<DayNum, string[]> {
  const done = new Set(agreed.map((w) => w.key));
  const out = new Map<DayNum, string[]>();
  for (const w of proposals) {
    if (done.has(w.key)) continue;
    for (let d = w.start; d <= w.end; d++) {
      const ids = out.get(d) ?? [];
      for (const id of w.proposedBy) if (!ids.includes(id)) ids.push(id);
      out.set(d, ids);
    }
  }
  return out;
}

/** Whether a day in a set of days starts or ends its run of consecutive days. */
export function runEdges(days: ReadonlyMap<DayNum, unknown>, day: DayNum): { start: boolean; end: boolean } {
  return { start: !days.has(day - 1), end: !days.has(day + 1) };
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

/** A window of dates as the calendar draws it. */
export type Win = { key: WindowKey; start: DayNum; end: DayNum };

/**
 * Where a day stands with the group. Agreed: inside dates everyone said works. Open: inside dates
 * nobody said they can't do. Vetoed: every window holding the day has at least one "Can't".
 */
export type Tone = "agreed" | "open" | "vetoed";

/**
 * A day's tone, with whether it keeps a suggested window's soft fill (`ranked`, only from a window
 * nobody vetoed) and a proposal's dashed outline (`proposed`, on every day of any proposal). Agreed
 * days drop both.
 */
export interface DayTone {
  tone: Tone;
  ranked: boolean;
  proposed: boolean;
}

const vetoedBy = (votes: Iterable<Pick<MemberRecord, "votes">>, key: WindowKey) => {
  for (const m of votes) if (m.votes[key] === "no") return true;
  return false;
};
const holds = (w: Win, day: DayNum) => day >= w.start && day <= w.end;

function toneOf(
  day: DayNum,
  ranked: readonly Win[],
  proposals: readonly Win[],
  agreed: readonly Win[],
  vetoed: (key: WindowKey) => boolean,
): DayTone | null {
  if (agreed.some((w) => holds(w, day))) return { tone: "agreed", ranked: false, proposed: false };
  const r = ranked.filter((w) => holds(w, day));
  const p = proposals.filter((w) => holds(w, day));
  if (r.length === 0 && p.length === 0) return null;
  const openRanked = r.some((w) => !vetoed(w.key));
  const openProposed = p.some((w) => !vetoed(w.key));
  // A proposal's outline covers all of it that isn't agreed, whatever its votes.
  const proposed = p.length > 0;
  if (openRanked || openProposed) return { tone: "open", ranked: openRanked, proposed };
  return { tone: "vetoed", ranked: false, proposed };
}

/** The tone of one day, decided for that day alone, from the windows holding it and everyone's votes. */
export function dayTone(
  day: DayNum,
  ranked: readonly Win[],
  proposals: readonly Win[],
  agreed: readonly Win[],
  votes: readonly Pick<MemberRecord, "votes">[],
): DayTone | null {
  return toneOf(day, ranked, proposals, agreed, (key) => vetoedBy(votes, key));
}

/** `dayTone` for every day inside any window. */
export function dayTones(
  ranked: readonly Win[],
  proposals: readonly Win[],
  agreed: readonly Win[],
  votes: readonly Pick<MemberRecord, "votes">[],
): Map<DayNum, DayTone> {
  const vetoed = new Map<WindowKey, boolean>();
  const isVetoed = (key: WindowKey) => {
    let v = vetoed.get(key);
    if (v === undefined) {
      v = vetoedBy(votes, key);
      vetoed.set(key, v);
    }
    return v;
  };
  const days = new Set<DayNum>();
  for (const w of [...ranked, ...proposals, ...agreed]) for (let d = w.start; d <= w.end; d++) days.add(d);
  const out = new Map<DayNum, DayTone>();
  for (const d of [...days].sort((a, b) => a - b)) {
    const tone = toneOf(d, ranked, proposals, agreed, isVetoed);
    if (tone) out.set(d, tone);
  }
  return out;
}

/** Agreed windows, then ranked ones in rank order, then proposals, each key once. */
function ordered<W extends Win>(ranked: readonly W[], proposals: readonly W[], agreed: readonly W[]): W[] {
  const seen = new Set<WindowKey>();
  const out: W[] = [];
  for (const w of [...agreed, ...ranked, ...proposals]) {
    if (seen.has(w.key)) continue;
    seen.add(w.key);
    out.push(w);
  }
  return out;
}

/** The windows holding a day: agreed first, then ranked in rank order, then proposals, once each. */
export function windowsOn<W extends Win>(
  day: DayNum,
  ranked: readonly W[],
  proposals: readonly W[],
  agreed: readonly W[],
): W[] {
  return ordered(ranked, proposals, agreed).filter((w) => holds(w, day));
}

/** One member's vote on a window, or null if they haven't voted. */
export interface MemberVote {
  id: string;
  vote: Vote | null;
}

/** Each member's vote on a window, in member order. */
export function memberVotes(
  members: Iterable<[string, Pick<MemberRecord, "votes">]>,
  key: WindowKey,
): MemberVote[] {
  return [...members].map(([id, m]) => ({ id, vote: m.votes[key] ?? null }));
}

/** The votes drawn on a window's first day: members who voted first, then the rest, up to `max`. */
export interface Cluster {
  key: WindowKey;
  shown: MemberVote[];
  more: number;
}

/**
 * A vote cluster on the first day of each window. When windows start on the same day, the
 * higher-ranked one keeps it: agreed, then ranked in rank order, then proposals.
 */
export function startClusters(
  ranked: readonly Win[],
  proposals: readonly Win[],
  agreed: readonly Win[],
  members: Iterable<[string, Pick<MemberRecord, "votes">]>,
  max = 3,
): Map<DayNum, Cluster> {
  const list = [...members];
  const out = new Map<DayNum, Cluster>();
  for (const w of ordered(ranked, proposals, agreed)) {
    if (out.has(w.start)) continue;
    const votes = memberVotes(list, w.key);
    const sorted = [...votes.filter((v) => v.vote), ...votes.filter((v) => !v.vote)];
    out.set(w.start, { key: w.key, ...overflow(sorted, max) });
  }
  return new Map([...out].sort(([a], [b]) => a - b));
}
