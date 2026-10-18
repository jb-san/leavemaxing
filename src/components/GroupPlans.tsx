import { ArrowRight, Trash2, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { fromIso, parts } from "~/lib/dates";
import { formatPersonal } from "~/lib/together/link";
import type { Membership } from "~/lib/together/store";
import { monthsPhrase } from "./together/copy";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The group's months in the words the join screen uses, from the ISO days kept in the summary. */
function months(m: Membership): string {
  const s = m.summary;
  if (!s) return "";
  const a = parts(fromIso(s.from));
  const b = parts(fromIso(s.to));
  return monthsPhrase([a, b]);
}

function openHref(m: Membership): string {
  const link = { groupId: m.groupId, key: m.key, memberId: m.memberId, secret: m.secret, admin: m.admin };
  return formatPersonal("", link);
}

/** One group this browser belongs to. Nothing here is decrypted: it all comes from the stored summary. */
export function GroupCard({
  m,
  confirming,
  onAsk,
  onCancel,
  onRemove,
}: {
  m: Membership;
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const s = m.summary;
  const confirmButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);

  return (
    <li className="card flex flex-col gap-4 p-5">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--violet)_45%,var(--line))] bg-[color-mix(in_oklab,var(--violet)_16%,var(--card))] px-2.5 py-1 text-xs font-bold text-ink">
          <Users size={14} aria-hidden="true" className="text-violet" />
          Group plan
        </span>
        <h3 className="mt-2 truncate text-lg font-bold">{m.groupName}</h3>
        <p className="min-h-5 text-sm text-muted">{months(m)}</p>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1 rounded-2xl border border-line bg-card-2 p-4">
        {s ? (
          <>
            <p className="font-display text-2xl font-extrabold leading-tight">
              {plural(s.members, "person", "people")}
            </p>
            {s.agreed > 0 && (
              <p className="text-sm font-semibold">
                {plural(s.agreed, "date works", "dates work")} for everyone
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-semibold">Open it to see who is in.</p>
        )}
        {m.admin && <p className="text-xs text-muted">You created it</p>}
      </div>
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">Your personal link still works.</p>
          <div className="flex items-center gap-2">
            <button
              ref={confirmButton}
              type="button"
              className="btn flex-1 bg-red text-white"
              onClick={onRemove}
            >
              Remove? You stay in the group.
            </button>
            <button type="button" className="btn btn-soft px-3" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <a href={openHref(m)} className="btn btn-primary flex-1" aria-label={`Open ${m.groupName}`}>
            Open <ArrowRight size={16} />
          </a>
          <button
            type="button"
            className="btn btn-soft px-3"
            aria-label={`Remove ${m.groupName} from this browser`}
            onClick={onAsk}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </li>
  );
}
