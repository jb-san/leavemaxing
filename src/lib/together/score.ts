import { type DayNum, dayNum, daysInMonth, toIso, weekdayMon0 } from "~/lib/dates";
import type { HolidayDay } from "~/lib/planner/types";
import type { GroupRecord, MemberRecord, WindowKey } from "./protocol";
import { parseWindowKey } from "./protocol";

export interface ScoreMember {
  id: string;
  record: MemberRecord;
  holidays: HolidayDay[];
}

export interface Helper {
  memberId: string;
  day: DayNum;
  name: string;
}

export interface ScoredWindow {
  key: WindowKey;
  start: DayNum;
  end: DayNum;
  length: number;
  score: number;
  costs: Record<string, number>;
  flagged: string[];
  helps: Helper[];
  proposedBy: string[];
}

export interface Scored {
  ranked: ScoredWindow[];
  proposals: ScoredWindow[];
  agreed: ScoredWindow[];
  /** Windows someone voted on that are no longer ranked, proposed or agreed, so votes never vanish. */
  voted: ScoredWindow[];
}

export const TOP_N = 8;
export const FAIRNESS = 0.5;

export function windowKey(start: DayNum, end: DayNum): WindowKey {
  return `${toIso(start)}..${toIso(end)}`;
}

export function groupRange(g: Pick<GroupRecord, "months">): { start: DayNum; end: DayNum } {
  let start = Infinity;
  let end = -Infinity;
  for (const { year, month } of g.months) {
    start = Math.min(start, dayNum(year, month, 1));
    end = Math.max(end, dayNum(year, month, daysInMonth(year, month)));
  }
  return { start, end };
}

interface Days {
  blocked: Set<number>;
  off: Set<number>;
  holidays: Map<number, string>;
  workWeek: boolean[];
}

function daysOf(m: ScoreMember): Days {
  return {
    blocked: new Set(m.record.blocked),
    off: new Set(m.record.customOff),
    holidays: new Map(m.holidays.map((h) => [h.day, h.name])),
    workWeek: m.record.workWeek,
  };
}

/** In the member's work week and not a public holiday or a day off of their own. Ignores blocked days. */
function isWorking(m: Days, day: DayNum): boolean {
  return Boolean(m.workWeek[weekdayMon0(day)]) && !m.holidays.has(day) && !m.off.has(day);
}

/** A blocked day is never off, whatever the weekday or holiday. */
function isOff(m: Days, day: DayNum): boolean {
  if (m.blocked.has(day)) return false;
  return !isWorking(m, day);
}

function isCharged(m: Days, day: DayNum): boolean {
  return !isOff(m, day);
}

function cost(m: Days, start: DayNum, end: DayNum): number {
  let n = 0;
  for (let day = start; day <= end; day++) if (isCharged(m, day)) n++;
  return n;
}

/** Leave days a member spends on a window. */
export function costFor(m: ScoreMember, start: DayNum, end: DayNum): number {
  return cost(daysOf(m), start, end);
}

/**
 * The member's working days from `start` to `end`: the days "Add to my plan" locks as leave. Blocked
 * days make no difference here. A blocked workday is still a working day, and a blocked weekend or
 * holiday is still not one. `costFor` instead charges every blocked day, so when the range holds a
 * blocked weekend or holiday, `costFor` is more than this list's length.
 */
export function workingDays(m: ScoreMember, start: DayNum, end: DayNum): DayNum[] {
  const days = daysOf(m);
  const out: DayNum[] = [];
  for (let day = start; day <= end; day++) if (isWorking(days, day)) out.push(day);
  return out;
}

function formula(length: number, costs: number[]): number {
  if (costs.length === 0) return 0;
  const sum = costs.reduce((a, b) => a + b, 0);
  const spread = Math.max(...costs) - Math.min(...costs);
  return (length * costs.length) / (sum + 1) - FAIRNESS * spread;
}

function describe(
  members: ScoreMember[],
  days: Days[],
  start: DayNum,
  end: DayNum,
  proposedBy: string[] = [],
): ScoredWindow {
  const costs: Record<string, number> = {};
  const flagged: string[] = [];
  members.forEach((m, i) => {
    const dd = days[i] as Days;
    const c = cost(dd, start, end);
    costs[m.id] = c;
    let blocked = false;
    for (const b of dd.blocked) if (b >= start && b <= end) blocked = true;
    if (blocked || c > m.record.allowance) flagged.push(m.id);
  });
  const length = end - start + 1;
  return {
    key: windowKey(start, end),
    start,
    end,
    length,
    score: formula(length, Object.values(costs)),
    costs,
    flagged,
    helps: helpsFor(members, days, start, end),
    proposedBy,
  };
}

function fromKeys(members: ScoreMember[], days: Days[], keys: Map<WindowKey, string[]>): ScoredWindow[] {
  const out: ScoredWindow[] = [];
  for (const [k, by] of keys) {
    const range = parseWindowKey(k);
    if (range) out.push(describe(members, days, range.start, range.end, by));
  }
  return out.sort((a, b) => b.score - a.score || a.start - b.start);
}

