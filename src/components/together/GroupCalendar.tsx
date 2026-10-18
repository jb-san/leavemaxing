import { useMemo } from "react";
import { type DayCell, MonthCarousel, MonthGrid } from "~/components/planner/MonthCards";
import { cx, DayIcon } from "~/components/planner/ui";
import type { DayNum } from "~/lib/dates";
import {
  type Band,
  bandEdges,
  bandsOf,
  blockedBy,
  type MemberDayKind,
  memberDayKind,
  overflow,
  proposedDays,
  runEdges,
} from "~/lib/together/calendar";
import type { MemberRecord, WindowKey } from "~/lib/together/protocol";
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

type Month = { year: number; month: number };
type Span = { start: DayNum; end: DayNum };
type Keyed = Span & { key: WindowKey };

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

/**
 * One day of a shared calendar: your own kind of day, a coloured dot for each other member who
 * can't, and a band behind it. Past days and days outside the group's months can't be tapped.
 */
export function SharedDay({
  shared,
  day: d,
  cell: { index, col, count },
  bands,
  proposed,
  pressed,
  leave = false,
  onClick,
}: {
  shared: Shared;
  day: DayNum;
  cell: DayCell;
  bands: ReadonlyMap<DayNum, Band>;
  /** Who proposed dates covering each day, drawn as a dashed outline over any band. */
  proposed?: ReadonlyMap<DayNum, string[]>;
  pressed: (kind: MemberDayKind) => boolean;
  /** Draw a workday as a leave day, for dates being picked. */
  leave?: boolean;
  onClick: () => void;
}) {
  const { me, meId, members, holidays, cant, today, range } = shared;
  const kind = memberDayKind(d, me, holidays);
  const others = (cant.get(d) ?? []).filter((id) => id !== meId);
  const names = holidays.get(d);
  const dots = overflow(others, MAX_DOTS);
  const band = bands.get(d);
  const edges = bandEdges(bands, d);
  const proposers = proposed?.get(d);
  const run = proposed && proposers ? runEdges(proposed, d) : null;
  return (
    <button
      type="button"
      className="day"
      data-day={d}
      data-k={leave && kind === "work" ? "leave" : kind}
      data-today={d === today ? "" : undefined}
      data-past={d < today ? "" : undefined}
      data-br={band === "agreed" ? "agreed" : band ? "leave" : undefined}
      data-s={band && (col === 0 || index === 0 || edges.start) ? "" : undefined}
      data-e={band && (col === 6 || index === count - 1 || edges.end) ? "" : undefined}
      data-pr={run ? "" : undefined}
      data-pr-s={run && (col === 0 || index === 0 || run.start) ? "" : undefined}
      data-pr-e={run && (col === 6 || index === count - 1 || run.end) ? "" : undefined}
      disabled={d < today || d < range.start || d > range.end}
      aria-pressed={pressed(kind)}
      aria-label={dayLabel(
        d,
        kind,
        names ?? [],
        others.map((id) => members.get(id)?.name ?? ""),
        (proposers ?? []).map((id) => (id === meId ? t.proposerYou : (members.get(id)?.name ?? ""))),
      )}
      title={names?.join(", ")}
      onClick={onClick}
    >
      <span className="n">{index + 1}</span>
      <span className="dots" aria-hidden="true">
        {dots.shown.map((id) => (
          <span key={id} className="dot" style={{ backgroundColor: members.get(id)?.color }} />
        ))}
        {dots.more > 0 && <span>+{dots.more}</span>}
      </span>
      <span className="mk">{ICON[kind]}</span>
    </button>
  );
}

const isBlocked = (kind: MemberDayKind) => kind === "blocked";

/**
 * The group's months as the planner's month cards, shared: your own weekends, holidays and days you
 * can't do, a coloured dot for each other member who can't, and the suggested dates as break bands.
 * Tapping a day marks it as one you can't do, or clears it.
 */
export function GroupCalendar({
  months,
  members,
  meId,
  holidays,
  ranked,
  agreed,
  proposals,
  today,
  action,
  onToggle,
}: {
  months: Month[];
  members: Map<string, MemberRecord>;
  meId: string;
  /** Your public holidays, by day. */
  holidays: Map<DayNum, string[]>;
  ranked: Span[];
  agreed: Keyed[];
  /** Proposed dates, with who proposed them. */
  proposals: (Keyed & { proposedBy: string[] })[];
  today: DayNum;
  /** Shown next to the heading. */
  action?: React.ReactNode;
  onToggle: (day: DayNum) => void;
}) {
  const shared = useShared(months, members, meId, holidays, today);
  const bands = useMemo(() => bandsOf(ranked, agreed), [ranked, agreed]);
  const proposed = useMemo(() => proposedDays(proposals, agreed), [proposals, agreed]);
  if (!shared) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">{t.calendar}</h2>
          {action}
        </div>
        <p className="text-sm text-muted">{t.calendarHint}</p>
      </div>
      <Legend
        others={[...members]
          .filter(([id]) => id !== meId)
          .map(([, m]) => m.color)
          .slice(0, 3)}
        agreed={agreed.length > 0}
        proposed={proposed.size > 0}
      />
      <MonthCarousel months={shared.sorted} today={today} label={t.calendar}>
        {(m) => (
          <MonthGrid
            {...m}
            today={today}
            sundayFirst={shared.sundayFirst}
            renderDay={(d, cell) => (
              <SharedDay
                key={d}
                shared={shared}
                day={d}
                cell={cell}
                bands={bands}
                proposed={proposed}
                pressed={isBlocked}
                onClick={() => onToggle(d)}
              />
            )}
          />
        )}
      </MonthCarousel>
    </div>
  );
}

function Legend({ others, agreed, proposed }: { others: string[]; agreed: boolean; proposed: boolean }) {
  const items: [string, React.ReactNode, string][] = [
    ["bg-sun text-sun-ink", DayIcon.sun, t.legendHoliday],
    ["bg-wkd", null, t.legendWeekend],
    ["bg-red text-white", DayIcon.x, t.legendYouCant],
  ];
  const dots = others.length > 0 ? others : ["var(--sky)", "var(--violet)"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted" aria-label={t.legend}>
      {items.map(([cls, icon, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cx("grid size-[18px] place-items-center rounded-full [&>svg]:size-[11px]", cls)}>
            {icon}
          </span>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="flex h-[18px] items-center gap-0.5">
          {dots.map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two members can share a colour
            <span key={`${c}-${i}`} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
        {t.legendOthersCant}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-[18px] w-7 rounded-full bg-lime-soft" />
        {t.legendBreak}
      </li>
      {proposed && (
        <li className="flex items-center gap-1.5">
          <span className="h-[18px] w-7 rounded-full border-2 border-dashed border-lime-strong" />
          {t.legendProposed}
        </li>
      )}
      {agreed && (
        <li className="flex items-center gap-1.5">
          <span className="h-[18px] w-7 rounded-full bg-lime" />
          {t.worksForEveryone}
        </li>
      )}
    </ul>
  );
}
