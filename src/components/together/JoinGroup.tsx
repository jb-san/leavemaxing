import { type SubmitEvent, useRef, useState } from "react";
import { Toasts, useToasts } from "~/components/planner/ui";
import { forJoining } from "~/lib/together/member";
import type { MemberRecord } from "~/lib/together/protocol";
import type { GroupSession } from "~/lib/together/session";
import { Avatar } from "./Avatar";
import { monthsPhrase, t } from "./copy";
import { defaultMember, MemberForm } from "./MemberForm";
import { track } from "./track";
import { useGroup } from "./useGroup";

/** The screen behind an invite link: who invited you, who is in, and your own details. */
export function JoinGroup({ session, onJoined }: { session: GroupSession; onJoined?: () => void }) {
  const state = useGroup(session);
  const [me, setMe] = useState<MemberRecord>(defaultMember);
  const [busy, setBusy] = useState(false);
  const { toasts, push } = useToasts();
  const joining = useRef(false);
  const { group, members } = state;
  if (!group) return null;

  const creator = members.get(group.createdBy);
  const others = [...members.values()];
  const taken = others.map((m) => m.color);

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (joining.current) return;
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

      {others.length > 0 && (
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-muted">{t.joinHint}</p>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary px-7 py-3.5 text-base disabled:opacity-60"
        >
          {busy ? t.joining : t.joinGroup}
        </button>
      </div>
      <Toasts toasts={toasts} />
    </form>
  );
}
