import { type SubmitEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Mascot } from "~/components/Mascot";
import { Stepper, Toasts, useToasts } from "~/components/planner/ui";
import { MONTHS_LONG } from "~/lib/dates";
import { newGroup } from "~/lib/together/link";
import { limitToMonths } from "~/lib/together/member";
import { type GroupRecord, LIMITS, type MemberRecord } from "~/lib/together/protocol";
import { GroupSession } from "~/lib/together/session";
import { t } from "./copy";
import { defaultMember, MemberForm } from "./MemberForm";
import { track } from "./track";

type Month = { year: number; month: number };

/** Months offered in the pickers, starting with the current one. */
const MONTHS_AHEAD = 24;
/** The last month can be at most this many months after the first. */
const MAX_SPAN = 12;
const DEFAULT_SPAN = 5;

function upcomingMonths(now = new Date()): Month[] {
  return Array.from({ length: MONTHS_AHEAD }, (_, i) => {
    const m0 = now.getMonth() + i;
    return { year: now.getFullYear() + Math.floor(m0 / 12), month: (m0 % 12) + 1 };
  });
}

const monthLabel = (m: Month) => `${MONTHS_LONG[m.month - 1]} ${m.year}`;

const selectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
};
const selectClass = "input appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10";

export function CreateGroup({ onCreated }: { onCreated: (session: GroupSession) => void }) {
  const id = useId();
  const options = useMemo(() => upcomingMonths(), []);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(DEFAULT_SPAN);
  const [minLength, setMin] = useState<number>(LIMITS.minLength);
  const [maxLength, setMax] = useState(7);
  const [me, setMe] = useState<MemberRecord>(defaultMember);
  const [busy, setBusy] = useState(false);
  const { toasts, push } = useToasts();
  const months = useMemo(() => options.slice(from, to + 1), [options, from, to]);
  const lastTo = Math.min(options.length - 1, from + MAX_SPAN);
  // A link opened while the group is being created wins; the finished create must not take over.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const link = newGroup();
    const session = new GroupSession(link);
    const group: GroupRecord = { name: name.trim(), months, minLength, maxLength, createdBy: "" };
    try {
      await session.create(group, limitToMonths({ ...me, name: me.name.trim() }, months));
    } catch {
      session.close();
      if (!mounted.current) return;
      setBusy(false);
      push(t.createFailed, "warn");
      return;
    }
    if (!mounted.current) {
      session.close();
      return;
    }
    track("together_create");
    onCreated(session);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 pb-2 pt-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="max-w-[14ch] text-[clamp(34px,5.4vw,60px)] font-extrabold leading-[0.95]">
          {t.title}
        </h1>
        <div className="flex items-end gap-3 sm:max-w-[30rem] sm:pb-1">
          <Mascot size={56} mood="happy" title="" className="shrink-0" />
          <div className="bubble mb-6 flex flex-col gap-1.5 text-[15px] leading-snug">
            <p>{t.lead}</p>
            <p className="text-sm text-muted">{t.privacy}</p>
          </div>
        </div>
      </div>

      <section aria-labelledby={`${id}-trip`} className="card flex flex-col gap-5 p-5 sm:p-6">
        <h2 id={`${id}-trip`} className="text-2xl font-extrabold">
          {t.trip}
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
            <label htmlFor={`${id}-name`} className="field-label">
              {t.tripName}
            </label>
            <input
              id={`${id}-name`}
              value={name}
              maxLength={60}
              required
              pattern=".*\S.*"
              placeholder={t.tripNamePlaceholder}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              className="input placeholder:font-medium placeholder:text-muted/70"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-2">{t.when}</legend>
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label={t.from}
                value={from}
                onChange={(e) => {
                  const f = Number(e.target.value);
                  setFrom(f);
                  setTo((x) => Math.min(Math.max(x, f), f + MAX_SPAN, options.length - 1));
                }}
                className={selectClass}
                style={selectStyle}
              >
                {options.map((m, i) => (
                  <option key={monthLabel(m)} value={i}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t.to}
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
                className={selectClass}
                style={selectStyle}
              >
                {options.slice(from, lastTo + 1).map((m, i) => (
                  <option key={monthLabel(m)} value={from + i}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-2">{t.tripLength}</legend>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-min`} className="text-xs text-muted">
                  {t.shortest}
                </label>
                <Stepper
                  id={`${id}-min`}
                  value={minLength}
                  min={LIMITS.minLength}
                  max={LIMITS.maxLength}
                  label={t.shortestAria}
                  format={t.nDays}
                  onChange={(n) => {
                    setMin(n);
                    if (maxLength < n) setMax(n);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-max`} className="text-xs text-muted">
                  {t.longest}
                </label>
                <Stepper
                  id={`${id}-max`}
                  value={maxLength}
                  min={LIMITS.minLength}
                  max={LIMITS.maxLength}
                  label={t.longestAria}
                  format={t.nDays}
                  onChange={(n) => {
                    setMax(n);
                    if (minLength > n) setMin(n);
                  }}
                />
              </div>
            </div>
          </fieldset>
        </div>
      </section>

      <MemberForm value={me} onChange={setMe} months={months} taken={[]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-muted">{t.createHint}</p>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary px-7 py-3.5 text-base disabled:opacity-60"
        >
          {busy ? t.creating : t.create}
        </button>
      </div>
      <Toasts toasts={toasts} />
    </form>
  );
}
