import { type DayNum, leaveYearRange, parts, weekdayMon0 } from "../dates";
import type { Break, DayKind, HolidayDay, Plan, PlanInput, Style } from "./types";

/** Days of context scanned before and after the leave year so breaks can cross its edges. */
const CONTEXT_DAYS = 21;
/** Run lengths are tracked exactly up to this cap. */
const RUN_CAP = 60;

/**
 * Value of one break of `len` days that contains leave. The planner maximises the
 * sum over all breaks, so the curve's shape is what defines each style.
 */
export function breakValue(style: Style, len: number): number {
  switch (style) {
    case "weekends":
      return len <= 5 ? len : 5 + (len - 5) * 0.6;
    case "balanced": {
      let f: number;
      if (len <= 3) f = 1.1;
      else if (len === 4) f = 1.3;
      else if (len === 5) f = 1.5;
      else if (len === 6) f = 1.7;
      else if (len <= 12) f = 1.9;
      else f = Math.max(1, 1.9 - (len - 12) * 0.05);
      return len * f;
    }
    case "long":
      return len ** 1.6;
  }
}

const MONTH_BONUS: Record<Style, number> = { weekends: 1.5, balanced: 2.5, long: 5 };

const Cell = { Free: 0, Work: 1, Choosable: 2, Locked: 3 } as const;

interface Timeline {
  first: DayNum;
  cells: Uint8Array;
  kinds: DayKind[];
  holidayByDay: Map<DayNum, HolidayDay[]>;
  range: { start: DayNum; end: DayNum };
  lockedInYear: DayNum[];
}

function buildTimeline(input: PlanInput): Timeline {
  const range = leaveYearRange(input.year, input.yearStart);
  const first = range.start - CONTEXT_DAYS;
  const last = range.end + CONTEXT_DAYS;
  const n = last - first + 1;

  const holidayByDay = new Map<DayNum, HolidayDay[]>();
  for (const h of input.holidays) {
    if (h.day < first || h.day > last) continue;
    const list = holidayByDay.get(h.day);
    if (list) {
      if (!list.some((x) => x.name === h.name)) list.push(h);
    } else holidayByDay.set(h.day, [h]);
  }
  const custom = new Set(input.customOff);
  const locked = new Set(input.locked);
  const blocked = new Set(input.blocked);

  const cells = new Uint8Array(n);
  const kinds: DayKind[] = new Array(n);
  const lockedInYear: DayNum[] = [];
  for (let i = 0; i < n; i++) {
    const day = first + i;
    const working = input.workWeek[weekdayMon0(day)] ?? true;
    // A blocked day is never free, even on a weekend or public holiday.
    if (blocked.has(day)) {
      cells[i] = Cell.Work;
      kinds[i] = "blocked";
    } else if (holidayByDay.has(day)) {
      cells[i] = Cell.Free;
      kinds[i] = "holiday";
    } else if (!working) {
      cells[i] = Cell.Free;
      kinds[i] = "weekend";
    } else if (custom.has(day)) {
      cells[i] = Cell.Free;
      kinds[i] = "custom";
    } else if (locked.has(day)) {
      cells[i] = Cell.Locked;
      kinds[i] = "locked";
      if (day >= range.start && day <= range.end) lockedInYear.push(day);
    } else if (day >= range.start && day <= range.end && day >= input.today) {
      cells[i] = Cell.Choosable;
      kinds[i] = "work";
    } else {
      cells[i] = Cell.Work;
      kinds[i] = "work";
    }
  }
  return { first, cells, kinds, holidayByDay, range, lockedInYear };
}

/**
 * Exact dynamic programme over the timeline. State after each day is
 * (leave used, current run length, run contains leave). A run's value is added
 * when it ends, so the result is the best possible plan for the chosen style.
 */
