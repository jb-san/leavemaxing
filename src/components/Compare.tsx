import { ArrowRight, Plus, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { countries, countryByCode, placeName } from "~/data";
import { type DayNum, leaveYearRange, localToday, MONTHS_SHORT } from "~/lib/dates";
import { detectCountry } from "~/lib/detect";
import { loadHolidayFile } from "~/lib/holidays";
import { runPlan } from "~/lib/planClient";
import { toPlanInput, yearsNeeded } from "~/lib/planInput";
import { type Plan, STYLES, type Style } from "~/lib/planner/types";
import { DEFAULT_BUDGET, defaultSettings, MAX_BUDGET, planPath, toQuery } from "~/lib/settings";
import { loadLast } from "~/lib/storage";
import { CountryPicker } from "./planner/CountryPicker";
import { cx, Stepper } from "./planner/ui";

interface Pick {
  country: string;
  region: string | null;
}

const key = (p: Pick) => `${p.country}.${p.region ?? ""}`;

const COLORS = ["bg-lime", "bg-violet", "bg-sky", "bg-sun"];
const MAX = 4;

function parsePicks(v: string | null): Pick[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => {
      const [country = "", region = null] = s.split(".");
      return { country: country.toUpperCase(), region };
    })
    .filter((p) => countryByCode.has(p.country))
    .map((p) => ({
      ...p,
      region: p.region && p.region in (countryByCode.get(p.country)?.regions ?? {}) ? p.region : null,
    }))
    .slice(0, MAX);
}

