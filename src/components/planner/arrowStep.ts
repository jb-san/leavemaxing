/** How far each arrow key moves between days: a day sideways, a week up and down. */
export const ARROW_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/**
 * The day an arrow key moves to from `from`, stepping over disabled days (past ones, in Together) in
 * the same direction. Null when only disabled days, or no days, lie that way.
 */
export function arrowStep(
  from: number,
  delta: number,
  at: (day: number) => "enabled" | "disabled" | undefined,
): number | null {
  let day = from + delta;
  let state = at(day);
  while (state === "disabled") {
    day += delta;
    state = at(day);
  }
  return state === "enabled" ? day : null;
}
