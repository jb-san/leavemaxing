import { Bookmark, CalendarPlus, Share2, TriangleAlert } from "lucide-react";
import { Mascot, moodFor } from "~/components/Mascot";
import { type DayNum, formatRange, MONTHS_SHORT, parts } from "~/lib/dates";
import type { Plan } from "~/lib/planner/types";
import { countdown, plural, quip } from "./copy";
import { cx } from "./ui";

export function HeroCard({
  plan,
  budget,
  place,
  yearLabel,
  range,
  today,
  loading,
  onShare,
  onExport,
  onSave,
}: {
  plan: Plan;
  budget: number;
  place: string;
  yearLabel: string;
  range: { start: DayNum; end: DayNum };
  today: DayNum;
  loading: boolean;
  onShare: () => void;
  onExport: () => void;
  onSave: () => void;
}) {
  const { stats } = plan;
  const mood = moodFor(stats.multiplier, stats.leaveUsed);
  const next = plan.breaks.find((b) => b.leave > 0 && b.end >= today);
  const nextLabel = next
    ? next.start <= today
      ? "happening now"
      : countdown(next.start - today)
    : "none left";

  return (
    <section
      aria-label="Your plan"
      className={cx(
        "relative overflow-hidden rounded-[var(--radius-hero)] bg-hero p-5 text-hero-ink sm:p-7",
        loading && "opacity-90",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-[radial-gradient(circle,rgb(139_209_47/0.28),transparent_65%)]"
      />
      <div className="relative flex flex-col gap-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2">
          <p className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 self-center text-sm font-semibold text-hero-muted">
            <Mascot size={26} mood={mood} title="" blink />
            <span className="truncate">
              Your {yearLabel} in {place}
            </span>
            {loading && (
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-lime">
                <span className="sr-only">Updating</span>
              </span>
            )}
          </p>
          <div
            className="col-start-2 row-start-1 grid size-16 place-items-center rounded-full bg-lime text-lime-ink shadow-[0_0_0_6px_rgb(139_209_47/0.15)] sm:row-span-3 sm:size-24 sm:shadow-[0_0_0_8px_rgb(139_209_47/0.15)]"
            title="Days off per leave day"
          >
            <span className="font-display text-xl font-extrabold tracking-[-0.03em] sm:text-[30px]">
              {stats.multiplier ? `${stats.multiplier.toFixed(1)}×` : "–"}
            </span>
          </div>
          <p
            className="col-span-2 font-display text-[clamp(28px,4.6vw,48px)] font-extrabold leading-[1.04] tracking-[-0.035em] sm:col-span-1"
            aria-live="polite"
          >
            {stats.leaveUsed > 0 ? (
              <>
                <span className="whitespace-nowrap">{plural(stats.leaveUsed, "day")} of leave →</span>
                <br />
                <span className="text-lime">{stats.daysOff} days off</span>
              </>
            ) : (
              <>
                Ready when you are.
                <br />
                <span className="text-lime">Add leave days.</span>
              </>
            )}
          </p>
          <p className="col-span-2 max-w-[52ch] text-sm text-hero-muted sm:col-span-1">
            {quip(stats.multiplier, stats.leaveUsed, stats.daysOff)}
          </p>
        </div>

        <BudgetDots used={stats.leaveUsed} budget={budget} />
        <YearStrip plan={plan} range={range} />

        <dl className="flex flex-wrap gap-2.5">
          <Stat
            value={String(stats.breaksWithLeave)}
            label={stats.breaksWithLeave === 1 ? "break" : "breaks"}
          />
          <Stat value={stats.longest ? `${stats.longest}d` : "–"} label="longest break" />
          <Stat
            value={next ? formatRange(next.start, next.end) : "–"}
            label={next ? `next break, ${nextLabel}` : "next break"}
          />
        </dl>

        {plan.warnings.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-2xl bg-sun/15 p-3 text-sm text-sun">
            {plan.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-primary" onClick={onShare}>
            <Share2 size={16} /> Share
          </button>
          <button type="button" className="btn btn-ghost" onClick={onExport}>
            <CalendarPlus size={16} /> Add to calendar
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSave}>
            <Bookmark size={16} /> Save plan
          </button>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[104px] rounded-[18px] border border-hero-line bg-white/5 px-3.5 py-2.5">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
      <dd className="text-xs text-hero-muted" aria-hidden="true">
        {label}
      </dd>
    </div>
  );
}

function BudgetDots({ used, budget }: { used: number; budget: number }) {
  const label = `${used} of ${budget} leave days used`;
  if (budget > 40 || budget === 0) {
    return (
      <div className="flex items-center gap-3" role="img" aria-label={label}>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-hero-line">
          <div
            className="h-full rounded-full bg-lime"
            style={{ width: `${budget ? (used / budget) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-hero-muted">
          {used} / {budget} used
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="img" aria-label={label}>
      {Array.from({ length: budget }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one dot per day
          key={i}
          className={cx("size-2.5 rounded-full transition-colors", i < used ? "bg-lime" : "bg-hero-line")}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-hero-muted">
        {used} / {budget} used
      </span>
    </div>
  );
}

export function YearStrip({
  plan,
  range,
  compact = false,
}: {
  plan: Plan;
  range: { start: DayNum; end: DayNum };
  compact?: boolean;
}) {
  const span = range.end - range.start + 1;
  const pct = (d: DayNum) => `${(Math.min(Math.max(d - range.start, 0), span) / span) * 100}%`;
  const ticks: { day: DayNum; label: string }[] = [];
  const startParts = parts(range.start);
  for (let i = 0; i < 12; i++) {
    const m0 = startParts.month - 1 + i;
    const y = startParts.year + Math.floor(m0 / 12);
    const m = (m0 % 12) + 1;
    ticks.push({ day: Date.UTC(y, m - 1, 1) / 86_400_000, label: MONTHS_SHORT[m - 1] ?? "" });
  }
  return (
    <div className={cx("relative", compact ? "h-6" : "h-10")} aria-hidden="true">
      <div className="absolute inset-x-0 top-[14px] h-1.5 rounded-full bg-hero-line" />
      {plan.breaks
        .filter((b) => b.end >= range.start && b.start <= range.end)
        .map((b) => (
          <div
            key={b.start}
            className={cx(
              "absolute top-[9px] h-4 min-w-2.5 rounded-full",
              b.leave > 0 ? "bg-lime" : "bg-sun/70",
            )}
            style={{ left: pct(b.start), width: `calc(${pct(b.end + 1)} - ${pct(b.start)})` }}
          />
        ))}
      {!compact &&
        ticks.map((t) => (
          <span
            key={t.day}
            className="absolute top-7 text-[10px] text-hero-muted"
            style={{ left: pct(t.day) }}
          >
            {t.label}
          </span>
        ))}
    </div>
  );
}
