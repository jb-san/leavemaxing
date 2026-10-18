import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { type DayCell, MonthCarousel, MonthGrid } from "~/components/planner/MonthCards";
import { cx, DayIcon } from "~/components/planner/ui";
import type { DayNum } from "~/lib/dates";
import {
  type Band,
  bandEdges,
  blockedBy,
  type Cluster,
  type DayTone,
  dayTones,
  type MemberDayKind,
  type MemberVote,
  memberDayKind,
  memberVotes,
  overflow,
  proposedDays,
  runEdges,
  startClusters,
  type Win,
  windowsOn,
} from "~/lib/together/calendar";
import type { DayAction } from "~/lib/together/dayMenu";
import { textOn } from "~/lib/together/member";
import type { MemberRecord, Vote, WindowKey } from "~/lib/together/protocol";
import { groupRange } from "~/lib/together/score";
import { SUNDAY_FIRST } from "~/lib/weekends";
import { dayLabel, t } from "./copy";
import { GroupDayMenu, type MenuWindow } from "./GroupDayMenu";

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
type Window = Win & { length: number };

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
  windowsOn: (day: DayNum) => Window[];
}

function useDecor(
  members: Map<string, MemberRecord>,
  ranked: readonly Window[],
  proposals: readonly (Window & { proposedBy: string[] })[],
  agreed: readonly Window[],
): Decor {
  return useMemo(() => {
    const records = [...members.values()];
    const tones = dayTones(ranked, proposals, agreed, records);
    const bands = new Map<DayNum, Band>();
    const outline = new Map<DayNum, true>();
    for (const [d, tone] of tones) {
      const band = tone.tone === "open" ? (tone.ranked ? "ranked" : null) : tone.tone;
      if (band) bands.set(d, band);
      if (tone.proposed) outline.set(d, true);
    }
    const votes = new Map<WindowKey, MemberVote[]>();
    for (const w of [...ranked, ...proposals, ...agreed]) {
      if (!votes.has(w.key)) votes.set(w.key, memberVotes(members, w.key));
    }
    return {
      bands,
      tones,
      outline,
      proposers: proposedDays(proposals, agreed),
      clusters: startClusters(ranked, proposals, agreed, members),
      votes,
      windowsOn: (day) => windowsOn(day, ranked, proposals, agreed),
    };
  }, [members, ranked, proposals, agreed]);
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

const isBlocked = (kind: MemberDayKind) => kind === "blocked";

/** A day button of the calendar inside `root`, to hand focus back to. */
export function focusDay(root: HTMLElement | null, day: DayNum) {
  root?.querySelector<HTMLButtonElement>(`.day[data-day="${day}"]`)?.focus();
}

/**
 * The group's months as the planner's month cards, shared: your own weekends, holidays, days off and
 * days you can't do, a coloured dot for each other member who can't, and the group's dates as bands
 * toned by the votes. Tapping a day opens its menu, to mark the day, vote on the dates around it or
 * propose dates from it.
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
  rootRef,
  onAction,
  onPropose,
  onVote,
}: {
  months: Month[];
  members: Map<string, MemberRecord>;
  meId: string;
  /** Your public holidays, by day. */
  holidays: Map<DayNum, string[]>;
  ranked: Window[];
  agreed: Window[];
  /** Proposed dates, with who proposed them. */
  proposals: (Window & { proposedBy: string[] })[];
  today: DayNum;
  /** Shown next to the heading. */
  action?: React.ReactNode;
  /** The calendar's root, so the view can hand focus back to a day. */
  rootRef?: RefObject<HTMLDivElement | null>;
  onAction: (day: DayNum, action: Exclude<DayAction, "propose">) => void;
  onPropose: (day: DayNum) => void;
  onVote: (key: WindowKey, vote: Vote | null) => void;
}) {
  const shared = useShared(months, members, meId, holidays, today);
  const decor = useDecor(members, ranked, proposals, agreed);
  const own = useRef<HTMLDivElement>(null);
  const root = rootRef ?? own;
  const [menu, setMenu] = useState<{ day: DayNum; rect: DOMRect } | null>(null);
  const last = useRef<DayNum | null>(null);

  // Once the menu has closed, focus goes back to its day.
  useEffect(() => {
    if (menu) last.current = menu.day;
    else if (last.current !== null) {
      focusDay(root.current, last.current);
      last.current = null;
    }
  }, [menu, root]);

  const agreedKeys = useMemo(() => new Set(agreed.map((w) => w.key)), [agreed]);
  const rankedKeys = useMemo(() => new Set(ranked.map((w) => w.key)), [ranked]);
  const menuWindows = (day: DayNum): MenuWindow[] =>
    decor.windowsOn(day).map((w) => ({
      key: w.key,
      start: w.start,
      end: w.end,
      length: w.length,
      kind: agreedKeys.has(w.key) ? "agreed" : rankedKeys.has(w.key) ? "suggested" : "proposed",
      votes: decor.votes.get(w.key) ?? [],
    }));

  if (!shared) return null;
  const { range } = shared;
  const inRange = (d: DayNum) => d >= range.start && d <= range.end;
  const visible = (days: Iterable<DayNum>) => [...days].some(inRange);
  const tones = [...decor.tones].filter(([d]) => inRange(d)).map(([, tone]) => tone.tone);

  return (
    <div ref={root} className="flex flex-col gap-3">
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
        agreed={tones.includes("agreed")}
        proposed={visible(decor.outline.keys())}
        vetoed={tones.includes("vetoed")}
        dayOff={shared.me.customOff.some(
          (d) => inRange(d) && memberDayKind(d, shared.me, holidays) === "custom",
        )}
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
                bands={decor.bands}
                decor={decor}
                pressed={isBlocked}
                onClick={(rect) => setMenu({ day: d, rect })}
              />
            )}
          />
        )}
      </MonthCarousel>
      <GroupDayMenu
        day={menu?.day ?? null}
        anchor={menu?.rect ?? null}
        shared={shared}
        windows={menuWindows}
        onAction={onAction}
        onPropose={onPropose}
        onVote={onVote}
        onClose={() => setMenu(null)}
      />
    </div>
  );
}

function Legend({
  others,
  agreed,
  proposed,
  vetoed,
  dayOff,
}: {
  others: string[];
  agreed: boolean;
  proposed: boolean;
  vetoed: boolean;
  dayOff: boolean;
}) {
  const items: [string, React.ReactNode, string][] = [
    ["bg-sun text-sun-ink", DayIcon.sun, t.legendHoliday],
    ["bg-wkd", null, t.legendWeekend],
    ["bg-red text-white", DayIcon.x, t.legendYouCant],
  ];
  if (dayOff)
    items.push([
      "bg-[color-mix(in_oklab,var(--sky)_30%,var(--card))] text-ink",
      DayIcon.star,
      t.legendDayOff,
    ]);
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
      {vetoed && (
        <li className="flex items-center gap-1.5">
          <span className="hatch h-[18px] w-7 rounded-full" />
          {t.legendVetoed}
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
