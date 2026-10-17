import { CalendarPlus } from "lucide-react";
import { useI18n } from "~/i18n/context";
import type { DayNum } from "~/lib/dates";
import { googleCalendarUrl } from "~/lib/ics";
import type { Plan } from "~/lib/planner/types";
import { cx } from "./ui";

export function BreaksList({ plan, today }: { plan: Plan; today: DayNum }) {
  const i18n = useI18n();
  const p = i18n.m.planner;
  const leaveDays = [...plan.suggested, ...plan.locked];
  if (plan.breaks.length === 0) return null;
  const when = (days: number) => {
    if (days <= 0) return p.now;
    if (days === 1) return p.tomorrow;
    if (days < 14) return i18n.text(p.inDays, { n: days });
    if (days < 60) return i18n.text(p.inWeeks, { n: Math.round(days / 7) });
    return i18n.text(p.inMonths, { n: Math.round(days / 30.4) });
  };
  return (
    <section aria-labelledby="breaks-title" className="card p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="breaks-title" className="text-xl font-bold">
          {p.breaksTitle}
        </h2>
        <span className="text-sm text-muted">
          {i18n.text(p.breaksWith, {
            n: plan.stats.breaksWithLeave,
            word: i18n.plural(plan.stats.breaksWithLeave, p.breakDay),
          })}
        </span>
      </div>
      <ol className="flex flex-col divide-y divide-line">
        {plan.breaks.map((b) => {
          const past = b.end < today;
          const holidays = [...new Set(b.holidays.map((h) => h.name))];
          const range = i18n.formatRange(b.start, b.end);
          return (
            <li key={b.start} className={cx("flex items-center gap-3 py-3", past && "opacity-50")}>
              <span
                className={cx(
                  "flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none",
                  b.leave > 0 ? "bg-lime text-lime-ink" : "bg-sun-soft text-ink",
                )}
              >
                <span className="font-display text-2xl font-extrabold">{b.length}</span>
                <span className="text-[11px] font-semibold">{i18n.plural(b.length, p.day)}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {range}
                  {!past && b.start > today && (
                    <span className="ml-2 text-xs font-semibold text-muted">{when(b.start - today)}</span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">
                  {b.leave > 0 ? i18n.count(b.leave, p.leaveDay) : p.noLeave}
                  {holidays.length > 0 && `, ${i18n.text(p.around, { names: holidays.join(", ") })}`}
                </p>
              </div>
              {b.leave > 0 && (
                <>
                  <span className="hidden rounded-full bg-card-2 px-2.5 py-1 text-xs font-bold tabular-nums sm:inline">
                    {(b.length / b.leave).toFixed(1)}×
                  </span>
                  <a
                    href={googleCalendarUrl(b, leaveDays)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={i18n.text(p.addGcal, { range })}
                    title={p.addGcalTitle}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-card-2 hover:text-ink"
                  >
                    <CalendarPlus size={17} />
                  </a>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
