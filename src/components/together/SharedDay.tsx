import { type CSSProperties, useMemo } from "react";
import type { DayCell } from "~/components/planner/MonthCards";
import { DayIcon } from "~/components/planner/ui";
import type { DayNum } from "~/lib/dates";
import {
  type Band,
  bandEdges,
  blockedBy,
  type Cluster,
  type DayTone,
  type MemberDayKind,
  type MemberVote,
  memberDayKind,
  overflow,
  runEdges,
  type Win,
} from "~/lib/together/calendar";
import { textOn } from "~/lib/together/member";
import type { MemberRecord, Vote, WindowKey } from "~/lib/together/protocol";
import { groupRange } from "~/lib/together/score";
import { SUNDAY_FIRST } from "~/lib/weekends";
import { dayLabel, t } from "./copy";

const ICON: Partial<Record<MemberDayKind, React.ReactNode>> = {
  holiday: DayIcon.sun,
  blocked: DayIcon.x,
  custom: DayIcon.star,
};

/** Dots shown under a day before the rest become "+n". */
const MAX_DOTS = 4;

const VOTE_MARK: Record<Vote, React.ReactNode> = { yes: DayIcon.check, maybe: "?", no: DayIcon.x };

type Month = { year: number; month: number };
type Span = { start: DayNum; end: DayNum };
/** A window as the calendar and its menu need it. */
export type CalWindow = Win & { length: number };

/** What every day of a shared calendar needs to know, worked out once per calendar. */
export interface Shared {
  me: MemberRecord;
  meId: string;
  members: Map<string, MemberRecord>;
  /** Your public holidays, by day. */
  holidays: Map<DayNum, string[]>;
  /** Who can't do each day. */
  cant: Map<DayNum, string[]>;
  today: DayNum;
  /** The first and last day of the group's months. */
  range: Span;
  sundayFirst: boolean;
  /** The group's months in order. */
  sorted: Month[];
}

/** The group's months and members, ready for `SharedDay`. Null until you're in the group. */
export function useShared(
  months: Month[],
  members: Map<string, MemberRecord>,
  meId: string,
  holidays: Map<DayNum, string[]>,
  today: DayNum,
): Shared | null {
  const sorted = useMemo(
    () => [...months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)),
    [months],
  );
  const range = useMemo(() => groupRange({ months }), [months]);
  const cant = useMemo(() => blockedBy(members), [members]);
  const me = members.get(meId);
  if (!me) return null;
  return {
    me,
    meId,
    members,
    holidays,
    cant,
    today,
    range,
    sundayFirst: SUNDAY_FIRST.has(me.country),
    sorted,
  };
}

/** What the group's windows add to each day: its tone, outline, vote cluster and the votes to read out. */
export interface Decor {
  /** Each day's fill: agreed, suggested or vetoed. */
  bands: ReadonlyMap<DayNum, Band>;
  tones: ReadonlyMap<DayNum, DayTone>;
  /** Days with a proposal's dashed outline. */
  outline: ReadonlyMap<DayNum, true>;
  /** Who proposed dates covering each day. */
  proposers: ReadonlyMap<DayNum, string[]>;
  clusters: ReadonlyMap<DayNum, Cluster>;
  /** Each window's votes, in member order. */
  votes: ReadonlyMap<WindowKey, MemberVote[]>;
  /** The windows holding a day, agreed first, then ranked, then proposals. */
  windowsOn: (day: DayNum) => CalWindow[];
}

/**
 * One day of a shared calendar: your own kind of day, a coloured dot for each other member who
 * can't, and a band behind it. In the group's calendar, `decor` adds the band's tone, a proposal's
 * outline, the votes on a window that starts here, and those votes in the day's name. Past days and
 * days outside the group's months can't be tapped.
 */
