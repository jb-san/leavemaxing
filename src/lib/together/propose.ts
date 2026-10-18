import type { DayNum } from "../dates";
import { LIMITS, type WindowKey } from "./protocol";
import { windowKey } from "./score";

/** The longest range a proposal can cover: the longest trip a group can set. */
export const MAX_PROPOSAL = LIMITS.maxLength;
/** The shortest range a proposal can cover: the shortest trip a group can set. */
export const MIN_PROPOSAL = LIMITS.minLength;

/** Dates being picked for a proposal. `end` is null until the second tap. */
export interface Pick {
  start: DayNum;
  end: DayNum | null;
  /** The range was longer than MAX_PROPOSAL, so its end was brought in. */
  clamped: boolean;
}

/**
 * The first tap sets the start and the second the end, swapping them if the end comes first.
 * A third tap starts again. A range longer than `max` keeps its start and ends early.
 */
export function pickDay(pick: Pick | null, day: DayNum, max: number = MAX_PROPOSAL): Pick {
  if (!pick || pick.end !== null) return { start: day, end: null, clamped: false };
  const start = Math.min(pick.start, day);
  const end = Math.max(pick.start, day);
  const clamped = end - start + 1 > max;
  return { start, end: clamped ? start + max - 1 : end, clamped };
}

/** What's picked when the sheet opens: nothing, or a start day so the next tap picks the end. */
export function openPick(start?: DayNum): Pick | null {
  return start === undefined ? null : pickDay(null, start);
}

/** Whether a day is part of the pick so far. */
export function inPick(pick: Pick | null, day: DayNum): boolean {
  if (!pick) return false;
  return day >= pick.start && day <= (pick.end ?? pick.start);
}

/** A finished pick shorter than the shortest trip. */
export function tooShort(pick: Pick | null): boolean {
  return pick?.end != null && pick.end - pick.start + 1 < MIN_PROPOSAL;
}

/** The window key for a finished pick, or null while it's still being picked or is too short. */
export function pickedKey(pick: Pick | null): WindowKey | null {
  if (!pick || pick.end === null || tooShort(pick)) return null;
  return windowKey(pick.start, pick.end);
}

/** Proposals with the key added, or the same array if it's already there. */
export function withProposal(proposals: WindowKey[], key: WindowKey): WindowKey[] {
  return proposals.includes(key) ? proposals : [...proposals, key];
}

/** Proposals without the key. */
export function withoutProposal(proposals: readonly WindowKey[], key: WindowKey): WindowKey[] {
  return proposals.filter((k) => k !== key);
}
