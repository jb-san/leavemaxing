import { ChevronDown, Info } from "lucide-react";
import type { Dispatch } from "react";
import { countries, countryByCode } from "~/data";
import { leaveYearLabel, MONTHS_LONG, MONTHS_SHORT, WEEKDAYS_SHORT } from "~/lib/dates";
import { STYLES } from "~/lib/planner/types";
import { MAX_BUDGET, type Settings } from "~/lib/settings";
import { CountryPicker } from "./CountryPicker";
import type { Action } from "./state";
import { cx, Stepper } from "./ui";

export function SettingsPanel({
  settings: s,
  dispatch,
  years,
  idPrefix,
}: {
  settings: Settings;
  dispatch: Dispatch<Action>;
  years: number[];
  idPrefix: string;
}) {
  const set = (patch: Partial<Settings>) => dispatch({ type: "set", patch });
  const country = countryByCode.get(s.country);
  const regions = Object.entries(country?.regions ?? {}).sort((a, b) => a[1].localeCompare(b[1]));
  const edits = s.locked.length + s.blocked.length + s.customOff.length;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="field-label">Where you work</span>
        <CountryPicker
          countries={countries}
          value={s.country}
          onChange={(c) => dispatch({ type: "country", country: c })}
        />
        {regions.length > 0 && (
          <select
            id={id("region")}
            aria-label="Region"
            value={s.region ?? ""}
            onChange={(e) => set({ region: e.target.value || null })}
            className="input appearance-none pr-10 bg-[length:16px] bg-[right_14px_center] bg-no-repeat"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
            }}
          >
            <option value="">Whole country (national holidays)</option>
            {regions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        )}
        {country?.regional && !s.region && (
          <p className="flex gap-2 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            Some holidays here only apply in certain regions. Pick yours for an exact plan.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="field-label" id={id("year-label")}>
          Year
        </span>
        <div role="radiogroup" aria-labelledby={id("year-label")} className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              role="radio"
              aria-checked={s.year === y}
              onClick={() => set({ year: y })}
              className="chip px-3 tabular-nums"
            >
              {leaveYearLabel(y, s.yearStart)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="field-label" htmlFor={id("budget")}>
          Leave days you have
        </label>
        <Stepper
          id={id("budget")}
          value={s.budget}
          onChange={(n) => set({ budget: n })}
          min={0}
          max={MAX_BUDGET}
          label="leave days"
          big
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="field-label" id={id("style-label")}>
          Style
        </span>
        <div role="radiogroup" aria-labelledby={id("style-label")} className="flex flex-wrap gap-1.5">
          {STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              role="radio"
              aria-checked={s.style === st.id}
              title={st.hint}
              onClick={() => set({ style: st.id })}
              className="chip"
            >
              {st.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{STYLES.find((x) => x.id === s.style)?.hint}.</p>
      </div>

      <details className="group rounded-3xl border border-line bg-card-2/60 open:bg-transparent">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          Fine-tune
          <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="field-label" htmlFor={id("min")}>
                Shortest break
              </label>
              <Stepper
                id={id("min")}
                value={s.minBreak}
                min={1}
                max={30}
                label="days in the shortest break"
                format={(n) => `${n}d`}
                onChange={(n) =>
                  set({ minBreak: n, maxBreak: s.maxBreak !== null && s.maxBreak < n ? n : s.maxBreak })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="field-label" htmlFor={id("max")}>
                Longest break
              </label>
              <select
                id={id("max")}
                value={s.maxBreak ?? ""}
                onChange={(e) => set({ maxBreak: e.target.value ? Number(e.target.value) : null })}
                className="input h-full"
              >
                <option value="">No limit</option>
                {Array.from(
                  { length: 30 - Math.max(2, s.minBreak) + 1 },
                  (_, i) => Math.max(2, s.minBreak) + i,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-2">Favourite months</legend>
            <div className="grid grid-cols-6 gap-1.5">
              {MONTHS_SHORT.map((m, i) => {
                const month = i + 1;
                const on = s.months.includes(month);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    aria-label={MONTHS_LONG[i]}
                    onClick={() =>
                      set({ months: on ? s.months.filter((x) => x !== month) : [...s.months, month] })
                    }
                    className="chip justify-center px-0 text-xs"
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">The planner leans towards breaks in these months.</p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-2">Days you work</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS_SHORT.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={s.workWeek[i]}
                  onClick={() => set({ workWeek: s.workWeek.map((w, j) => (j === i ? !w : w)) })}
                  className="chip justify-center px-0 text-xs"
                >
                  {d}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label className="field-label" htmlFor={id("ys")}>
              Leave year starts in
            </label>
            <select
              id={id("ys")}
              value={s.yearStart}
              onChange={(e) => set({ yearStart: Number(e.target.value) })}
              className="input"
            >
              {MONTHS_LONG.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="field-label">Your days</span>
            <p className="text-xs text-muted">
              Tap any day in the calendar to keep it as leave, block it, or mark it as a day off (like a
              company shutdown).
            </p>
            {edits > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {s.locked.length > 0 && <span className="chip py-1">🔒 {s.locked.length} kept</span>}
                {s.blocked.length > 0 && <span className="chip py-1">✕ {s.blocked.length} blocked</span>}
                {s.customOff.length > 0 && <span className="chip py-1">★ {s.customOff.length} days off</span>}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resetDays" })}
                  className={cx("ml-auto text-muted underline hover:text-ink")}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
