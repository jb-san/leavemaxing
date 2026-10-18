import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { MonthCarousel, MonthGrid } from "~/components/planner/MonthCards";
import type { DayNum } from "~/lib/dates";
import {
  type Band,
  dayTones,
  type MemberDayKind,
  type MemberVote,
  memberDayKind,
  memberVotes,
  proposedDays,
  startClusters,
  windowsOn,
} from "~/lib/together/calendar";
import type { DayAction } from "~/lib/together/dayMenu";
import type { MemberRecord, Vote, WindowKey } from "~/lib/together/protocol";
import { t } from "./copy";
import { GroupDayMenu, type MenuWindow } from "./GroupDayMenu";
import { GroupLegend } from "./GroupLegend";
import { type CalWindow, type Decor, focusDay, SharedDay, useShared } from "./SharedDay";

type Month = { year: number; month: number };
type Window = CalWindow;

/** What the group's windows add to each day, worked out once per calendar. */
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

const isBlocked = (kind: MemberDayKind) => kind === "blocked";

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
  voted,
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
  /** Windows with votes that are no longer ranked, proposed or agreed. Drawn like ranked ones. */
  voted: Window[];
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
  // Voted windows take the ranked windows' look, toned by the votes in the same way.
  const banded = useMemo(() => [...ranked, ...voted], [ranked, voted]);
  const decor = useDecor(members, banded, proposals, agreed);
  const own = useRef<HTMLDivElement>(null);
  const root = rootRef ?? own;
  const [menu, setMenu] = useState<{ day: DayNum; rect: DOMRect } | null>(null);
  // The last day the menu opened on, which stays in the menu while it animates out.
  const [shown, setShown] = useState<DayNum | null>(null);
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
  const votedKeys = useMemo(() => new Set(voted.map((w) => w.key)), [voted]);
  const menuWindows = (day: DayNum): MenuWindow[] =>
    decor.windowsOn(day).map((w) => ({
      key: w.key,
      start: w.start,
      end: w.end,
      length: w.length,
      kind: agreedKeys.has(w.key)
        ? "agreed"
        : rankedKeys.has(w.key)
          ? "suggested"
          : votedKeys.has(w.key)
            ? "voted"
            : "proposed",
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
      <GroupLegend
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
                onClick={(rect) => {
                  setMenu({ day: d, rect });
                  setShown(d);
                }}
              />
            )}
          />
        )}
      </MonthCarousel>
      <GroupDayMenu
        day={shown}
        open={menu !== null}
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