export function scoreWindows(group: GroupRecord, members: ScoreMember[], today: DayNum): Scored {
  const days = members.map(daysOf);
  // Proposals, votes and agreed dates that start before today, or fall outside the group's months,
  // are history: no list, no calendar band and no agreed count.
  const range = groupRange(group);
  const current = (k: WindowKey) => {
    const w = parseWindowKey(k);
    return w !== null && w.start >= today && w.start >= range.start && w.end <= range.end;
  };

  const proposed = new Map<WindowKey, string[]>();
  for (const m of members) {
    for (const k of m.record.proposals) {
      if (!current(k)) continue;
      const by = proposed.get(k) ?? [];
      if (!by.includes(m.id)) by.push(m.id);
      proposed.set(k, by);
    }
  }
  const proposals = fromKeys(members, days, proposed);

  const agreedKeys = new Map<WindowKey, string[]>();
  if (members.length > 0) {
    for (const k of Object.keys(members[0]?.record.votes ?? {}) as WindowKey[]) {
      if (current(k) && members.every((m) => m.record.votes[k] === "yes")) {
        agreedKeys.set(k, proposed.get(k) ?? []);
      }
    }
  }
  const agreed = fromKeys(members, days, agreedKeys);
  const ranked = members.length === 0 ? [] : rank(group, members, days, today, proposals);

  // Scored the way proposals are, once each, when nothing else already lists them.
  const listed = new Set([...ranked, ...proposals, ...agreed].map((w) => w.key));
  const votedKeys = new Map<WindowKey, string[]>();
  for (const m of members) {
    for (const k of Object.keys(m.record.votes) as WindowKey[]) {
      if (current(k) && !listed.has(k)) votedKeys.set(k, []);
    }
  }

  return { ranked, proposals, agreed, voted: fromKeys(members, days, votedKeys) };
}

function rank(
  group: GroupRecord,
  members: ScoreMember[],
  days: Days[],
  today: DayNum,
  proposals: ScoredWindow[],
): ScoredWindow[] {
  const range = groupRange(group);
  const lo = Math.max(range.start, today + 1);
  const hi = range.end;
  if (lo > hi) return [];

  const size = hi - lo + 1;
  const offAll = new Uint8Array(size);
  // Prefix sums over [lo, hi]: charged days and blocked days per member.
  const prefix = days.map(() => ({ charged: new Int32Array(size + 1), blocked: new Int32Array(size + 1) }));
  for (let i = 0; i < size; i++) {
    const day = lo + i;
    let everyoneOff = 1;
    days.forEach((m, j) => {
      const p = prefix[j];
      if (!p) return;
      p.charged[i + 1] = (p.charged[i] ?? 0) + (isCharged(m, day) ? 1 : 0);
      p.blocked[i + 1] = (p.blocked[i] ?? 0) + (m.blocked.has(day) ? 1 : 0);
      if (!isOff(m, day)) everyoneOff = 0;
    });
    offAll[i] = everyoneOff;
  }

  interface Candidate {
    a: DayNum;
    b: DayNum;
    score: number;
    costs: number[];
  }
  const seen = new Set<number>();
  const found: Candidate[] = [];
  for (let start = lo; start <= hi; start++) {
    for (let len = group.minLength; len <= group.maxLength; len++) {
      let a = start;
      let b = start + len - 1;
      if (b > hi) break;
      while (a > lo && offAll[a - 1 - lo]) a--;
      while (b < hi && offAll[b + 1 - lo]) b++;
      if (b - a + 1 > group.maxLength) continue;
      const id = (a - lo) * 4096 + (b - lo);
      if (seen.has(id)) continue;
      seen.add(id);

      const ia = a - lo;
      const ib = b - lo + 1;
      let ok = true;
      const costs: number[] = [];
      for (let j = 0; j < days.length; j++) {
        const p = prefix[j] as (typeof prefix)[number];
        const c = (p.charged[ib] ?? 0) - (p.charged[ia] ?? 0);
        const hasBlocked = (p.blocked[ib] ?? 0) - (p.blocked[ia] ?? 0) > 0;
        if (hasBlocked || c > (members[j] as ScoreMember).record.allowance) {
          ok = false;
          break;
        }
        costs.push(c);
      }
      if (ok) found.push({ a, b, score: formula(b - a + 1, costs), costs });
    }
  }
  found.sort((x, y) => y.score - x.score || x.a - y.a);

  // Proposals take slots for overlap purposes but are not part of the ranking.
  const taken = proposals.map((w) => ({ start: w.start, end: w.end, length: w.length }));
  const kept: Candidate[] = [];
  for (const w of found) {
    const length = w.b - w.a + 1;
    const tooClose = taken.some((k) => {
      const overlap = Math.min(k.end, w.b) - Math.max(k.start, w.a) + 1;
      return overlap > Math.min(k.length, length) / 2;
    });
    if (tooClose) continue;
    taken.push({ start: w.a, end: w.b, length });
    kept.push(w);
    if (kept.length === TOP_N) break;
  }

  return kept.map((w) => {
    const costs: Record<string, number> = {};
    members.forEach((m, j) => {
      costs[m.id] = w.costs[j] as number;
    });
    return {
      key: windowKey(w.a, w.b),
      start: w.a,
      end: w.b,
      length: w.b - w.a + 1,
      score: w.score,
      costs,
      flagged: [],
      helps: helpsFor(members, days, w.a, w.b),
      proposedBy: [],
    };
  });
}

function helpsFor(members: ScoreMember[], days: Days[], start: DayNum, end: DayNum): Helper[] {
  const helps: Helper[] = [];
  members.forEach((m, i) => {
    const workWeek = (days[i] as Days).workWeek;
    for (const h of m.holidays) {
      if (
        h.day >= start &&
        h.day <= end &&
        workWeek[weekdayMon0(h.day)] &&
        !(days[i] as Days).blocked.has(h.day)
      ) {
        helps.push({ memberId: m.id, day: h.day, name: h.name });
      }
    }
  });
  return helps.sort((a, b) => a.day - b.day);
}
