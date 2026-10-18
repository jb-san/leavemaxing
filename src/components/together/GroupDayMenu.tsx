import { Ban, CalendarRange, Sparkles, Undo2 } from "lucide-react";
import { cx, Sheet } from "~/components/planner/ui";
import { type DayNum, formatRange, formatShort, parts } from "~/lib/dates";
import { type MemberVote, memberDayKind, voteCounts } from "~/lib/together/calendar";
import {
  type DayAction,
  isNaturallyOff,
  type MenuOption,
  menuOptions,
  OPTION_ACTION,
} from "~/lib/together/dayMenu";
import type { Vote, WindowKey } from "~/lib/together/protocol";
import { Avatar } from "./Avatar";
import { menuNote, t } from "./copy";
import type { Shared } from "./SharedDay";
import { VoteControl } from "./WindowRow";

const ICON: Record<MenuOption, typeof Ban> = {
  cant: Ban,
  notFree: Ban,
  dayOff: Sparkles,
  propose: CalendarRange,
  canAgain: Undo2,
  freeAgain: Undo2,
  removeDayOff: Undo2,
};

/** A window holding the menu's day, with which list it's in and everyone's votes on it. */
export interface MenuWindow {
  key: WindowKey;
  start: DayNum;
  end: DayNum;
  length: number;
  kind: "agreed" | "suggested" | "proposed";
  votes: MemberVote[];
}

/**
 * A shared calendar day's menu, the planner's day menu for a group: a note on what the day is for
 * you and who else can't do it, options to mark it or propose dates from it, and the votes on every
 * window that holds it, with your own vote to change. A popover on wider screens, a sheet on phones.
 */
export function GroupDayMenu({
  day: shown,
  open,
  anchor,
  shared,
  windows,
  onAction,
  onPropose,
  onVote,
  onClose,
}: {
  /** The day the menu is open on, or was last open on so it can animate out. Null before the first open. */
  day: DayNum | null;
  open: boolean;
  anchor: DOMRect | null;
  shared: Shared;
  windows: (day: DayNum) => MenuWindow[];
  onAction: (day: DayNum, action: Exclude<DayAction, "propose">) => void;
  onPropose: (day: DayNum) => void;
  onVote: (key: WindowKey, vote: Vote | null) => void;
  onClose: () => void;
}) {
  if (shown === null)
    return (
      <Sheet open={false} onClose={onClose}>
        {null}
      </Sheet>
    );

  const { me, meId, members, holidays, cant } = shared;
  const kind = memberDayKind(shown, me, holidays);
  const name = (id: string) => members.get(id)?.name ?? "";
  const note = menuNote(
    kind,
    holidays.get(shown) ?? [],
    (cant.get(shown) ?? []).filter((id) => id !== meId).map(name),
  );
  const options = menuOptions(kind, isNaturallyOff(shown, me, holidays));
  const pick = (o: MenuOption) => {
    const action = OPTION_ACTION[o];
    if (action === "propose") onPropose(shown);
    else onAction(shown, action);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      anchor={anchor}
      fit
      title={`${formatShort(shown)} ${parts(shown).year}`}
    >
      {note && <p className="-mt-2 text-sm text-muted">{note}</p>}
      <ul className="flex flex-col gap-1.5">
        {options.map((o) => {
          const Icon = ICON[o];
          const [label, hint] = t.menu[o];
          return (
            <li key={o}>
              <button
                type="button"
                onClick={() => pick(o)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card-2 px-3.5 py-3 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-lime active:scale-[0.98]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-ink shadow-card">
                  <Icon size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {windows(shown).map((w) => (
        <WindowVotes key={w.key} w={w} shared={shared} onVote={(v) => onVote(w.key, v)} />
      ))}
    </Sheet>
  );
}

/** One window in the day menu: its dates, which list it's in, everyone's votes and yours. */
function WindowVotes({
  w,
  shared: { me, meId, members },
  onVote,
}: {
  w: MenuWindow;
  shared: Shared;
  onVote: (vote: Vote | null) => void;
}) {
  const dates = formatRange(w.start, w.end);
  const id = `menu-${w.key}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5 border-t border-line pt-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-muted">{t.windowKinds[w.kind]}</span>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 id={id} className="font-display text-lg font-extrabold leading-tight">
            {dates}
          </h3>
          <span className="text-sm font-semibold text-muted">{t.daysOff(w.length)}</span>
        </div>
      </div>
      <ul aria-label={t.everyonesVotes} className="flex flex-wrap gap-1.5">
        {w.votes.map((v) => {
          const m = members.get(v.id);
          if (!m) return null;
          return (
            <li
              key={v.id}
              className={cx(
                "flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-[13px] font-semibold",
                v.vote === "no" ? "border-red bg-red-soft" : "border-line bg-card-2",
              )}
            >
              <Avatar name={m.name} color={m.color} size={20} />
              <span>
                {v.id === meId ? t.nameYou(m.name) : m.name}
                <span className="sr-only">:</span>
              </span>
              <span className={cx(v.vote ? "text-ink" : "text-muted", "font-bold")}>
                {t.voteWords[v.vote ?? "none"]}
              </span>
            </li>
          );
        })}
      </ul>
      <VoteControl
        value={me.votes[w.key]}
        counts={voteCounts(members.values(), w.key)}
        label={t.voteOn(dates)}
        full
        onVote={onVote}
      />
    </section>
  );
}