function solve(
  input: PlanInput,
  tl: Timeline,
  budget: number,
  dayBonus: Float64Array,
  paces: Pace[] = [],
): { taken: Uint8Array; used: number } {
  const n = tl.cells.length;
  const U = budget;
  const R = RUN_CAP;
  const S = (U + 1) * (R + 1) * 2;
  const idx = (u: number, r: number, h: number) => (u * (R + 1) + r) * 2 + h;

  const minBreak = Math.max(1, input.minBreak);
  const maxBreak = input.maxBreak ?? Number.POSITIVE_INFINITY;
  const values = new Float64Array(R + 2);
  for (let r = 0; r <= R + 1; r++) values[r] = breakValue(input.style, r);
  const closeValue = (r: number, h: number): number => {
    if (r === 0 || h === 0) return 0;
    if (r < minBreak || r > maxBreak) return Number.NEGATIVE_INFINITY;
    return values[r] as number;
  };

  let cur = new Float64Array(S).fill(Number.NEGATIVE_INFINITY);
  let next = new Float64Array(S);
  cur[idx(0, 0, 0)] = 0;
  const prev = new Int32Array(n * S);
  const took = new Uint8Array(n * S);

  const paceAt = new Map(paces.map((p) => [p.at, p]));
  for (let i = 0; i < n; i++) {
    const pace = paceAt.get(i);
    if (pace) {
      // Drop states that are too far ahead of or behind pace, unless that drops everything.
      const kept = cur.slice();
      let any = false;
      for (let u = 0; u <= U; u++) {
        const outside = u < pace.lo || u > pace.hi;
        for (let r = 0; r <= R; r++) {
          for (let h = 0; h < 2; h++) {
            const s = idx(u, r, h);
            if (outside) kept[s] = Number.NEGATIVE_INFINITY;
            else if (kept[s] !== Number.NEGATIVE_INFINITY) any = true;
          }
        }
      }
      if (any) cur = kept;
    }
    next.fill(Number.NEGATIVE_INFINITY);
    const cell = tl.cells[i];
    const base = i * S;
    const monthBonus = dayBonus[i] as number;

    for (let u = 0; u <= U; u++) {
      for (let r = 0; r <= R; r++) {
        for (let h = 0; h < 2; h++) {
          const s = idx(u, r, h);
          const v = cur[s] as number;
          if (v === Number.NEGATIVE_INFINITY) continue;
          const r1 = r < R ? r + 1 : R;

          if (cell === Cell.Free || cell === Cell.Locked) {
            const h1 = cell === Cell.Locked ? 1 : h;
            if (h1 && r1 > maxBreak) continue;
            const t = idx(u, r1, h1);
            if (v > (next[t] as number)) {
              next[t] = v;
              prev[base + t] = s;
              took[base + t] = 0;
            }
            continue;
          }

          // Work through the day: the current run ends.
          const closed = v + closeValue(r, h);
          if (closed !== Number.NEGATIVE_INFINITY) {
            const t = idx(u, 0, 0);
            if (closed > (next[t] as number)) {
              next[t] = closed;
              prev[base + t] = s;
              took[base + t] = 0;
            }
          }
          // Or take it as leave.
          if (cell === Cell.Choosable && u < U && !(r1 > maxBreak)) {
            const t = idx(u + 1, r1, 1);
            const tv = v + monthBonus;
            if (tv > (next[t] as number)) {
              next[t] = tv;
              prev[base + t] = s;
              took[base + t] = 1;
            }
          }
        }
      }
    }
    [cur, next] = [next, cur];
  }

  // Close the final run and pick the best end state, using as much budget as possible.
  for (let u = U; u >= 0; u--) {
    let best = Number.NEGATIVE_INFINITY;
    let bestState = -1;
    for (let r = 0; r <= R; r++) {
      for (let h = 0; h < 2; h++) {
        const s = idx(u, r, h);
        const v = (cur[s] as number) + closeValue(r, h);
        if (v > best) {
          best = v;
          bestState = s;
        }
      }
    }
    if (bestState >= 0) {
      const taken = new Uint8Array(n);
      let s = bestState;
      for (let i = n - 1; i >= 0; i--) {
        taken[i] = took[i * S + s] as number;
        s = prev[i * S + s] as number;
      }
      return { taken, used: u };
    }
  }
  return { taken: new Uint8Array(n), used: 0 };
}

/**
 * Pacing keeps plans from piling every day into the first months when later ones
 * are just as good. At each quarter boundary of the leave year, leave used so far
 * must stay within a band around the pro-rata share. `null` = no pacing.
 */
const PACING: Record<Style, number | null> = { weekends: 0.08, balanced: 0.15, long: null };

export interface Pace {
  /** Timeline index of the first day after the boundary. */
  at: number;
  lo: number;
  hi: number;
}

function pacing(input: PlanInput, tl: Timeline, budget: number): Pace[] {
  const slack = PACING[input.style];
  if (slack === null || budget < 4) return [];
  const start = parts(tl.range.start);
  const boundaries: number[] = [];
  const openQuarters = new Set<number>();
  for (let i = 0; i < tl.cells.length; i++) {
    const p = parts(tl.first + i);
    const q = Math.floor((p.year * 12 + p.month - (start.year * 12 + start.month)) / 3);
    if (tl.cells[i] === Cell.Choosable) openQuarters.add(q);
    if (p.day === 1 && q > 0 && q <= 3 && (p.month - start.month + 12) % 3 === 0) boundaries[q - 1] = i;
  }
  const open = [...openQuarters].sort((a, b) => a - b);
  if (open.length < 2) return [];
  const paces: Pace[] = [];
  for (let k = 0; k < 3; k++) {
    const at = boundaries[k];
    if (at === undefined) continue;
    const done = open.filter((q) => q <= k).length;
    if (done === 0 || done === open.length) continue;
    const target = (budget * done) / open.length;
    paces.push({ at, lo: Math.floor(target - budget * slack), hi: Math.ceil(target + budget * slack) });
  }
  return paces;
}

