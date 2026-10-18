import { ChevronDown, Info } from "lucide-react";
import type { Dispatch } from "react";
import { countries, countryByCode } from "~/data";
import { useI18n } from "~/i18n/context";
import { leaveYearLabel } from "~/lib/dates";
import type { Style } from "~/lib/planner/types";
import { regionCopy } from "~/lib/regionLabels";
import { MAX_BUDGET, type Settings } from "~/lib/settings";
import { CountryPicker } from "./CountryPicker";
import type { Action } from "./state";
import { cx, Stepper } from "./ui";

export function SettingsPanel({
  settings: s,
  dispatch,
  years,
  idPrefix,
  localizeRegions = false,
}: {
  settings: Settings;
  dispatch: Dispatch<Action>;
  years: number[];
  idPrefix: string;
  localizeRegions?: boolean;
}) {
  const i18n = useI18n();
  const p = i18n.m.planner;
  const styles: { id: Style; label: string; hint: string }[] = [
    { id: "weekends", label: p.styleWeekends, hint: p.styleWeekendsHint },
    { id: "balanced", label: p.styleBalanced, hint: p.styleBalancedHint },
    { id: "long", label: p.styleLong, hint: p.styleLongHint },
  ];
  const set = (patch: Partial<Settings>) => dispatch({ type: "set", patch });
  const country = countryByCode.get(s.country);
  const regions = Object.entries(country?.regions ?? {}).sort((a, b) => a[1].localeCompare(b[1]));
  const edits = s.locked.length + s.blocked.length + s.customOff.length;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="field-label">{p.where}</span>
        <CountryPicker
          countries={countries}
          value={s.country}
          onChange={(c) => dispatch({ type: "country", country: c })}
        />
        {regions.length > 0 && (
          <select
            id={id("region")}
            aria-label={p.region}
            value={s.region ?? ""}
            onChange={(e) => set({ region: e.target.value || null })}
            className="input appearance-none pr-10 bg-[length:16px] bg-[right_14px_center] bg-no-repeat"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
            }}
          >
            <option value="">{p.wholeCountry}</option>
            {regions.map(([code, name]) => (
              <option key={code} value={code}>
                {localizeRegions ? regionCopy(s.country, code, name).name : name}
              </option>
            ))}
          </select>
        )}
        {country?.regional && !s.region && (
          <p className="flex gap-2 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            {p.regionalHint}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="field-label" id={id("year-label")}>
          {p.year}
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
          {p.leaveYouHave}
        </label>
        <Stepper
          id={id("budget")}
          value={s.budget}
          onChange={(n) => set({ budget: n })}
          min={0}
          max={MAX_BUDGET}
          label={p.leaveUnit.many}
          valueName={i18n.count(s.budget, p.leaveUnit)}
          big
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="field-label" id={id("style-label")}>
          {p.style}
        </span>
        <div role="radiogroup" aria-labelledby={id("style-label")} className="flex flex-wrap gap-1.5">
          {styles.map((st) => (
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
        <p className="text-xs text-muted">{styles.find((x) => x.id === s.style)?.hint}.</p>
      </div>

      <details className="smooth-details group rounded-3xl border border-line bg-card-2/60 transition-colors open:bg-transparent">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          {p.fineTune}
          <ChevronDown
            size={16}
            className="text-muted transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-5 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="field-label" htmlFor={id("min")}>
                {p.shortest}
              </label>
              <Stepper
                id={id("min")}
                value={s.minBreak}
                min={1}
                max={30}
                label={i18n.code === "en" ? "days in the shortest break" : p.shortest}
                format={(n) => (i18n.code === "en" ? `${n}d` : i18n.countText(n, p.nDays))}
                onChange={(n) =>
                  set({ minBreak: n, maxBreak: s.maxBreak !== null && s.maxBreak < n ? n : s.maxBreak })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="field-label" htmlFor={id("max")}>
                {p.longestBreak}
              </label>
              <select
                id={id("max")}
                value={s.maxBreak ?? ""}
                onChange={(e) => set({ maxBreak: e.target.value ? Number(e.target.value) : null })}
                className="input h-full"
              >
                <option value="">{p.noLimit}</option>
                {Array.from(
                  { length: 30 - Math.max(2, s.minBreak) + 1 },
                  (_, i) => Math.max(2, s.minBreak) + i,
                ).map((n) => (
                  <option key={n} value={n}>
                    {i18n.countText(n, p.nDays)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-2">{p.favouriteMonths}</legend>
            <div className="grid grid-cols-6 gap-1.5">
              {i18n.monthsShort.map((m, i) => {
                const month = i + 1;
                const on = s.months.includes(month);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    aria-label={i18n.monthsLong[i]}
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
            <p className="text-xs text-muted">{p.monthsHint}</p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-2">{p.workDays}</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {i18n.weekdaysShort.map((d, i) => (
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
              {p.yearStarts}
            </label>
            <select
              id={id("ys")}
              value={s.yearStart}
              onChange={(e) => set({ yearStart: Number(e.target.value) })}
              className="input"
            >
              {i18n.monthsLong.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="field-label">{p.yourDays}</span>
            <p className="text-xs text-muted">{p.yourDaysHint}</p>
            {edits > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {s.locked.length > 0 && (
                  <span className="chip py-1">🔒 {i18n.countText(s.locked.length, p.kept)}</span>
                )}
                {s.blocked.length > 0 && (
                  <span className="chip py-1">✕ {i18n.countText(s.blocked.length, p.blockedCount)}</span>
                )}
                {s.customOff.length > 0 && (
                  <span className="chip py-1">★ {i18n.countText(s.customOff.length, p.daysOffCount)}</span>
                )}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resetDays" })}
                  className={cx("ml-auto text-muted underline hover:text-ink")}
                >
                  {p.clearAll}
                </button>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
