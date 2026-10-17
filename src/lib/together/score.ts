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
}

export const TOP_N = 8;
export const FAIRNESS = 0.5;

export function windowKey(start: DayNum, end: DayNum): WindowKey {
  return `${toIso(start)}..${toIso(end)}`;
}

export function groupRange(g: GroupRecord): { start: DayNum; end: DayNum } {
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

/** A blocked day is never off, whatever the weekday or holiday. */
function isOff(m: Days, day: DayNum): boolean {
  if (m.blocked.has(day)) return false;
  return !m.workWeek[weekdayMon0(day)] || m.holidays.has(day) || m.off.has(day);
}

function isCharged(m: Days, day: DayNum): boolean {
  return !!m.workWeek[weekdayMon0(day)] && !m.holidays.has(day) && !m.off.has(day);
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

  const proposed = new Map<WindowKey, string[]>();
  for (const m of members) {
    for (const k of m.record.proposals) {
      const by = proposed.get(k) ?? [];
      if (!by.includes(m.id)) by.push(m.id);
      proposed.set(k, by);
    }
  }
  const proposals = fromKeys(members, days, proposed);

  const agreedKeys = new Map<WindowKey, string[]>();
  if (members.length > 0) {
    for (const k of Object.keys(members[0]?.record.votes ?? {}) as WindowKey[]) {
      if (members.every((m) => m.record.votes[k] === "yes")) agreedKeys.set(k, proposed.get(k) ?? []);
    }
  }
  const agreed = fromKeys(members, days, agreedKeys);

  return {
    ranked: members.length === 0 ? [] : rank(group, members, days, today, proposed),
    proposals,
    agreed,
  };
}

function rank(
  group: GroupRecord,
  members: ScoreMember[],
  days: Days[],
  today: DayNum,
  proposed: Map<WindowKey, string[]>,
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

  const found = new Map<WindowKey, ScoredWindow>();
  for (let start = lo; start <= hi; start++) {
    for (let len = group.minLength; len <= group.maxLength; len++) {
      let a = start;
      let b = start + len - 1;
      if (b > hi) break;
      while (a > lo && offAll[a - 1 - lo]) a--;
      while (b < hi && offAll[b + 1 - lo]) b++;
      if (b - a + 1 > group.maxLength) continue;
      const k = windowKey(a, b);
      if (found.has(k)) continue;

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
      if (!ok) continue;

      const length = b - a + 1;
      const costMap: Record<string, number> = {};
      members.forEach((m, j) => {
        costMap[m.id] = costs[j] as number;
      });
      found.set(k, {
        key: k,
        start: a,
        end: b,
        length,
        score: formula(length, costs),
        costs: costMap,
        flagged: [],
        helps: helpsFor(members, days, a, b),
        proposedBy: [],
      });
    }
  }

  const sorted = [...found.values()]
    .filter((w) => !proposed.has(w.key))
    .sort((x, y) => y.score - x.score || x.start - y.start);

  const kept: ScoredWindow[] = [];
  for (const w of sorted) {
    const tooClose = kept.some((k) => {
      const overlap = Math.min(k.end, w.end) - Math.max(k.start, w.start) + 1;
      return overlap > Math.min(k.length, w.length) / 2;
    });
    if (tooClose) continue;
    kept.push(w);
    if (kept.length === TOP_N) break;
  }
  return kept;
}

function helpsFor(members: ScoreMember[], days: Days[], start: DayNum, end: DayNum): Helper[] {
  const helps: Helper[] = [];
  members.forEach((m, i) => {
    const workWeek = (days[i] as Days).workWeek;
    for (const h of m.holidays) {
      if (h.day >= start && h.day <= end && workWeek[weekdayMon0(h.day)]) {
        helps.push({ memberId: m.id, day: h.day, name: h.name });
      }
    }
  });
  return helps.sort((a, b) => a.day - b.day);
}
