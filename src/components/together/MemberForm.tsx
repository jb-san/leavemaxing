import { Check, Info } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Calendar } from "~/components/planner/Calendar";
import { CountryPicker } from "~/components/planner/CountryPicker";
import { cx, DayIcon, Stepper } from "~/components/planner/ui";
import { countries, countryByCode } from "~/data";
import { type DayNum, dayNum, daysInMonth, localToday, weekdayMon0 } from "~/lib/dates";
import { detectCountry } from "~/lib/detect";
import { type HolidayFile, holidayMap, loadHolidayFile, resolveHolidays } from "~/lib/holidays";
import type { DayKind } from "~/lib/planner/types";
import { loadLast } from "~/lib/storage";
import { MEMBER_COLORS, type MemberRecord } from "~/lib/together/protocol";
import { defaultWorkWeek, SUNDAY_FIRST } from "~/lib/weekends";
import { COLOR_NAMES, t } from "./copy";

type Month = { year: number; month: number };

const NO_FILES: (HolidayFile | undefined)[] = [];
const MAX_NAME = 40;
const MAX_ALLOWANCE = 80;
const FALLBACK_COUNTRY = "US";

/** A new member, prefilled from the last solo plan in this browser, or a guess at the country. */
export function defaultMember(): MemberRecord {
  const last = loadLast();
  const base = {
    name: "",
    color: MEMBER_COLORS[0] as string,
    allowance: 5,
    proposals: [],
    votes: {},
  };
  if (last && countryByCode.has(last.country)) {
    return {
      ...base,
      country: last.country,
      region: last.region,
      workWeek: [...last.workWeek],
      customOff: [...last.customOff],
      blocked: [...last.blocked],
    };
  }
  const country = detectCountry(new Set(countries.map((c) => c.code))) ?? FALLBACK_COUNTRY;
  return { ...base, country, region: null, workWeek: defaultWorkWeek(country), customOff: [], blocked: [] };
}

/** How each day looks for one member. A blocked day shows as blocked whatever else it is. */
function memberKinds(
  record: MemberRecord,
  holidays: Map<DayNum, string[]>,
  months: Month[],
): Map<DayNum, DayKind> {
  const kinds = new Map<DayNum, DayKind>();
  const blocked = new Set(record.blocked);
  const off = new Set(record.customOff);
  for (const { year, month } of months) {
    const first = dayNum(year, month, 1);
    for (let d = first; d < first + daysInMonth(year, month); d++) {
      if (blocked.has(d)) kinds.set(d, "blocked");
      else if (holidays.has(d)) kinds.set(d, "holiday");
      else if (!(record.workWeek[weekdayMon0(d)] ?? true)) kinds.set(d, "weekend");
      else if (off.has(d)) kinds.set(d, "custom");
    }
  }
  return kinds;
}

/** Public holidays for a member over the group's years. Missing years just have none. */
function useHolidays(country: string, region: string | null, months: Month[]) {
  const years = [...new Set(months.map((m) => m.year))];
  const key = `${country}:${years.join(",")}`;
  const [files, setFiles] = useState<{ key: string; files: (HolidayFile | undefined)[] } | null>(null);
  const [failed, setFailed] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by country and years
  useEffect(() => {
    let live = true;
    setFailed(false);
    Promise.all(years.map((y) => loadHolidayFile(country, y)))
      .then((list) => live && setFiles({ key, files: list }))
      .catch(() => {
        if (!live) return;
        setFailed(true);
        setFiles({ key, files: [] });
      });
    return () => {
      live = false;
    };
  }, [key]);

  const current = files?.key === key ? files.files : NO_FILES;
  const map = useMemo(() => holidayMap(resolveHolidays(current, region)), [current, region]);
  return { holidays: map, failed };
}

