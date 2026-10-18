import { Smartphone } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Sheet, Stepper } from "~/components/planner/ui";
import { formatPersonal } from "~/lib/together/link";
import { changes } from "~/lib/together/member";
import { type GroupRecord, LIMITS, type MemberRecord } from "~/lib/together/protocol";
import type { GroupSession, GroupState } from "~/lib/together/session";
import { Avatar } from "./Avatar";
import { t } from "./copy";
import type { Save } from "./GroupView";
import { MemberForm } from "./MemberForm";
import { ShareSheet } from "./ShareSheet";
import { useDraft } from "./useDraft";

/** Your own settings, a link for your other devices, and for the admin, the trip and its members. */
export function MemberSheet({
  open,
  onClose,
  session,
  state,
  save,
}: {
  open: boolean;
  onClose: () => void;
  session: GroupSession;
  state: GroupState;
  /** Reports a write the session refused. */
  save: Save;
}) {
  const [personalOpen, setPersonalOpen] = useState(false);
  const personal = session.personalLink();
  return (
    <>
      <Sheet open={open} onClose={onClose} title={t.settings} wide>
        <Settings session={session} state={state} save={save} onPersonal={() => setPersonalOpen(true)} />
      </Sheet>
      {personal && (
        <ShareSheet
          open={personalOpen}
          onClose={() => setPersonalOpen(false)}
          url={formatPersonal(location.origin, personal)}
          title={t.personalTitle}
          caption={t.personalCaption}
          warning={t.personalWarning}
        />
      )}
    </>
  );
}

const blankName = (key: PropertyKey, value: unknown) =>
  key === "name" && typeof value === "string" && !value.trim();

function Settings({
  session,
  state,
  save,
  onPersonal,
}: {
  session: GroupSession;
  state: GroupState;
  save: Save;
  onPersonal: () => void;
}) {
  const me = state.me ? state.members.get(state.me) : undefined;
  const mine = useDraft<MemberRecord>((patch) => save(session.updateMe(patch)), blankName);
  if (!me || !state.me) return null;

  const value = { ...me, ...mine.draft };
  const taken = [...state.members].filter(([id]) => id !== state.me).map(([, m]) => m.color);

  return (
    <>
      <MemberForm
        value={value}
        taken={taken}
        onChange={(next) => {
          const patch = changes(value, next);
          const keys = Object.keys(patch);
          if (keys.length > 0) mine.change(patch, keys.length === 1 && keys[0] === "name");
        }}
      />
      <button type="button" className="btn btn-soft self-start" onClick={onPersonal}>
        <Smartphone size={16} /> {t.personalTitle}
      </button>
      {state.isAdmin && state.group && (
        <TripSettings session={session} state={state} group={state.group} save={save} />
      )}
    </>
  );
}

function TripSettings({
  session,
  state,
  group,
  save,
}: {
  session: GroupSession;
  state: GroupState;
  group: GroupRecord;
  save: Save;
}) {
  const id = useId();
  const trip = useDraft<GroupRecord>((patch) => save(session.updateGroup(patch)), blankName);
  const membersHeading = useRef<HTMLHeadingElement>(null);
  const value = { ...group, ...trip.draft };
  const [asking, setAsking] = useState<string | null>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const cancelButton = useRef<HTMLButtonElement>(null);
  const lastAsked = useRef<string | null>(null);

  // The confirm step takes the Remove button's place, so focus moves with it, and back on Cancel.
  useEffect(() => {
    if (asking) cancelButton.current?.focus();
    else if (lastAsked.current) removeButtons.current.get(lastAsked.current)?.focus();
    lastAsked.current = asking;
  }, [asking]);

  return (
    <section aria-labelledby={`${id}-trip`} className="card flex flex-col gap-5 p-5 sm:p-6">
      <h2 id={`${id}-trip`} className="text-2xl font-extrabold">
        {t.theTrip}
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <label htmlFor={`${id}-name`} className="field-label">
            {t.tripName}
          </label>
          <input
            id={`${id}-name`}
            value={value.name}
            maxLength={60}
            required
            autoComplete="off"
            onChange={(e) => trip.change({ name: e.target.value }, true)}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-min`} className="field-label">
            {t.shortest}
          </label>
          <Stepper
            id={`${id}-min`}
            size="field"
            value={value.minLength}
            min={LIMITS.minLength}
            max={LIMITS.maxLength}
            label={t.shortestAria}
            format={t.nDays}
            onChange={(n) => trip.change({ minLength: n, maxLength: Math.max(n, value.maxLength) }, false)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-max`} className="field-label">
            {t.longest}
          </label>
          <Stepper
            id={`${id}-max`}
            size="field"
            value={value.maxLength}
            min={LIMITS.minLength}
            max={LIMITS.maxLength}
            label={t.longestAria}
            format={t.nDays}
            onChange={(n) => trip.change({ maxLength: n, minLength: Math.min(n, value.minLength) }, false)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 ref={membersHeading} id={`${id}-members`} tabIndex={-1} className="field-label">
          {t.members}
        </h3>
        <ul aria-labelledby={`${id}-members`} className="flex flex-col divide-y divide-line">
          {[...state.members].map(([memberId, m]) => (
            <li key={memberId} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 py-2">
              <Avatar name={m.name} color={m.color} size={32} />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {memberId === state.me ? t.nameYou(m.name) : m.name}
              </span>
              {memberId === state.me ? null : asking === memberId ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{t.removeAsk(m.name)}</span>
                  <button
                    type="button"
                    className="btn btn-primary py-2"
                    onClick={() => {
                      lastAsked.current = null;
                      setAsking(null);
                      session.removeMember(memberId);
                      // The row goes with the member, so focus moves to the list's heading.
                      membersHeading.current?.focus();
                    }}
                  >
                    {t.confirm}
                  </button>
                  <button
                    ref={cancelButton}
                    type="button"
                    className="btn btn-soft py-2"
                    onClick={() => setAsking(null)}
                  >
                    {t.cancel}
                  </button>
                </span>
              ) : (
                <button
                  ref={(el) => {
                    if (el) removeButtons.current.set(memberId, el);
                    else removeButtons.current.delete(memberId);
                  }}
                  type="button"
                  className="btn btn-soft py-2"
                  aria-label={`${t.remove} ${m.name}`}
                  onClick={() => setAsking(memberId)}
                >
                  {t.remove}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
