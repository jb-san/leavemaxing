import { type SubmitEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Mascot } from "~/components/Mascot";
import { Stepper } from "~/components/planner/ui";
import { newGroup } from "~/lib/together/link";
import { limitToMonths } from "~/lib/together/member";
import { type GroupRecord, LIMITS, type MemberRecord } from "~/lib/together/protocol";
import { GroupSession } from "~/lib/together/session";
import { t } from "./copy";
import { defaultMember, MemberForm } from "./MemberForm";
import { type MonthRange, MonthRangePicker } from "./MonthRangePicker";
import type { Push } from "./Together";
import { track } from "./track";

type Month = { year: number; month: number };

/** Months that can be picked, starting with the current one. */
const MONTHS_AHEAD = 24;
/** The longest group, counting both ends. */
const MAX_MONTHS = 12;
const DEFAULT_MONTHS = 6;

function upcomingMonths(now = new Date()): Month[] {
  return Array.from({ length: MONTHS_AHEAD }, (_, i) => {
    const m0 = now.getMonth() + i;
    return { year: now.getFullYear() + Math.floor(m0 / 12), month: (m0 % 12) + 1 };
  });
}

/** Every month from the first to the last of a range. */
function monthsOf({ from, to }: MonthRange): Month[] {
  const out: Month[] = [];
  for (let i = from.year * 12 + from.month - 1; i <= to.year * 12 + to.month - 1; i++) {
    out.push({ year: Math.floor(i / 12), month: (i % 12) + 1 });
  }
  return out;
}

export function CreateGroup({ onCreated, push }: { onCreated: (session: GroupSession) => void; push: Push }) {
  const id = useId();
  const options = useMemo(() => upcomingMonths(), []);
  const [name, setName] = useState("");
  const [range, setRange] = useState<MonthRange>(() => ({
    from: options[0] as Month,
    to: options[DEFAULT_MONTHS - 1] as Month,
  }));
  const [minLength, setMin] = useState<number>(LIMITS.minLength);
  const [maxLength, setMax] = useState(7);
  const [me, setMe] = useState<MemberRecord>(defaultMember);
  const [busy, setBusy] = useState(false);
  const months = useMemo(() => monthsOf(range), [range]);
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,4fr)_minmax(0,3fr)_minmax(0,3fr)] lg:gap-x-5">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
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
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span id={`${id}-when-label`} className="field-label">
              {t.when}
            </span>
            <MonthRangePicker
              id={`${id}-when`}
              labelId={`${id}-when-label`}
              value={range}
              onChange={setRange}
              min={options[0] as Month}
              max={options[options.length - 1] as Month}
              maxMonths={MAX_MONTHS}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-min`} className="field-label">
              {t.shortest}
            </label>
            <Stepper
              id={`${id}-min`}
              size="field"
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
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-max`} className="field-label">
              {t.longest}
            </label>
            <Stepper
              id={`${id}-max`}
              size="field"
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
      </section>

      <MemberForm value={me} onChange={setMe} taken={[]} />

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
    </form>
  );
}
