import { useEffect, useRef, useState } from "react";
import { Mascot } from "~/components/Mascot";
import type { MemberRecord } from "~/lib/together/protocol";
import type { IdentityChoice as Choice, GroupSession } from "~/lib/together/session";
import { t } from "./copy";

/**
 * Asked when a personal link names someone other than who this device already is in the group.
 * Nothing changes until one of the two is picked.
 */
export function IdentityChoice({
  session,
  choice,
  members,
  onStayed,
}: {
  session: GroupSession;
  choice: Choice;
  members: Map<string, MemberRecord>;
  onStayed: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const theirs = members.get(choice.link)?.name || t.someoneElse;
  const mine = members.get(choice.stored)?.name || t.anotherMember;

  // The screen replaces the group's loading line, so start reading from its question.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const pick = async (keep: "stored" | "link") => {
    if (busy) return;
    setBusy(true);
    await session.choose(keep);
    if (keep === "stored") onStayed();
  };

  return (
    <div className="card mt-3 flex max-w-2xl flex-col items-start gap-4 p-6 sm:flex-row sm:gap-6 sm:p-8">
      <Mascot size={72} mood="puzzled" title="" className="shrink-0" />
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-2">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-[clamp(26px,3.6vw,40px)] font-extrabold leading-tight outline-none"
          >
            {t.linkBelongsTo(theirs)}
          </h1>
          <p className="text-lg">{t.onThisDevice(mine)}</p>
          {choice.losesAdmin && <p className="text-muted">{t.losesAdmin}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => pick("stored")}>
            {t.stayAs(mine)}
          </button>
          <button type="button" className="btn btn-soft" disabled={busy} onClick={() => pick("link")}>
            {t.switchTo(theirs)}
          </button>
        </div>
      </div>
    </div>
  );
}
