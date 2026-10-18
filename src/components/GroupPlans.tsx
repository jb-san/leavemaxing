import { ArrowRight, Check, Copy, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fromIso, parts } from "~/lib/dates";
import { formatPersonal, type PersonalLink } from "~/lib/together/link";
import type { Membership } from "~/lib/together/store";
import { copyText } from "./together/clipboard";
import { plansCopy as c, monthsPhrase } from "./together/copy";

/** The group's months in the words the join screen uses, from the ISO days kept in the summary. */
function months(m: Membership): string {
  const s = m.summary;
  if (!s) return "";
  const a = parts(fromIso(s.from));
  const b = parts(fromIso(s.to));
  return monthsPhrase([a, b]);
}

function personal(m: Membership): PersonalLink {
  return { groupId: m.groupId, key: m.key, memberId: m.memberId, secret: m.secret, admin: m.admin };
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
  const trashButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(confirming);
  const [copied, setCopied] = useState(false);

  // The confirm step takes the trash button's place. Focus moves into it, and back on Cancel.
  // (Remove takes the whole card away, and the list moves focus on.)
  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
    else if (wasConfirming.current) trashButton.current?.focus();
    wasConfirming.current = confirming;
    if (!confirming) setCopied(false);
  }, [confirming]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await copyText(formatPersonal(location.origin, personal(m)))) setCopied(true);
  };

  return (
    <li className="card flex flex-col gap-4 p-5">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--violet)_45%,var(--line))] bg-[color-mix(in_oklab,var(--violet)_16%,var(--card))] px-2.5 py-1 text-xs font-bold text-ink">
          <Users size={14} aria-hidden="true" className="text-violet" />
          {c.groupPlan}
        </span>
        <h3 className="mt-2 truncate text-lg font-bold">{m.groupName}</h3>
        <p className="min-h-5 text-sm text-muted">{months(m)}</p>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1 rounded-2xl border border-line bg-card-2 p-4">
        {s ? (
          <>
            <p className="font-display text-2xl font-extrabold leading-tight">{c.people(s.members)}</p>
            {s.agreed > 0 && <p className="text-sm font-semibold">{c.agreed(s.agreed)}</p>}
          </>
        ) : (
          <p className="text-sm font-semibold">{c.openToSee}</p>
        )}
        {m.admin && <p className="text-xs text-muted">{c.youCreated}</p>}
      </div>
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">{c.stillWorks}</p>
          {/* Keeps the way back in before this browser forgets the group. */}
          <button type="button" className="btn btn-soft" onClick={copy}>
            <span key={String(copied)} className="swap">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </span>
            <span aria-live="polite">{copied ? c.copied : c.copyPersonal}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              ref={confirmButton}
              type="button"
              className="btn flex-1 bg-red text-white"
              onClick={onRemove}
            >
              {c.removeConfirm}
            </button>
            <button type="button" className="btn btn-soft px-3" onClick={onCancel}>
              {c.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <a
            href={formatPersonal("", personal(m))}
            className="btn btn-primary flex-1"
            aria-label={c.openAria(m.groupName)}
          >
            {c.open} <ArrowRight size={16} />
          </a>
          <button
            ref={trashButton}
            type="button"
            className="btn btn-soft px-3"
            aria-label={c.removeAria(m.groupName)}
            onClick={onAsk}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </li>
  );
}
