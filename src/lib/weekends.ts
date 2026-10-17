/**
 * Countries whose weekend isn't Saturday + Sunday. Index 0 = Monday.
 * `date-holidays` has no weekend data, so this table is maintained by hand.
 */
const FRI_SAT = [true, true, true, true, false, false, true];
const FRI = [true, true, true, true, false, true, true];
const SAT = [true, true, true, true, true, false, true];
const THU_FRI = [true, true, true, false, false, true, true];

const WEEKENDS: Record<string, boolean[]> = {
  BH: FRI_SAT,
  BD: FRI_SAT,
  DZ: FRI_SAT,
  EG: FRI_SAT,
  IL: FRI_SAT,
  IQ: FRI_SAT,
  JO: FRI_SAT,
  KW: FRI_SAT,
  LY: FRI_SAT,
  MV: FRI_SAT,
  OM: FRI_SAT,
  QA: FRI_SAT,
  SA: FRI_SAT,
  SD: FRI_SAT,
  SY: FRI_SAT,
  YE: FRI_SAT,
  IR: FRI,
  AF: THU_FRI,
  NP: SAT,
};

export const STANDARD_WEEK = [true, true, true, true, true, false, false];

/** Working days (Monday first) for a country. */
export function defaultWorkWeek(country: string): boolean[] {
  return [...(WEEKENDS[country] ?? STANDARD_WEEK)];
}

export function sameWeek(a: boolean[], b: boolean[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
