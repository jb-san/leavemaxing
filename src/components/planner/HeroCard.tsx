import { Bookmark, CalendarPlus, Share2, TriangleAlert } from "lucide-react";
import { Mascot, moodFor } from "~/components/Mascot";
import { type DayNum, formatRange, MONTHS_SHORT, parts } from "~/lib/dates";
import type { Plan } from "~/lib/planner/types";
import { countdown, plural, quip } from "./copy";
import { cx, Tick } from "./ui";

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
        "rounded-[var(--radius-hero)] bg-hero p-5 text-hero-ink transition-opacity sm:p-7",
        loading && "opacity-90",
      )}
    >
      <div className="flex flex-col gap-5">
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-hero-muted">
          <span key={mood} className="swap-pop">
            <Mascot size={26} mood={mood} title="" blink />
          </span>
          <span className="truncate">
            Your {yearLabel} in {place}
          </span>
          {loading && (
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-lime">
              <span className="sr-only">Updating</span>
            </span>
          )}
        </p>
        <div className="flex flex-col gap-2">
          <p
            className="font-display text-[clamp(40px,6.4vw,76px)] font-extrabold leading-[0.92] [font-stretch:72%]"
            aria-live="polite"
          >
            {stats.leaveUsed > 0 ? (
              <>
                <span className="text-lime">
                  <Tick>{stats.leaveUsed}</Tick> leave {stats.leaveUsed === 1 ? "day" : "days"}
                </span>{" "}
                <span className="font-semibold text-hero-muted">become</span> <br />
                <Tick>{stats.daysOff}</Tick> days off
              </>
            ) : (
              <>No leave planned yet</>
            )}
          </p>
          <p className="max-w-[52ch] text-[15px] text-hero-muted">
            {quip(stats.multiplier, stats.leaveUsed)}
          </p>
        </div>

        <BudgetDots used={stats.leaveUsed} budget={budget} />
        <YearStrip plan={plan} range={range} today={today} />

        <dl className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-8 gap-y-1 border-t border-hero-line pt-4">
          <Stat label="Breaks" value={String(stats.breaksWithLeave)} />
          <Stat label="Longest" value={stats.longest ? plural(stats.longest, "day") : "None"} />
          <Stat
            label={next ? `Next, ${nextLabel}` : "Next break"}
            value={next ? formatRange(next.start, next.end) : "None left"}
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
    <div className="flex min-w-0 flex-col">
      <dt className="truncate text-[13px] text-hero-muted">{label}</dt>
      <dd className="truncate font-display text-2xl font-extrabold">{value}</dd>
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
          {used} of {budget} used
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
      <span className="ml-1 text-xs font-semibold text-hero-muted">
        {used} of {budget} used
      </span>
    </div>
  );
}

export function YearStrip({
  plan,
  range,
  today,
  compact = false,
}: {
  plan: Plan;
  range: { start: DayNum; end: DayNum };
  /** Days before this are already behind you and drawn faded. */
  today?: DayNum;
  compact?: boolean;
}) {
  const span = range.end - range.start + 1;
  // Only mark the past while the year is under way.
  const past = today !== undefined && today > range.start && today <= range.end;
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
      {past && (
        <div
          className="absolute left-0 top-[14px] h-1.5 rounded-full bg-hero-muted/45"
          style={{ width: pct(today as DayNum) }}
        />
      )}
      {plan.breaks
        .filter((b) => b.end >= range.start && b.start <= range.end)
        .map((b) => (
          <div
            key={b.start}
            className={cx(
              "absolute top-[9px] h-4 min-w-2.5 rounded-full",
              b.leave > 0 ? "bg-lime" : "bg-sun/70",
              past && b.end < (today as DayNum) && "opacity-35",
            )}
            style={{ left: pct(b.start), width: `calc(${pct(b.end + 1)} - ${pct(b.start)})` }}
          />
        ))}
      {past && (
        <div
          className="absolute top-[7px] h-5 w-0.5 -translate-x-1/2 rounded-full bg-hero-ink"
          style={{ left: pct(today as DayNum) }}
        />
      )}
      {!compact &&
        ticks.map((t) => (
          <span
            key={t.day}
            className={cx(
              "absolute top-7 text-[10px] text-hero-muted",
              past && t.day + 27 < (today as DayNum) && "opacity-50",
            )}
            style={{ left: pct(t.day) }}
          >
            {t.label}
          </span>
        ))}
    </div>
  );
}
