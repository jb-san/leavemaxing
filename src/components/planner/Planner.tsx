import { SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { countries, countryByCode, placeName } from "~/data";
import {
  type DayNum,
  dayNum,
  daysInMonth,
  leaveYearLabel,
  leaveYearMonths,
  leaveYearRange,
  localToday,
} from "~/lib/dates";
import { detectCountry } from "~/lib/detect";
import { type HolidayFile, holidayMap, loadHolidayFile } from "~/lib/holidays";
import { runPlan } from "~/lib/planClient";
import { toPlanInput, yearsNeeded } from "~/lib/planInput";
import { classifyDays, plan as planSync } from "~/lib/planner/plan";
import { type Plan, type PlanInput, STYLES } from "~/lib/planner/types";
import { defaultSettings, fromQuery, planPath, type Settings, shareUrl, toQuery } from "~/lib/settings";
import { addPlan, loadLast, recordBest, saveLast } from "~/lib/storage";
import { BreaksList } from "./BreaksList";
import { Calendar, CalendarPlaceholder, Legend } from "./Calendar";
import { plural } from "./copy";
import { DayMenu } from "./DayMenu";
import { ExportDialog, SaveDialog, ShareDialog } from "./Dialogs";
import { HeroCard } from "./HeroCard";
import { SettingsPanel } from "./SettingsPanel";
import { type Action, carryPreferences, type DayAction, reducer } from "./state";
import { Sheet, Toasts, useToasts } from "./ui";

/** Countries where calendars usually start on Sunday. */
const SUNDAY_FIRST = new Set([
  "US",
  "CA",
  "MX",
  "BR",
  "JP",
  "PH",
  "IL",
  "KR",
  "TW",
  "HK",
  "ZA",
  "AR",
  "CO",
  "PE",
]);

export interface PlannerProps {
  initial: Settings;
  files: HolidayFile[];
  /** The day the page was built, so the first client render matches the server. */
  today: DayNum;
  mode: "home" | "page";
  years: number[];
}

type Dialog = "settings" | "share" | "export" | "save" | null;

const fileKey = (country: string, year: number) => `${country}/${year}`;

export default function Planner(props: PlannerProps) {
  const { years, mode } = props;
  const [settings, rawDispatch] = useReducer(reducer, props.initial);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userChanged = useRef(false);
  const [files, setFiles] = useState(
    () => new Map<string, HolidayFile | undefined>(props.files.map((f) => [fileKey(f.country, f.year), f])),
  );
  const [today, setToday] = useState(props.today);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [menu, setMenu] = useState<{ day: DayNum; rect: DOMRect } | null>(null);
  const { toasts, push } = useToasts();
  const pendingDelta = useRef<number | null>(null);

  const dispatch = useCallback(
    (a: Action) => {
      const cur = settingsRef.current;
      const next = reducer(cur, a);
      if (next === cur) return;
      userChanged.current = true;
      if (mode === "page" && (next.country !== cur.country || next.year !== cur.year)) {
        // Each country-year has its own page; go there so the whole page matches.
        saveLast(next);
        const q = toQuery(next).toString();
        window.location.assign(`${planPath(next.country, next.year)}${q ? `?${q}` : ""}`);
        return;
      }
      rawDispatch(a);
    },
    [mode],
  );

  // First visit: apply the link's settings, the last plan, or a guess at the country.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount
  useEffect(() => {
    setToday(localToday());
    const q = new URLSearchParams(window.location.search);
    const base = props.initial;
    let next = base;
    if ([...q.keys()].some((k) => k !== "utm_source")) {
      const r = fromQuery(q, base, countryByCode.get(base.country)?.regions ?? {});
      next = r.settings;
      if (r.invalid.length)
        push("Some settings in this link weren't valid, so defaults are used instead.", "warn");
    } else {
      const last = loadLast();
      const lastOk = last && countryByCode.has(last.country);
      if (mode === "home") {
        if (lastOk && years.includes(last.year)) next = last;
        else if (lastOk) next = carryPreferences(defaultSettings(last.country, base.year), last);
        else {
          const guess = detectCountry(new Set(countries.map((c) => c.code)));
          if (guess && guess !== base.country) next = defaultSettings(guess, base.year);
        }
      } else if (lastOk) next = carryPreferences(base, last);
    }
    if (next !== base) rawDispatch({ type: "replace", settings: next });
    setReady(true);
  }, []);

  // Load holiday data for the years this plan touches.
  const neededYears = yearsNeeded(settings);
  const missing = neededYears.filter((y) => !files.has(fileKey(settings.country, y)));
  const missingKey = missing.map((y) => fileKey(settings.country, y)).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by the missing files
  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    setLoadError(null);
    Promise.all(
      missing.map((y) =>
        loadHolidayFile(settings.country, y).then((f) => [fileKey(settings.country, y), f] as const),
      ),
    )
      .then((entries) => {
        if (!live) return;
        setFiles((prev) => {
          const m = new Map(prev);
          for (const [k, f] of entries) m.set(k, f);
          return m;
        });
      })
      .catch(() => live && setLoadError("Couldn't load the holidays. Check your connection and try again."));
    return () => {
      live = false;
    };
  }, [missingKey, retry]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: derived from settings + files
  const input = useMemo<PlanInput | null>(() => {
    if (missing.length) return null;
    return toPlanInput(
      settings,
      neededYears.map((y) => files.get(fileKey(settings.country, y))),
      today,
    );
  }, [settings, files, today, missing.length]);

  const [result, setResult] = useState<{ input: PlanInput; plan: Plan }>(() => {
    const i = toPlanInput(
      props.initial,
      yearsNeeded(props.initial).map((y) =>
        props.files.find((f) => f.year === y && f.country === props.initial.country),
      ),
      props.today,
    );
    return { input: i, plan: planSync(i) };
  });

  useEffect(() => {
    if (!input) return;
    let live = true;
    runPlan(input).then((p) => {
      if (live) setResult({ input, plan: p });
    });
    return () => {
      live = false;
    };
  }, [input]);

  // Pop the days that changed, celebrate, and report what a day edit did.
  const prevLeave = useRef<Set<DayNum> | null>(null);
  const prevDaysOff = useRef(result.plan.stats.daysOff);
  const [pop, setPop] = useState<Map<DayNum, number>>(() => new Map());
  // biome-ignore lint/correctness/useExhaustiveDependencies: reacts to new results only
  useEffect(() => {
    const now = new Set([...result.plan.suggested, ...result.plan.locked]);
    const prev = prevLeave.current;
    prevLeave.current = now;
    if (prev) {
      const changed = [...now].filter((d) => !prev.has(d)).sort((a, b) => a - b);
      setPop(new Map(changed.map((d, i) => [d, i])));
    }
    const delta = result.plan.stats.daysOff - prevDaysOff.current;
    prevDaysOff.current = result.plan.stats.daysOff;
    if (pendingDelta.current !== null) {
      pendingDelta.current = null;
      if (delta > 0) push(`+${plural(delta, "day")} off`, "good");
      else if (delta < 0) push(`${delta} ${delta === -1 ? "day" : "days"} off`, "info");
      else push("Same days off, different shape", "info");
    }
    if (ready && userChanged.current && result.input.budget > 0) {
      const isNewBest = recordBest(`${settings.country}/${settings.year}`, result.plan.stats.multiplier);
      if (isNewBest && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        import("canvas-confetti").then(({ default: confetti }) =>
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.3 },
            colors: ["#8BD12F", "#FFC83D", "#1A2030", "#7C6CF0"],
          }),
        );
        push(`New best: ${result.plan.stats.multiplier.toFixed(1)}×`, "good");
      }
    }
  }, [result]);

  // Remember the plan, and keep the address bar shareable on country pages.
  useEffect(() => {
    if (!ready) return;
    saveLast(settings);
    if (mode !== "page" || (!userChanged.current && !window.location.search)) return;
    const q = toQuery(settings).toString();
    const url = `${planPath(settings.country, settings.year)}${q ? `?${q}` : ""}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, "", url);
  }, [settings, ready, mode]);

  const shown = result.input;
  const range = leaveYearRange(shown.year, shown.yearStart);
  const months = useMemo(() => leaveYearMonths(shown.year, shown.yearStart), [shown.year, shown.yearStart]);
  const firstMonth = months[0] as { year: number; month: number };
  const lastMonth = months[months.length - 1] as { year: number; month: number };
  const kinds = useMemo(
    () =>
      classifyDays(
        shown,
        result.plan,
        dayNum(firstMonth.year, firstMonth.month, 1),
        dayNum(lastMonth.year, lastMonth.month, daysInMonth(lastMonth.year, lastMonth.month)),
      ),
    [shown, result.plan, firstMonth, lastMonth],
  );
  const holidays = useMemo(() => holidayMap(shown.holidays), [shown.holidays]);

  const country = countryByCode.get(settings.country);
  const place = placeName(settings.country, settings.region);
  const yearLabel = leaveYearLabel(settings.year, settings.yearStart);
  const fileName = `leavemaxxing-${settings.country.toLowerCase()}-${settings.year}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://leavemaxxing.com";
  const url = shareUrl(settings, origin);
  // biome-ignore lint/correctness/useExhaustiveDependencies: range is derived from the plan input
  const card = useMemo(
    () => ({ plan: result.plan, place, flag: country?.flag ?? "", yearLabel, range }),
    [result.plan, place, country?.flag, yearLabel],
  );

  const onDay = useCallback((day: DayNum, rect: DOMRect) => setMenu({ day, rect }), []);
  const onDayAction = (day: DayNum, action: DayAction) => {
    pendingDelta.current = result.plan.stats.daysOff;
    dispatch({ type: "day", day, action });
  };
  const menuKind = menu ? (kinds.get(menu.day) ?? null) : null;
  const editable = menu ? menu.day >= range.start && menu.day <= range.end && menu.day >= shown.today : false;
  const loading = input === null || input !== result.input;
  const styleLabel = STYLES.find((s) => s.id === settings.style)?.label;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        aria-label="Plan settings"
        className="card hidden p-5 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-32px)] lg:overflow-y-auto"
      >
        <SettingsPanel settings={settings} dispatch={dispatch} years={years} idPrefix="d" />
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        <HeroCard
          plan={result.plan}
          budget={settings.budget}
          place={place}
          yearLabel={yearLabel}
          range={range}
          today={today}
          loading={loading && !loadError}
          onShare={() => setDialog("share")}
          onExport={() => setDialog("export")}
          onSave={() => setDialog("save")}
        />

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {[
            `${country?.flag ?? ""} ${place}`,
            yearLabel,
            plural(settings.budget, "day"),
            styleLabel ?? "",
          ].map((label) => (
            <button
              key={label}
              type="button"
              className="chip shrink-0 bg-card"
              onClick={() => setDialog("settings")}
            >
              {label}
            </button>
          ))}
        </div>

        {loadError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-3xl bg-red-soft px-5 py-4 text-sm font-semibold"
          >
            {loadError}
            <button type="button" className="btn btn-soft" onClick={() => setRetry((r) => r + 1)}>
              Try again
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Legend />
          <span className="hidden text-xs text-muted sm:inline">Tap a day to change it</span>
        </div>

        {ready ? (
          <Calendar
            months={months}
            kinds={kinds}
            breaks={result.plan.breaks}
            holidays={holidays}
            today={shown.today}
            pop={pop}
            sundayFirst={SUNDAY_FIRST.has(settings.country)}
            onDay={onDay}
          />
        ) : (
          <CalendarPlaceholder months={months} />
        )}

        <BreaksList plan={result.plan} today={today} />
      </div>

      <button
        type="button"
        onClick={() => setDialog("settings")}
        aria-label="Plan settings"
        className="fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-[max(20px,env(safe-area-inset-right))] z-30 grid size-16 place-items-center rounded-full bg-lime text-lime-ink shadow-[0_12px_28px_-8px_rgb(139_209_47/0.8)] transition-transform active:scale-90 lg:hidden"
      >
        <SlidersHorizontal size={26} />
      </button>

      <Sheet open={dialog === "settings"} onClose={() => setDialog(null)} title="Plan settings">
        <SettingsPanel settings={settings} dispatch={dispatch} years={years} idPrefix="m" />
        <button type="button" className="btn btn-primary" onClick={() => setDialog(null)}>
          Show my plan
        </button>
      </Sheet>
      <ShareDialog
        open={dialog === "share"}
        onClose={() => setDialog(null)}
        url={url}
        card={card}
        fileName={fileName}
      />
      <ExportDialog
        open={dialog === "export"}
        onClose={() => setDialog(null)}
        plan={result.plan}
        calendarName={`leavemaxxing ${yearLabel}`}
        fileName={fileName}
      />
      <SaveDialog
        open={dialog === "save"}
        onClose={() => setDialog(null)}
        defaultName={`${place} ${yearLabel}`}
        onSave={(name) => {
          const saved = addPlan({
            name,
            settings,
            summary: {
              place,
              yearLabel,
              leaveUsed: result.plan.stats.leaveUsed,
              daysOff: result.plan.stats.daysOff,
              multiplier: result.plan.stats.multiplier,
            },
          });
          push(
            saved
              ? "Saved. Find it under My plans."
              : "Couldn't save: your browser's storage is off or full.",
            saved ? "good" : "warn",
          );
        }}
      />
      <DayMenu
        day={menu?.day ?? null}
        kind={menuKind}
        holidays={menu ? (holidays.get(menu.day) ?? []) : []}
        anchor={menu?.rect ?? null}
        editable={editable}
        onAction={onDayAction}
        onClose={() => setMenu(null)}
      />
      <Toasts toasts={toasts} />
    </div>
  );
}
