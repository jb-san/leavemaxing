import { CalendarRange, Share2, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { placeName } from "~/data";
import { type DayNum, localToday } from "~/lib/dates";
import { type HolidayFile, holidayMap, loadHolidayFile, resolveHolidays } from "~/lib/holidays";
import type { HolidayDay } from "~/lib/planner/types";
import { shareUrl } from "~/lib/settings";
import { loadLast } from "~/lib/storage";
import { withVote, yearsOf } from "~/lib/together/calendar";
import { applyDayAction, type DayAction } from "~/lib/together/dayMenu";
import { formatInvite } from "~/lib/together/link";
import { limitToMonths } from "~/lib/together/member";
import { openPick, type Pick, withoutProposal, withProposal } from "~/lib/together/propose";
import type { GroupRecord, MemberRecord, Vote, WindowKey } from "~/lib/together/protocol";
import { type Scored, type ScoredWindow, type ScoreMember, scoreWindows } from "~/lib/together/score";
import { sections } from "~/lib/together/sections";
import type { GroupSession, GroupState } from "~/lib/together/session";
import { planSettingsFor } from "~/lib/together/toPlan";
import { Avatar } from "./Avatar";
import { monthsPhrase, t } from "./copy";
import { GroupCalendar } from "./GroupCalendar";
import { MemberSheet } from "./MemberSheet";
import { ProposeSheet } from "./ProposeSheet";
import { focusDay } from "./SharedDay";
import { ShareSheet } from "./ShareSheet";
import type { Push } from "./Together";
import { type RowKind, WindowRow } from "./WindowRow";

/** Avatars shown in the header before the rest become "+n". */
const MAX_AVATARS = 6;

const fileKey = (country: string, year: number) => `${country}/${year}`;

/** Each member's public holidays (by their country and region) for the group's years. */
function useHolidays(members: Map<string, MemberRecord>, years: number[]) {
  const [files, setFiles] = useState(() => new Map<string, HolidayFile | undefined>());
  const countries = [...new Set([...members.values()].map((m) => m.country))].sort();
  const missing = countries
    .flatMap((c) => years.map((y) => [c, y] as const))
    .filter(([c, y]) => !files.has(fileKey(c, y)));
  const missingKey = missing.map(([c, y]) => fileKey(c, y)).join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by the missing files
  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    Promise.all(
      missing.map(([c, y]) =>
        loadHolidayFile(c, y)
          // A missing or unreachable file leaves that member with weekends only.
          .catch(() => undefined)
          .then((f) => [fileKey(c, y), f] as const),
      ),
    ).then((entries) => {
      if (!live) return;
      setFiles((prev) => {
        const next = new Map(prev);
        for (const [k, f] of entries) next.set(k, f);
        return next;
      });
    });
    return () => {
      live = false;
    };
  }, [missingKey]);

  return { files, ready: missing.length === 0 };
}

/** The same array as last time while every item is the same, so memos keyed on it hold. */
function useStable<T>(items: T[]): T[] {
  const ref = useRef(items);
  const prev = ref.current;
  if (items.length !== prev.length || items.some((x, i) => x !== prev[i])) ref.current = items;
  return ref.current;
}

/** Hands a write to the session and reports it with a toast if the session refuses it. */
export type Save = (write: Promise<void>) => void;