function monthBonuses(input: PlanInput, tl: Timeline): Float64Array {
  const bonus = new Float64Array(tl.cells.length);
  if (!input.months.length) return bonus;
  const months = new Set(input.months);
  for (let i = 0; i < tl.cells.length; i++) {
    if (tl.cells[i] === Cell.Choosable && months.has(parts(tl.first + i).month))
      bonus[i] = MONTH_BONUS[input.style];
  }
  return bonus;
}

export function plan(input: PlanInput, options: { spread?: boolean } = {}): Plan {
  const tl = buildTimeline(input);
  const warnings: string[] = [];
  const lockedCount = tl.lockedInYear.length;
  let budget = Math.max(0, Math.floor(input.budget) - lockedCount);
  if (lockedCount > input.budget) {
    warnings.push(`You've locked ${lockedCount} days, more than your ${input.budget}-day budget.`);
  }
  let choosable = 0;
  for (const c of tl.cells) if (c === Cell.Choosable) choosable++;
  if (budget > choosable) {
    warnings.push(
      `Only ${choosable} workdays are left in this leave year, so ${budget - choosable} days can't be placed.`,
    );
    budget = choosable;
  }

  const paces = options.spread === false ? [] : pacing(input, tl, budget);
  const { taken, used } =
    budget > 0
      ? solve(input, tl, budget, monthBonuses(input, tl), paces)
      : { taken: new Uint8Array(0), used: 0 };
  if (used < budget) {
    warnings.push(
      `${budget - used} days didn't fit with your break limits, so they're left unplanned. Try a shorter minimum break.`,
    );
  }

  const suggested: DayNum[] = [];
  for (let i = 0; i < taken.length; i++) if (taken[i]) suggested.push(tl.first + i);

  const breaks = findBreaks(tl, new Set(suggested));
  const withLeave = breaks.filter((b) => b.leave > 0);
  const daysOff = withLeave.reduce((sum, b) => sum + b.length, 0);
  const leaveUsed = suggested.length + lockedCount;

  return {
    suggested,
    locked: tl.lockedInYear,
    breaks,
    stats: {
      leaveUsed,
      daysOff,
      multiplier: leaveUsed > 0 ? daysOff / leaveUsed : 0,
      longest: withLeave.reduce((m, b) => Math.max(m, b.length), 0),
      breaksWithLeave: withLeave.length,
    },
    warnings,
  };
}

function findBreaks(tl: Timeline, suggested: Set<DayNum>): Break[] {
  const breaks: Break[] = [];
  const n = tl.cells.length;
  let i = 0;
  while (i < n) {
    const isOff = (j: number) =>
      tl.cells[j] === Cell.Free || tl.cells[j] === Cell.Locked || suggested.has(tl.first + j);
    if (!isOff(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && isOff(j + 1)) j++;
    const start = tl.first + i;
    const end = tl.first + j;
    const length = j - i + 1;
    let leave = 0;
    const holidays: HolidayDay[] = [];
    for (let k = i; k <= j; k++) {
      const day = tl.first + k;
      if (tl.cells[k] === Cell.Locked || suggested.has(day)) leave++;
      const hs = tl.holidayByDay.get(day);
      if (hs) holidays.push(...hs);
    }
    const overlapsYear = end >= tl.range.start && start <= tl.range.end;
    if (length >= 3 && (leave > 0 || holidays.length > 0) && overlapsYear) {
      breaks.push({ start, end, length, leave, holidays });
    }
    i = j + 1;
  }
  return breaks;
}

/** Classify every day in [from, to] for rendering, given a finished plan. */
export function classifyDays(
  input: PlanInput,
  result: Pick<Plan, "suggested">,
  from: DayNum,
  to: DayNum,
): Map<DayNum, DayKind> {
  const holidays = new Set(input.holidays.map((h) => h.day));
  const custom = new Set(input.customOff);
  const locked = new Set(input.locked);
  const blocked = new Set(input.blocked);
  const suggested = new Set(result.suggested);
  const out = new Map<DayNum, DayKind>();
  for (let d = from; d <= to; d++) {
    let k: DayKind;
    if (blocked.has(d)) k = "blocked";
    else if (holidays.has(d)) k = "holiday";
    else if (!(input.workWeek[weekdayMon0(d)] ?? true)) k = "weekend";
    else if (custom.has(d)) k = "custom";
    else if (locked.has(d)) k = "locked";
    else if (suggested.has(d)) k = "leave";
    else k = "work";
    out.set(d, k);
  }
  return out;
}