export function SharedDay({
  shared,
  day: d,
  cell: { index, col, count },
  bands,
  decor,
  pressed,
  leave = false,
  onClick,
}: {
  shared: Shared;
  day: DayNum;
  cell: DayCell;
  bands: ReadonlyMap<DayNum, Band>;
  decor?: Decor;
  pressed: (kind: MemberDayKind) => boolean;
  /** Draw a workday as a leave day, for dates being picked. */
  leave?: boolean;
  /** Gets the day's place on screen, to anchor a menu to it. */
  onClick: (rect: DOMRect) => void;
}) {
  const { me, meId, members, holidays, cant, today, range } = shared;
  const kind = memberDayKind(d, me, holidays);
  const others = (cant.get(d) ?? []).filter((id) => id !== meId);
  const names = holidays.get(d);
  const dots = overflow(others, MAX_DOTS);
  const band = bands.get(d);
  const edges = bandEdges(bands, d);
  const outlined = decor?.outline.has(d) ?? false;
  const run = outlined && decor ? runEdges(decor.outline, d) : null;
  const cluster = decor?.clusters.get(d);
  const name = (id: string) => members.get(id)?.name ?? "";
  const windows = (decor?.windowsOn(d) ?? []).map((w) => ({
    start: w.start,
    end: w.end,
    votes: (decor?.votes.get(w.key) ?? []).map((v) => ({
      name: name(v.id),
      you: v.id === meId,
      vote: v.vote,
    })),
  }));
  return (
    <button
      type="button"
      className="day"
      data-day={d}
      data-k={leave && kind === "work" ? "leave" : kind}
      data-today={d === today ? "" : undefined}
      data-past={d < today ? "" : undefined}
      data-br={band === "ranked" ? "leave" : band}
      data-s={band && (col === 0 || index === 0 || edges.start) ? "" : undefined}
      data-e={band && (col === 6 || index === count - 1 || edges.end) ? "" : undefined}
      data-pr={run ? "" : undefined}
      data-pr-s={run && (col === 0 || index === 0 || run.start) ? "" : undefined}
      data-pr-e={run && (col === 6 || index === count - 1 || run.end) ? "" : undefined}
      data-tone={decor?.tones.get(d)?.tone}
      // The hatching's column, so its stripes run on from one day to the next.
      style={band === "vetoed" ? ({ "--col": col } as CSSProperties) : undefined}
      disabled={d < today || d < range.start || d > range.end}
      aria-pressed={pressed(kind)}
      aria-label={dayLabel(
        d,
        kind,
        names ?? [],
        others.map(name),
        (decor?.proposers.get(d) ?? []).map((id) => (id === meId ? t.proposerYou : name(id))),
        windows,
      )}
      title={names?.join(", ")}
      onClick={(e) => onClick(e.currentTarget.getBoundingClientRect())}
    >
      <span className="n">{index + 1}</span>
      <span className="dots" aria-hidden="true">
        {dots.shown.map((id) => (
          <span key={id} className="dot" style={{ backgroundColor: members.get(id)?.color }} />
        ))}
        {dots.more > 0 && <span>+{dots.more}</span>}
      </span>
      <span className="mk">{ICON[kind]}</span>
      {cluster && (
        <span className="cl" data-flip={col === 6 ? "" : undefined} aria-hidden="true">
          {cluster.shown.map((v) => {
            const color = members.get(v.id)?.color ?? "#888888";
            return (
              <span
                key={v.id}
                data-vote={v.vote ?? undefined}
                data-none={v.vote ? undefined : ""}
                style={{ backgroundColor: color, color: textOn(color) }}
              >
                {v.vote && VOTE_MARK[v.vote]}
              </span>
            );
          })}
          {cluster.more > 0 && <span className="more">+{cluster.more}</span>}
        </span>
      )}
    </button>
  );
}

/** A day button of the calendar inside `root`, to hand focus back to. */
export function focusDay(root: HTMLElement | null, day: DayNum) {
  root?.querySelector<HTMLButtonElement>(`.day[data-day="${day}"]`)?.focus();
}
