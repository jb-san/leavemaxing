import { Check } from "lucide-react";
import { useEffect, useId } from "react";
import { CountryPicker } from "~/components/planner/CountryPicker";
import { cx, Stepper } from "~/components/planner/ui";
import { countries, countryByCode } from "~/data";
import { detectCountry } from "~/lib/detect";
import { loadLast } from "~/lib/storage";
import { MEMBER_COLORS, type MemberRecord } from "~/lib/together/protocol";
import { defaultWorkWeek } from "~/lib/weekends";
import { COLOR_NAMES, t } from "./copy";

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

export function MemberForm({
  value,
  onChange,
  taken,
}: {
  value: MemberRecord;
  onChange: (m: MemberRecord) => void;
  /** Colours other members already use. */
  taken: string[];
}) {
  const id = useId();
  const set = (patch: Partial<MemberRecord>) => onChange({ ...value, ...patch });
  const free = MEMBER_COLORS.filter((c) => !taken.includes(c));
  const country = countryByCode.get(value.country);
  const regions = Object.entries(country?.regions ?? {}).sort((a, b) => a[1].localeCompare(b[1]));

  // Someone else took my colour: move to the first one still free.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the free colours change
  useEffect(() => {
    const first = free[0];
    if (first && !free.includes(value.color)) set({ color: first });
  }, [free.join(), value.color]);

  return (
    <section aria-labelledby={`${id}-you`} className="card flex flex-col gap-5 p-5 sm:p-6">
      <h2 id={`${id}-you`} className="text-2xl font-extrabold">
        {t.you}
      </h2>
      <div className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
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
          <span className="field-label">{t.where}</span>
          <CountryPicker
            countries={countries}
            value={value.country}
            onChange={(c) => set({ country: c, region: null, workWeek: defaultWorkWeek(c) })}
            className="h-[46px]"
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

        <div className="flex flex-col gap-2">
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
            size="field"
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
          <span id={`${id}-colour`} className="field-label">
            {t.colour}
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-colour`} className="flex flex-wrap gap-1.5 sm:gap-2">
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
    </section>
  );
}