export function MemberForm({
  value,
  onChange,
  months,
  taken,
}: {
  value: MemberRecord;
  onChange: (m: MemberRecord) => void;
  months: Month[];
  /** Colours other members already use. */
  taken: string[];
}) {
  const id = useId();
  const set = (patch: Partial<MemberRecord>) => onChange({ ...value, ...patch });
  const free = MEMBER_COLORS.filter((c) => !taken.includes(c));
  const country = countryByCode.get(value.country);
  const regions = Object.entries(country?.regions ?? {}).sort((a, b) => a[1].localeCompare(b[1]));
  const [today] = useState(localToday);
  const { holidays, failed } = useHolidays(value.country, value.region, months);
  const kinds = useMemo(() => memberKinds(value, holidays, months), [value, holidays, months]);

  // Someone else took my colour: move to the first one still free.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the free colours change
  useEffect(() => {
    const first = free[0];
    if (first && !free.includes(value.color)) set({ color: first });
  }, [free.join(), value.color]);

  const toggle = (day: DayNum) => {
    if (day < today) return;
    const blocked = value.blocked.includes(day)
      ? value.blocked.filter((d) => d !== day)
      : [...value.blocked, day].sort((a, b) => a - b);
    set({ blocked });
  };

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={`${id}-you`} className="card flex flex-col gap-5 p-5 sm:p-6">
        <h2 id={`${id}-you`} className="text-2xl font-extrabold">
          {t.you}
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-name`} className="field-label">
                {t.yourName}
              </label>
              <input
                id={`${id}-name`}
                value={value.name}
                maxLength={MAX_NAME}
                required
                pattern=".*\S.*"
                autoComplete="given-name"
                onChange={(e) => set({ name: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span id={`${id}-colour`} className="field-label">
                {t.colour}
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`${id}-colour`}
                className="flex flex-wrap gap-1.5 sm:gap-2"
              >
                {MEMBER_COLORS.map((c, i) =>
                  free.includes(c) ? (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={value.color === c}
                      aria-label={COLOR_NAMES[i]}
                      onClick={() => set({ color: c })}
                      style={{ backgroundColor: c }}
                      className={cx(
                        "grid size-9 place-items-center rounded-full text-white ring-offset-2 ring-offset-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.92]",
                        value.color === c && "ring-2 ring-ink",
                      )}
                    >
                      {value.color === c && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                    </button>
                  ) : null,
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="field-label">{t.where}</span>
            <CountryPicker
              countries={countries}
              value={value.country}
              onChange={(c) => set({ country: c, region: null, workWeek: defaultWorkWeek(c) })}
            />
            {regions.length > 0 && (
              <select
                aria-label={t.region}
                value={value.region ?? ""}
                onChange={(e) => set({ region: e.target.value || null })}
                className="input appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                }}
              >
                <option value="">{t.wholeCountry}</option>
                {regions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
            <label htmlFor={`${id}-allowance`} className="field-label">
              {t.allowance}
            </label>
            <Stepper
              id={`${id}-allowance`}
              value={value.allowance}
              onChange={(n) => set({ allowance: n })}
              min={0}
              max={MAX_ALLOWANCE}
              label={t.allowanceAria}
              big
            />
          </div>
        </div>
      </section>

      <section aria-labelledby={`${id}-cant`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-cant`} className="text-2xl font-extrabold">
              {t.cantDo}
            </h2>
            <p className="text-sm text-muted">{t.cantDoHint}</p>
          </div>
          <Legend />
        </div>
        {failed && (
          <p className="flex gap-2 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t.holidaysError}
          </p>
        )}
        <Calendar
          months={months}
          kinds={kinds}
          breaks={[]}
          holidays={holidays}
          today={today}
          pop={EMPTY_POP}
          sundayFirst={SUNDAY_FIRST.has(value.country)}
          onDay={toggle}
          pastDisabled
        />
      </section>
    </div>
  );
}

const EMPTY_POP = new Map<DayNum, number>();

function Legend() {
  const items: [string, React.ReactNode, string][] = [
    ["bg-sun text-sun-ink", DayIcon.sun, t.legendHoliday],
    ["bg-wkd", null, t.legendWeekend],
    ["bg-red text-white", DayIcon.x, t.legendBlocked],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted">
      {items.map(([cls, icon, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cx("grid size-[18px] place-items-center rounded-full [&>svg]:size-[11px]", cls)}
          >
            {icon}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
