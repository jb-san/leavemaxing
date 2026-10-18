import { Flag } from "lucide-react";
import { type KeyboardEvent, useId, useRef } from "react";
import { cx, DayIcon } from "~/components/planner/ui";
import { formatRange } from "~/lib/dates";
import { groupHelps, voteCounts } from "~/lib/together/calendar";
import type { MemberRecord, Vote } from "~/lib/together/protocol";
import type { ScoredWindow } from "~/lib/together/score";
import { Avatar } from "./Avatar";
import { joinNames, t } from "./copy";

const VOTES: Vote[] = ["yes", "maybe", "no"];

const CHECKED: Record<Vote, string> = {
  yes: "bg-lime text-lime-ink",
  maybe: "bg-ink text-card",
  no: "bg-red-soft text-ink ring-1 ring-inset ring-red",
};

/**
 * One window of dates: how long, what each member spends on it, which holidays help, and your vote.
 * `onVote(null)` clears your vote.
 */
export function WindowRow({
  w,
  members,
  me,
  myVote,
  onVote,
}: {
  w: ScoredWindow;
  members: Map<string, MemberRecord>;
  me: string;
  myVote: Vote | undefined;
  onVote: (vote: Vote | null) => void;
}) {
  const id = useId();
  const counts = voteCounts(members.values(), w.key);
  const helps = groupHelps(w.helps);
  const name = (memberId: string) => members.get(memberId)?.name ?? "";

  return (
    <li>
      <article
        aria-labelledby={`${id}-dates`}
        className="card flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 id={`${id}-dates`} className="text-2xl font-extrabold leading-tight">
              {formatRange(w.start, w.end)}
            </h3>
            <span className="text-sm font-semibold text-muted">{t.daysOff(w.length)}</span>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {[...members].map(([memberId, m]) => {
              const flagged = w.flagged.includes(memberId);
              return (
                <li
                  key={memberId}
                  aria-label={flagged ? t.cantDo(m.name) : undefined}
                  className={cx(
                    "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[13px] font-semibold",
                    flagged ? "border-red bg-red-soft" : "border-line bg-card-2",
                  )}
                >
                  <Avatar name={m.name} color={m.color} size={22} />
                  <span className="sr-only">{memberId === me ? t.nameYou(m.name) : m.name}:</span>
                  {t.leave(w.costs[memberId] ?? 0)}
                  {flagged && <Flag size={13} strokeWidth={2.6} className="text-red" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
          {helps.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {helps.map((h) => (
                <li
                  key={`${h.day}-${h.name}`}
                  className="flex items-center gap-1.5 rounded-full bg-sun-soft py-1 pl-2 pr-1 text-[13px] font-semibold"
                >
                  <span className="text-sun-ink dark:text-sun [&>svg]:size-[13px]">{DayIcon.sun}</span>
                  {h.name}
                  <span className="sr-only">{t.savesFor(joinNames(h.memberIds.map(name)))}</span>
                  <span className="flex -space-x-1">
                    {h.memberIds.map((memberId) => (
                      <Avatar
                        key={memberId}
                        name={name(memberId)}
                        color={members.get(memberId)?.color ?? "#888888"}
                        size={20}
                        className="ring-2 ring-sun-soft"
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <VoteControl value={myVote} counts={counts} onVote={onVote} />
      </article>
    </li>
  );
}

/** Works, maybe or can't: a radio group where tapping your current vote again clears it. */
function VoteControl({
  value,
  counts,
  onVote,
}: {
  value: Vote | undefined;
  counts: Record<Vote, number>;
  onVote: (vote: Vote | null) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const focusable = value ?? "yes";

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (i + step + VOTES.length) % VOTES.length;
    buttons.current[next]?.focus();
    onVote(VOTES[next] as Vote);
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.yourVote}
      className="flex shrink-0 self-start rounded-full border border-line bg-card-2 p-1 md:self-center"
    >
      {VOTES.map((v, i) => (
        <button
          key={v}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === v}
          tabIndex={v === focusable ? 0 : -1}
          onClick={() => onVote(value === v ? null : v)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={cx(
            "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
            value === v ? CHECKED[v] : "text-ink hover:bg-card",
          )}
        >
          {t.votes[v]}
          {counts[v] > 0 && (
            <>
              <span aria-hidden="true" className="tabular text-xs opacity-80">
                {counts[v]}
              </span>
              <span className="sr-only">, {t.voteCount(counts[v])}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
