import { Share2, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { placeName } from "~/data";
import { type DayNum, localToday } from "~/lib/dates";
import { type HolidayFile, holidayMap, loadHolidayFile, resolveHolidays } from "~/lib/holidays";
import type { HolidayDay } from "~/lib/planner/types";
import { toggleDay, withVote, yearsOf } from "~/lib/together/calendar";
import { formatInvite } from "~/lib/together/link";
import { limitToMonths } from "~/lib/together/member";
import type { GroupRecord, MemberRecord, Vote } from "~/lib/together/protocol";
import { type Scored, type ScoredWindow, scoreWindows } from "~/lib/together/score";
import type { GroupSession, GroupState } from "~/lib/together/session";
import { Avatar } from "./Avatar";
import { monthsPhrase, t } from "./copy";
import { GroupCalendar } from "./GroupCalendar";
import { MemberSheet } from "./MemberSheet";
import { ShareSheet } from "./ShareSheet";
import { WindowRow } from "./WindowRow";

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

export function GroupView({
  session,
  state,
  sharing,
  setSharing,
}: {
  session: GroupSession;
  state: GroupState & { group: GroupRecord; me: string };
  sharing: boolean;
  setSharing: (open: boolean) => void;
}) {
  const { group, members, me: meId } = state;
  const me = members.get(meId) as MemberRecord;
  const [today] = useState<DayNum>(() => localToday());
  const [editing, setEditing] = useState(false);
  const inviteButton = useRef<HTMLButtonElement>(null);
  const wasSharing = useRef(sharing);

  // The invite sheet opens straight after creating, when the form that had focus is gone.
  // Closing it hands focus to the Invite button instead of dropping it on the page.
  useEffect(() => {
    if (wasSharing.current && !sharing) inviteButton.current?.focus();
    wasSharing.current = sharing;
  }, [sharing]);

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

  // Held over while a new member's holidays load, so the lists don't flash empty.
  const last = useRef<Scored | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `holidays` changes whenever `members` does
  const scored = useMemo(() => {
    if (!ready) return last.current;
    const list = [...members].map(([id, record]) => ({ id, record, holidays: holidays.get(id) ?? [] }));
    return scoreWindows(group, list, today);
  }, [group, holidays, today, ready]);
  last.current = scored;
  const myHolidays = useMemo(() => holidayMap(holidays.get(meId) ?? []), [holidays, meId]);

  const toggle = (day: DayNum) => {
    const blocked = limitToMonths({ ...me, blocked: toggleDay(me.blocked, day) }, group.months).blocked;
    session.updateMe({ blocked }).catch(() => {});
  };
  const vote = (w: ScoredWindow) => (v: Vote | null) => {
    session.updateMe({ votes: withVote(me.votes, w.key, v) }).catch(() => {});
  };
  const rows = (windows: ScoredWindow[]) =>
    windows.map((w) => (
      <WindowRow key={w.key} w={w} members={members} me={meId} myVote={me.votes[w.key]} onVote={vote(w)} />
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
        today={today}
        onToggle={toggle}
      />

      {scored && scored.agreed.length > 0 && (
        <Windows title={t.worksForEveryone}>{rows(scored.agreed)}</Windows>
      )}
      {scored && scored.proposals.length > 0 && (
        <Windows title={t.proposed}>{rows(scored.proposals)}</Windows>
      )}
      {scored && (
        <Windows title={t.suggested} empty={t.noWindows}>
          {rows(scored.ranked)}
        </Windows>
      )}

      <MemberSheet open={editing} onClose={() => setEditing(false)} session={session} state={state} />
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

function Windows({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-2xl font-extrabold">
        {title}
      </h2>
      {children.length > 0 ? (
        <ul className="flex flex-col gap-3">{children}</ul>
      ) : (
        <p className="card p-5 font-semibold">{empty}</p>
      )}
    </section>
  );
}