export function GroupView({
  session,
  state,
  sharing,
  setSharing,
  push,
}: {
  session: GroupSession;
  state: GroupState & { group: GroupRecord; me: string };
  sharing: boolean;
  setSharing: (open: boolean) => void;
  push: Push;
}) {
  const { group, members, me: meId } = state;
  const me = members.get(meId) as MemberRecord;
  const [today] = useState<DayNum>(() => localToday());
  const [editing, setEditing] = useState(false);
  const [proposing, setProposing] = useState(false);
  // The day "Propose dates from here" opened the sheet on, if it was opened from a day's menu.
  const [proposeFrom, setProposeFrom] = useState<DayNum | undefined>();
  // The dates being picked in the propose sheet, seeded as it opens and cleared as it closes.
  const [pick, setPick] = useState<Pick | null>(null);
  const [proposeOpens, setProposeOpens] = useState(0);
  const calendar = useRef<HTMLDivElement>(null);
  const inviteButton = useRef<HTMLButtonElement>(null);
  const proposeButton = useRef<HTMLButtonElement>(null);
  const wasSharing = useRef(sharing);
  const wasProposing = useRef(proposing);

  // The invite sheet opens straight after creating, when the form that had focus is gone.
  // Closing it hands focus to the Invite button instead of dropping it on the page.
  useEffect(() => {
    if (wasSharing.current && !sharing) inviteButton.current?.focus();
    wasSharing.current = sharing;
  }, [sharing]);

  // Once the sheet has closed, focus goes back to the button or the day that opened it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only as the sheet closes
  useEffect(() => {
    if (wasProposing.current && !proposing) {
      if (proposeFrom === undefined) proposeButton.current?.focus();
      else focusDay(calendar.current, proposeFrom);
    }
    wasProposing.current = proposing;
  }, [proposing]);

  const years = useMemo(() => yearsOf(group.months), [group.months]);
  const { files, ready } = useHolidays(members, years);
  // Members whose records haven't changed keep their place, so scoring only reruns on a real edit.
  const entries = useStable([...members].flat());
  // biome-ignore lint/correctness/useExhaustiveDependencies: `entries` stands in for `members`
  const holidays = useMemo(() => {
    const out = new Map<string, HolidayDay[]>();
    for (const [id, m] of members) {
      out.set(
        id,
        resolveHolidays(
          years.map((y) => files.get(fileKey(m.country, y))),
          m.region,
        ),
      );
    }
    return out;
  }, [entries, files, years]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `holidays` changes whenever `members` does
  const fresh = useMemo(() => {
    if (!ready) return null;
    const list = [...members].map(([id, record]) => ({ id, record, holidays: holidays.get(id) ?? [] }));
    return scoreWindows(group, list, today);
  }, [group, holidays, today, ready]);
  // The last result stays up while a new member's holidays load, so the lists don't flash empty.
  const [held, setHeld] = useState<Scored | null>(null);
  useEffect(() => {
    if (fresh) setHeld(fresh);
  }, [fresh]);
  const scored = fresh ?? held;
  const shown = scored ? sections(scored) : null;
  // My plans shows how many dates work for everyone, and only this view runs the scoring.
  const agreedCount = scored?.agreed.length;
  useEffect(() => {
    if (agreedCount !== undefined) session.noteSummary({ agreed: agreedCount });
  }, [agreedCount, session]);
  const myHolidays = useMemo(() => holidayMap(holidays.get(meId) ?? []), [holidays, meId]);
  const meScored: ScoreMember = { id: meId, record: me, holidays: holidays.get(meId) ?? [] };

  const save: Save = (write) => {
    write.catch(() => {
      // A rate limit has its own toast, from the session's state.
      if (session.state.error !== "rate") push(t.saveFailed, "warn");
    });
  };
  const markDay = (day: DayNum, action: Exclude<DayAction, "propose">) => {
    const { blocked, customOff } = limitToMonths({ ...me, ...applyDayAction(me, day, action) }, group.months);
    save(session.updateMe({ blocked, customOff }));
  };
  const voteOn = (key: WindowKey, v: Vote | null) => {
    save(session.updateMe({ votes: withVote(me.votes, key, v) }));
  };
  const vote = (w: ScoredWindow) => (v: Vote | null) => voteOn(w.key, v);
  const openPropose = (from?: DayNum) => {
    setProposeFrom(from);
    setPick(openPick(from));
    setProposeOpens((n) => n + 1);
    setProposing(true);
  };
  const closePropose = () => {
    setProposing(false);
    setPick(null);
  };
  const propose = (key: WindowKey) => {
    save(session.updateMe({ proposals: withProposal(me.proposals, key) }));
    closePropose();
  };
  const withdraw = (w: ScoredWindow) => () => {
    save(session.updateMe({ proposals: withoutProposal(me.proposals, w.key) }));
  };
  const addToPlan = (w: ScoredWindow) => () => {
    location.assign(shareUrl(planSettingsFor(meScored, w, loadLast()), location.origin));
  };
  const rows = (windows: ScoredWindow[], kind: RowKind) =>
    windows.map((w) => (
      <WindowRow
        key={w.key}
        w={w}
        kind={kind}
        members={members}
        me={meId}
        myVote={me.votes[w.key]}
        onVote={vote(w)}
        onWithdraw={withdraw(w)}
        onAddToPlan={addToPlan(w)}
      />
    ));

  const personal = session.personalLink();
  const unshown = [...members].slice(MAX_AVATARS);
  const place = placeName(me.country, me.region);

  return (
    <div className="flex flex-col gap-5 pt-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(32px,4.4vw,52px)] font-extrabold leading-none">{group.name}</h1>
          <p className="text-muted">
            {t.tripSentence(monthsPhrase(group.months), group.minLength, group.maxLength)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ul aria-label={t.members} className="flex items-center -space-x-2">
            {[...members].slice(0, MAX_AVATARS).map(([id, m]) => (
              <li key={id} className="rounded-full ring-2 ring-bg">
                <Avatar name={m.name} color={m.color} />
                <span className="sr-only">{m.name}</span>
              </li>
            ))}
            {unshown.length > 0 && (
              <li className="grid size-9 place-items-center rounded-full bg-card-2 text-sm font-bold ring-2 ring-bg">
                <span aria-hidden="true">+{unshown.length}</span>
                <span className="sr-only">{unshown.map(([, m]) => m.name).join(", ")}</span>
              </li>
            )}
          </ul>
          <button
            ref={inviteButton}
            type="button"
            className="btn btn-primary"
            onClick={() => setSharing(true)}
          >
            <Share2 size={16} /> {t.invite}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="card group flex items-center gap-3 border border-line p-4 text-left transition-[transform,border-color] duration-150 ease-[var(--ease-out)] hover:border-lime active:scale-[0.98] sm:max-w-md"
      >
        <Avatar name={me.name} color={me.color} size={44} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-xl font-extrabold leading-tight">{me.name}</span>
          <span className="truncate text-sm text-muted">
            {place}, {t.leaveDays(me.allowance)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-lime px-3.5 py-2 text-sm font-bold text-lime-ink">
          <SlidersHorizontal size={15} strokeWidth={2.4} /> {t.edit}
        </span>
      </button>

      <GroupCalendar
        months={group.months}
        members={members}
        meId={meId}
        holidays={myHolidays}
        ranked={scored?.ranked ?? []}
        agreed={scored?.agreed ?? []}
        proposals={scored?.proposals ?? []}
        today={today}
        rootRef={calendar}
        onAction={markDay}
        onPropose={openPropose}
        onVote={voteOn}
        action={
          <button
            ref={proposeButton}
            type="button"
            className="btn btn-soft shrink-0"
            onClick={() => openPropose()}
          >
            <CalendarRange size={16} /> {t.proposeDates}
          </button>
        }
      />

      {shown && shown.agreed.length > 0 && (
        <Windows title={t.worksForEveryone}>{rows(shown.agreed, "agreed")}</Windows>
      )}
      {shown && shown.proposals.length > 0 && (
        <Windows title={t.proposed}>{rows(shown.proposals, "proposed")}</Windows>
      )}
      {shown?.empty && (
        <Windows title={t.suggested}>
          <p className="card p-5 font-semibold">{t.noWindows}</p>
        </Windows>
      )}
      {shown && shown.suggested.length > 0 && (
        <Windows title={t.suggested}>{rows(shown.suggested, "suggested")}</Windows>
      )}

      <ProposeSheet
        open={proposing}
        onClose={closePropose}
        months={group.months}
        members={members}
        me={meScored}
        holidays={myHolidays}
        today={today}
        start={proposeFrom}
        opens={proposeOpens}
        pick={pick}
        onPick={setPick}
        onPropose={propose}
      />
      <MemberSheet
        open={editing}
        onClose={() => setEditing(false)}
        session={session}
        state={state}
        save={save}
      />
      {personal && (
        <ShareSheet
          open={sharing}
          onClose={() => setSharing(false)}
          url={formatInvite(location.origin, personal)}
          title={t.inviteTitle}
          caption={t.scanToJoin(group.name)}
        />
      )}
    </div>
  );
}

function Windows({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  const list = Array.isArray(children);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-2xl font-extrabold">
        {title}
      </h2>
      {list ? <ul className="flex flex-col gap-3">{children}</ul> : children}
    </section>
  );
}
