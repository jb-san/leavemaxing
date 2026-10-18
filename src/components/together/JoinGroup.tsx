import { type SubmitEvent, useRef, useState } from "react";
import { forJoining } from "~/lib/together/member";
import { LIMITS, type MemberRecord } from "~/lib/together/protocol";
import type { GroupSession } from "~/lib/together/session";
import { Avatar } from "./Avatar";
import { monthsPhrase, t } from "./copy";
import { ErrorScreen } from "./ErrorScreen";
import { defaultMember, MemberForm } from "./MemberForm";
import type { Push } from "./Together";
import { track } from "./track";
import { useGroup } from "./useGroup";

/** The screen behind an invite link: who invited you, who is in, and your own details. */
export function JoinGroup({
  session,
  onJoined,
  push,
}: {
  session: GroupSession;
  onJoined?: () => void;
  /** The island's toasts, which outlive this screen: a join can fail after the group view replaced it. */
  push: Push;
}) {
  const state = useGroup(session);
  const [me, setMe] = useState<MemberRecord>(defaultMember);
  const [busy, setBusy] = useState(false);
  const joining = useRef(false);
  const joinButton = useRef<HTMLButtonElement>(null);
  const { group, members } = state;
  if (!group) return null;
  // The server would refuse one more, so don't ask for details that can't be used.
  const full = members.size >= LIMITS.members;
  if (full) return <ErrorScreen error="full" />;

  const creator = members.get(group.createdBy);
  const taken = [...members.values()].map((m) => m.color);
  // Days carried over from this browser's own plan, inside the group's months, go with the join.
  const carried = forJoining(me, group.months);
  const sharedDays = new Set([...carried.blocked, ...carried.customOff]).size;

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (joining.current || full) return;
    joining.current = true;
    setBusy(true);
    try {
      // Only the days inside the group's months leave this browser.
      await session.join(forJoining(me, group.months));
    } catch {
      joining.current = false;
      setBusy(false);
      push(t.joinFailed, "warn");
      return;
    }
    track("together_join");
    onJoined?.();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 pb-2 pt-3">
        <h1 className="max-w-[20ch] text-[clamp(32px,5vw,56px)] font-extrabold leading-[0.98]">
          {t.invitedYou(creator?.name ?? t.someone, group.name)}
        </h1>
        <p className="text-lg text-muted">
          {t.tripSentence(monthsPhrase(group.months), group.minLength, group.maxLength)}
        </p>
      </div>

      {members.size > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="field-label mb-3">{t.alreadyIn}</h2>
          <ul aria-label={t.members} className="flex flex-wrap gap-x-5 gap-y-3">
            {[...members].map(([id, m]) => (
              <li key={id} className="flex items-center gap-2 font-semibold">
                <Avatar name={m.name} color={m.color} />
                {m.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <MemberForm value={me} onChange={setMe} taken={taken} />

      {sharedDays > 0 && (
        <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">{t.sharedDays(sharedDays)}</p>
          <button
            type="button"
            className="btn btn-soft shrink-0"
            onClick={() => {
              setMe((m) => ({ ...m, blocked: [], customOff: [] }));
              // The note goes with its button, so focus moves on to joining.
              joinButton.current?.focus();
            }}
          >
            {t.dontShare}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-muted">{t.joinHint}</p>
        <button
          ref={joinButton}
          type="submit"
          disabled={busy}
          className="btn btn-primary px-7 py-3.5 text-base disabled:opacity-60"
        >
          {busy ? t.joining : t.joinGroup}
        </button>
      </div>
    </form>
  );
}