export default function Compare({ years }: { years: number[] }) {
  const thisYear = new Date().getFullYear();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [year, setYear] = useState(years.includes(thisYear + 1) ? thisYear + 1 : thisYear);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [style, setStyle] = useState<Style>("balanced");
  const [plans, setPlans] = useState<Record<string, Plan | "error">>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    let initial = parsePicks(q.get("c"));
    const y = Number(q.get("y"));
    if (years.includes(y)) setYear(y);
    const d = Number(q.get("d"));
    if (d > 0 && d <= MAX_BUDGET) setBudget(d);
    const s = q.get("s");
    if (s === "weekends" || s === "balanced" || s === "long") setStyle(s);
    if (initial.length === 0) {
      const mine = loadLast()?.country ?? detectCountry(new Set(countries.map((c) => c.code))) ?? "US";
      initial = [mine, "DE", "GB", "JP"]
        .filter((c, i, a) => a.indexOf(c) === i)
        .slice(0, 3)
        .map((country) => ({ country, region: null }));
    }
    setPicks(initial);
    setReady(true);
  }, [years]);

  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams({
      c: picks.map((p) => (p.region ? `${p.country}.${p.region}` : p.country)).join(","),
      y: String(year),
      d: String(budget),
      s: style,
    });
    window.history.replaceState(null, "", `?${q}`);
  }, [picks, year, budget, style, ready]);

  const today = localToday();

  useEffect(() => {
    let live = true;
    for (const p of picks) {
      const s = { ...defaultSettings(p.country, year), region: p.region, budget, style };
      Promise.all(yearsNeeded(s).map((y) => loadHolidayFile(p.country, y)))
        .then((files) => runPlan(toPlanInput(s, files, today)))
        .then((plan) => {
          if (live) setPlans((prev) => ({ ...prev, [`${key(p)}|${year}|${budget}|${style}`]: plan }));
        })
        .catch(() => {
          if (live) setPlans((prev) => ({ ...prev, [`${key(p)}|${year}|${budget}|${style}`]: "error" }));
        });
    }
    return () => {
      live = false;
    };
  }, [picks, year, budget, style, today]);

  const results = picks.map((p) => ({ pick: p, plan: plans[`${key(p)}|${year}|${budget}|${style}`] }));
  const best = useMemo(() => {
    let top: string | null = null;
    let max = -1;
    for (const r of results) {
      if (r.plan && r.plan !== "error" && r.plan.stats.daysOff > max) {
        max = r.plan.stats.daysOff;
        top = key(r.pick);
      }
    }
    return top;
  }, [results]);

  const range = leaveYearRange(year, 1);

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Comparison settings"
        className="card grid gap-5 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <div className="flex flex-col gap-2">
          <span className="field-label">Year</span>
          <div role="radiogroup" aria-label="Year" className="flex flex-wrap gap-1.5">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                role="radio"
                aria-checked={year === y}
                onClick={() => setYear(y)}
                className="chip px-3"
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:w-48">
          <label className="field-label" htmlFor="cmp-budget">
            Leave days
          </label>
          <Stepper
            id="cmp-budget"
            value={budget}
            onChange={setBudget}
            min={1}
            max={MAX_BUDGET}
            label="leave days"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="field-label">Style</span>
          <div role="radiogroup" aria-label="Style" className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={style === s.id}
                onClick={() => setStyle(s.id)}
                className="chip"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ul className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {results.map(({ pick, plan }, i) => {
          const c = countryByCode.get(pick.country);
          const regions = Object.entries(c?.regions ?? {}).sort((a, b) => a[1].localeCompare(b[1]));
          const s = { ...defaultSettings(pick.country, year), region: pick.region, budget, style };
          const q = toQuery(s).toString();
          const isBest = best === key(pick) && results.length > 1;
          return (
            <li
              key={key(pick)}
              className={cx("card relative flex flex-col gap-4 p-5", isBest && "ring-4 ring-lime")}
            >
              {isBest && (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-ink">
                  <Trophy size={13} /> Most time off
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={cx("size-3 shrink-0 rounded-full", COLORS[i])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <CountryPicker
                    countries={countries}
                    value={pick.country}
                    exclude={picks.filter((_, j) => j !== i).map((p) => p.country)}
                    onChange={(code) =>
                      setPicks(picks.map((p, j) => (j === i ? { country: code, region: null } : p)))
                    }
                    label={`Country ${i + 1}`}
                  />
                </div>
                {picks.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${c?.name}`}
                    onClick={() => setPicks(picks.filter((_, j) => j !== i))}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-card-2 hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {regions.length > 0 && (
                <select
                  aria-label={`Region in ${c?.name}`}
                  value={pick.region ?? ""}
                  onChange={(e) =>
                    setPicks(picks.map((p, j) => (j === i ? { ...p, region: e.target.value || null } : p)))
                  }
                  className="input text-sm"
                >
                  <option value="">Whole country</option>
                  {regions.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
              {plan === "error" ? (
                <p className="text-sm text-red">Couldn't load this country. Check your connection.</p>
              ) : plan ? (
                <>
                  <div className="rounded-2xl bg-hero p-4 text-hero-ink">
                    <p className="font-display text-3xl font-extrabold leading-none">
                      {plan.stats.daysOff}{" "}
                      <span className="text-base font-bold text-hero-muted">days off</span>
                    </p>
                    <p className="mt-1 text-sm text-hero-muted">
                      {plan.stats.multiplier.toFixed(1)}× · {plan.stats.breaksWithLeave} breaks · longest{" "}
                      {plan.stats.longest}d
                    </p>
                  </div>
                  <a href={`${planPath(pick.country, year)}${q ? `?${q}` : ""}`} className="btn btn-soft">
                    Open {placeName(pick.country, pick.region)} <ArrowRight size={16} />
                  </a>
                </>
              ) : (
                <div className="h-[132px] animate-pulse rounded-2xl bg-card-2" />
              )}
            </li>
          );
        })}
        {picks.length < MAX && (
          <li>
            <button
              type="button"
              onClick={() => {
                const next = countries.find((c) => !picks.some((p) => p.country === c.code));
                if (next) setPicks([...picks, { country: next.code, region: null }]);
              }}
              className="grid min-h-40 w-full place-items-center rounded-[28px] border-2 border-dashed border-line font-bold text-muted transition-colors hover:border-lime hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <Plus size={18} /> Add a country
              </span>
            </button>
          </li>
        )}
      </ul>

      <section aria-labelledby="timeline-title" className="card p-5 sm:p-6">
        <h2 id="timeline-title" className="text-xl font-bold">
          Breaks across {year}
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {results.map(({ pick, plan }, i) => (
            <div key={key(pick)} className="grid grid-cols-[minmax(80px,140px)_1fr] items-center gap-3">
              <span className="truncate text-sm font-semibold">
                {countryByCode.get(pick.country)?.flag} {placeName(pick.country, pick.region)}
              </span>
              <Timeline
                plan={plan && plan !== "error" ? plan : null}
                range={range}
                color={COLORS[i] ?? "bg-lime"}
              />
            </div>
          ))}
          <div className="grid grid-cols-[minmax(80px,140px)_1fr] gap-3" aria-hidden="true">
            <span />
            <div className="relative h-4 text-[10px] text-muted">
              {MONTHS_SHORT.map((m, i) => (
                <span key={m} className="absolute" style={{ left: `${(i / 12) * 100}%` }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Timeline({
  plan,
  range,
  color,
}: {
  plan: Plan | null;
  range: { start: DayNum; end: DayNum };
  color: string;
}) {
  const span = range.end - range.start + 1;
  const pct = (d: DayNum) => `${(Math.min(Math.max(d - range.start, 0), span) / span) * 100}%`;
  return (
    <div
      className="relative h-5"
      role="img"
      aria-label={plan ? `${plan.stats.breaksWithLeave} breaks` : "Loading"}
    >
      <div className="absolute inset-x-0 top-[7px] h-1.5 rounded-full bg-wkd" />
      {plan?.breaks
        .filter((b) => b.leave > 0)
        .map((b) => (
          <div
            key={b.start}
            className={cx("absolute top-0.5 h-4 min-w-2 rounded-full", color)}
            style={{ left: pct(b.start), width: `calc(${pct(b.end + 1)} - ${pct(b.start)})` }}
            title={`${b.length} days`}
          />
        ))}
    </div>
  );
}
