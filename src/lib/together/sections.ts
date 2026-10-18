import type { Scored, ScoredWindow } from "./score";

export interface Sections {
  agreed: ScoredWindow[];
  proposals: ScoredWindow[];
  /** Ranked windows nobody has agreed on yet. Empty means the section is hidden. */
  suggested: ScoredWindow[];
  /** No window works for everyone at all: show the "widen the months" copy instead. */
  empty: boolean;
}

/** Which lists the group view shows. An agreed window appears only under "Works for everyone". */
export function sections(scored: Scored): Sections {
  const agreed = new Set(scored.agreed.map((w) => w.key));
  return {
    agreed: scored.agreed,
    proposals: scored.proposals,
    suggested: scored.ranked.filter((w) => !agreed.has(w.key)),
    empty: scored.ranked.length === 0,
  };
}
