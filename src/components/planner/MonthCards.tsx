import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/context";
import { type DayNum, dayNum, daysInMonth, weekdayMon0 } from "~/lib/dates";
import { cx } from "./ui";

type Month = { year: number; month: number };

/**
 * Month cards as a swipeable carousel on phones (one month at a time, with a header and dots)
 * and a grid on wider screens. Arrow keys move between `[data-day]` buttons across months.
 */
export function MonthCarousel({
  months,
  today,
  label,
  badge,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
  initial,
  children,
}: {
  months: Month[];
  today: DayNum;
  /** On phones, the carousel starts on this day's month. Defaults to today's. */
  initial?: DayNum;
  /** The section's accessible name. */
  label: string;
  /** Grid columns from the `sm` breakpoint up, for a narrower container such as a sheet. */
  columns?: string;
  /** Shown next to the month name in the phone header. */
  badge?: (m: Month) => ReactNode;
  children: (m: Month) => ReactNode;
}) {
  const i18n = useI18n();
  const p = i18n.m.planner;
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const from = initial ?? today;
  const todayIndex = months.findIndex((m) => {
    const first = dayNum(m.year, m.month, 1);
    return from >= first && from < first + daysInMonth(m.year, m.month);
  });

  // On phones, start the carousel at the current month.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the visible months change
  useEffect(() => {
    const el = scroller.current;
    if (!el || window.innerWidth >= 640) return;
    const i = Math.max(0, todayIndex);
    el.scrollTo({ left: i * el.clientWidth });
    setIndex(i);
    target.current = i;
  }, [months[0]?.year, months[0]?.month]);

  // Where the carousel is heading, so quick repeated taps don't use a stale index.
  const target = useRef(0);
  const animatingUntil = useRef(0);
  const go = (delta: number) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(months.length - 1, target.current + delta));
    target.current = clamped;
    animatingUntil.current = Date.now() + 700;
    setIndex(clamped);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const current = (e.target as HTMLElement).dataset.day;
    if (!delta || current === undefined) return;
    const at = (day: number) => scroller.current?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`);
    // Disabled days (past ones, in Together) are stepped over in the same direction.
    let day = Number(current) + delta;
    let target = at(day);
    while (target?.disabled) {
      day += delta;
      target = at(day);
    }
    if (target) {
      e.preventDefault();
      target.focus();
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const current = months[index];
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <div className="flex items-center justify-between sm:hidden">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold" aria-live="polite">
          {current ? `${i18n.monthsLong[current.month - 1]} ${current.year}` : ""}
          {current && badge?.(current)}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={p.prevMonth}
            onClick={() => go(-1)}
            disabled={index === 0}
            className="grid size-10 place-items-center rounded-full border border-line bg-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.94] disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={p.nextMonth}
            onClick={() => go(1)}
            disabled={index === months.length - 1}
            className="grid size-10 place-items-center rounded-full border border-line bg-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.94] disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (window.innerWidth >= 640) return;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          // Ignore positions passed during a programmatic smooth scroll.
          if (
            Date.now() > animatingUntil.current ||
            Math.abs(el.scrollLeft - target.current * el.clientWidth) < 2
          ) {
            target.current = i;
            setIndex(i);
          }
        }}
        className={cx(
          "no-scrollbar -mx-1 flex snap-x snap-mandatory overflow-x-auto px-1 sm:mx-0 sm:grid sm:snap-none sm:gap-4 sm:overflow-visible sm:px-0",
          columns,
        )}
      >
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="w-full shrink-0 snap-center px-0.5 sm:w-auto sm:px-0">
            {children(m)}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
        {months.map((m, i) => (
          <span
            key={`${m.year}-${m.month}`}
            className={cx(
              "h-1.5 rounded-full transition-[width,background-color] duration-200 ease-[var(--ease-out)]",
              i === index ? "w-5 bg-ink" : "w-1.5 bg-line",
            )}
          />
        ))}
      </div>
    </section>
  );
}

/** Where a day sits in its month's grid, for drawing break capsules that wrap at row ends. */
export interface DayCell {
  /** 0-based index of the day in its month. */
  index: number;
  /** Column, 0-6, after the first-day-of-week setting. */
  col: number;
  /** Days in the month. */
  count: number;
}

/** One month's card: the title, weekday headers and a 7-column grid of days drawn by `renderDay`. */
export function MonthGrid({
  year,
  month,
  today,
  sundayFirst,
  badge,
  renderDay,
}: {
  year: number;
  month: number;
  today: DayNum;
  sundayFirst: boolean;
  /** Shown next to the month name in the card title. */
  badge?: ReactNode;
  renderDay: (day: DayNum, cell: DayCell) => ReactNode;
}) {
  const first = dayNum(year, month, 1);
  const count = daysInMonth(year, month);
  const col = (d: DayNum) => (sundayFirst ? (weekdayMon0(d) + 1) % 7 : weekdayMon0(d));
  const lead = col(first);
  const i18n = useI18n();
  const dows = i18n.weekdaysShort;
  const headers = sundayFirst ? [dows[6], ...dows.slice(0, 6)] : dows;

  return (
    <div
      className="card h-full px-3 pb-4 pt-4 sm:px-3.5"
      id={`m-${year}-${month}`}
      data-past={first + count <= today ? "" : undefined}
    >
      <h3 className="hidden items-baseline justify-between px-1.5 pb-3 text-lg font-bold sm:flex">
        <span>
          {i18n.monthsLong[month - 1]} <span className="text-muted">{year}</span>
        </span>
        {badge}
      </h3>
      <div className="cal" role="group" aria-label={`${i18n.monthsLong[month - 1]} ${year}`}>
        {headers.map((d) => (
          <div key={d} className="cal-dow" aria-hidden="true">
            {d}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static blank cells
          <div key={`b${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: count }, (_, i) =>
          renderDay(first + i, { index: i, col: col(first + i), count }),
        )}
      </div>
    </div>
  );
}
