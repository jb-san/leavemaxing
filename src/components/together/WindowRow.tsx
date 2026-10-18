import { CalendarPlus, Flag } from "lucide-react";
import { type KeyboardEvent, useId, useRef } from "react";
import { cx, DayIcon } from "~/components/planner/ui";
import { formatRange } from "~/lib/dates";
import { arrowVote, clickedVote, groupHelps, VOTES, voteCounts } from "~/lib/together/calendar";
import type { MemberRecord, Vote } from "~/lib/together/protocol";
import type { ScoredWindow } from "~/lib/together/score";
import { Avatar } from "./Avatar";
import { joinNames, t } from "./copy";

const CHECKED: Record<Vote, string> = {
  yes: "bg-lime text-lime-ink",
  maybe: "bg-ink text-card",
  no: "bg-red-soft text-ink ring-1 ring-inset ring-red",
};

/** Which list a row is in, which decides what else it offers. */
export type RowKind = "agreed" | "proposed" | "suggested";

/**
 * One window of dates: how long, what each member spends on it, which holidays help, and your vote.
 * `onVote(null)` clears your vote. A proposed row says who proposed it, and you can withdraw your own
 * proposal. An agreed row can go into your plan.
 */
export function WindowRow({
  w,
  kind,
  members,
  me,
  myVote,
  onVote,
  onWithdraw,
  onAddToPlan,
}: {
  w: ScoredWindow;
  kind: RowKind;
  members: Map<string, MemberRecord>;
  me: string;
  myVote: Vote | undefined;
  onVote: (vote: Vote | null) => void;
  onWithdraw: () => void;
  onAddToPlan: () => void;
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
                  className={cx(
                    "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[13px] font-semibold",
                    flagged ? "border-red bg-red-soft" : "border-line bg-card-2",
                  )}
                >
                  <Avatar name={m.name} color={m.color} size={22} />
                  <span className="sr-only">{memberId === me ? t.nameYou(m.name) : m.name}:</span>
                  {t.leave(w.costs[memberId] ?? 0)}
                  {flagged && (
                    <>
                      <Flag size={13} strokeWidth={2.6} className="text-red" aria-hidden="true" />
                      <span className="sr-only">. {t.cantDo(m.name)}</span>
                    </>
                  )}
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
          {kind === "proposed" && w.proposedBy.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-semibold text-muted">
              <span id={`${id}-by`}>{t.proposedBy}</span>
              <ul aria-labelledby={`${id}-by`} className="flex -space-x-1">
                {w.proposedBy.map((memberId) => (
                  <li key={memberId} className="rounded-full ring-2 ring-card">
                    <Avatar
                      name={name(memberId)}
                      color={members.get(memberId)?.color ?? "#888888"}
                      size={22}
                    />
                    <span className="sr-only">
                      {memberId === me ? t.nameYou(name(memberId)) : name(memberId)}
                    </span>
                  </li>
                ))}
              </ul>
              {w.proposedBy.includes(me) && (
                <button
                  type="button"
                  onClick={onWithdraw}
                  className="ml-1 rounded-full border border-line bg-card-2 px-3 py-1 font-bold text-ink transition-[transform,border-color] duration-150 ease-[var(--ease-out)] hover:border-red active:scale-[0.97]"
                >
                  {t.withdraw}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start md:flex-nowrap md:self-center">
          <VoteControl value={myVote} counts={counts} onVote={onVote} />
          {kind === "agreed" && (
            <button type="button" onClick={onAddToPlan} className="btn btn-primary h-[46px]">
              <CalendarPlus size={16} strokeWidth={2.4} /> {t.addToPlan}
            </button>
          )}
        </div>
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
    const next = arrowVote(i, e.key);
    if (!next) return;
    e.preventDefault();
    buttons.current[VOTES.indexOf(next)]?.focus();
    onVote(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.yourVote}
      className="flex shrink-0 rounded-full border border-line bg-card-2 p-1"
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
          onClick={() => onVote(clickedVote(value, v))}
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
