import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "~/i18n/context";
import { type DayNum, dayNum, daysInMonth, weekdayMon0 } from "~/lib/dates";
import type { Break, DayKind } from "~/lib/planner/types";
import { cx, DayIcon } from "./ui";

const ICON: Partial<Record<DayKind, React.ReactNode>> = {
  leave: DayIcon.check,
  locked: DayIcon.lock,
  holiday: DayIcon.sun,
  blocked: DayIcon.x,
  custom: DayIcon.star,
};

export interface CalendarProps {
  months: { year: number; month: number }[];
  kinds: Map<DayNum, DayKind>;
  breaks: Break[];
  holidays: Map<DayNum, string[]>;
  today: DayNum;
  pop: Map<DayNum, number>;
  sundayFirst: boolean;
  onDay: (day: DayNum, rect: DOMRect) => void;
}

interface BreakMark {
  start: DayNum;
  end: DayNum;
  free: boolean;
}

export function Calendar({ months, kinds, breaks, holidays, today, pop, sundayFirst, onDay }: CalendarProps) {
  const i18n = useI18n();
  const p = i18n.m.planner;
  const breakOf = useMemo(() => {
    const map = new Map<DayNum, BreakMark>();
    for (const b of breaks) {
      const mark = { start: b.start, end: b.end, free: b.leave === 0 };
      for (let d = b.start; d <= b.end; d++) map.set(d, mark);
    }
    return map;
  }, [breaks]);

  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const todayIndex = months.findIndex((m) => {
    const first = dayNum(m.year, m.month, 1);
    return today >= first && today < first + daysInMonth(m.year, m.month);
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
    const target = scroller.current?.querySelector<HTMLButtonElement>(
      `[data-day="${Number(current) + delta}"]`,
    );
    if (target) {
      e.preventDefault();
      target.focus();
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const current = months[index];
  let currentLeave = 0;
  if (current) {
    const first = dayNum(current.year, current.month, 1);
    for (let d = first; d < first + daysInMonth(current.year, current.month); d++) {
      const k = kinds.get(d);
      if (k === "leave" || k === "locked") currentLeave++;
    }
  }
  return (
    <section aria-label={p.calendar} className="flex flex-col gap-3">
      <div className="flex items-center justify-between sm:hidden">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold" aria-live="polite">
          {current ? `${i18n.monthsLong[current.month - 1]} ${current.year}` : ""}
          {currentLeave > 0 && (
            <span className="rounded-full bg-lime-soft px-2 py-0.5 font-sans text-xs font-bold">
              {i18n.count(currentLeave, p.leaveDay)}
            </span>
          )}
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
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory overflow-x-auto px-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-3"
      >
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="w-full shrink-0 snap-center px-0.5 sm:w-auto sm:px-0">
            <MonthCard
              {...m}
              kinds={kinds}
              breakOf={breakOf}
              holidays={holidays}
              today={today}
              pop={pop}
              sundayFirst={sundayFirst}
              onDay={onDay}
            />
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

const MonthCard = memo(function MonthCard({
  year,
  month,
  kinds,
  breakOf,
  holidays,
  today,
  pop,
  sundayFirst,
  onDay,
}: {
  year: number;
  month: number;
  kinds: Map<DayNum, DayKind>;
  breakOf: Map<DayNum, BreakMark>;
  holidays: Map<DayNum, string[]>;
  today: DayNum;
  pop: Map<DayNum, number>;
  sundayFirst: boolean;
  onDay: (day: DayNum, rect: DOMRect) => void;
}) {
  const first = dayNum(year, month, 1);
  const count = daysInMonth(year, month);
  const col = (d: DayNum) => (sundayFirst ? (weekdayMon0(d) + 1) % 7 : weekdayMon0(d));
  const lead = col(first);
  const i18n = useI18n();
  const p = i18n.m.planner;
  const dows = i18n.weekdaysShort;
  const headers = sundayFirst ? [dows[6], ...dows.slice(0, 6)] : dows;
  const kindLabel: Record<DayKind, string> = {
    work: p.kindWork,
    weekend: p.kindWeekend,
    holiday: p.kindHoliday,
    custom: p.kindCustom,
    leave: p.kindLeave,
    locked: p.kindLocked,
    blocked: p.kindBlocked,
  };

  let leave = 0;
  for (let d = first; d < first + count; d++) {
    const k = kinds.get(d);
    if (k === "leave" || k === "locked") leave++;
  }

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
        {leave > 0 && (
          <span className="rounded-full bg-lime-soft px-2 py-0.5 font-sans text-xs font-bold text-ink">
            {i18n.count(leave, p.leaveDay)}
          </span>
        )}
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
        {Array.from({ length: count }, (_, i) => {
          const d = first + i;
          const k = kinds.get(d) ?? "work";
          const b = breakOf.get(d);
          const c = col(d);
          const names = holidays.get(d);
          const label = `${i18n.formatShort(d)}, ${kindLabel[k]}${names ? `: ${names.join(", ")}` : ""}`;
          const popIndex = pop.get(d);
          return (
            <button
              key={d}
              type="button"
              className="day"
              data-day={d}
              data-k={k}
              data-today={d === today ? "" : undefined}
              data-past={d < today ? "" : undefined}
              data-br={b ? (b.free ? "free" : "leave") : undefined}
              data-s={b && (c === 0 || d === b.start || i === 0) ? "" : undefined}
              data-e={b && (c === 6 || d === b.end || i === count - 1) ? "" : undefined}
              data-pop={popIndex !== undefined ? "" : undefined}
              style={popIndex !== undefined ? ({ "--i": popIndex } as React.CSSProperties) : undefined}
              aria-label={label}
              title={names?.join(", ")}
              onClick={(e) => onDay(d, e.currentTarget.getBoundingClientRect())}
            >
              <span className="n">{i + 1}</span>
              <span className="mk">{ICON[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

/** Lightweight stand-in rendered on the server; the real calendar mounts in the browser. */
export function CalendarPlaceholder({ months }: { months: { year: number; month: number }[] }) {
  const { monthsLong } = useI18n();
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {months.map((m, i) => (
        <div key={`${m.year}-${m.month}`} className={cx("card h-[330px] p-4", i > 0 && "hidden sm:block")}>
          <p className="px-1.5 font-display text-lg font-bold">
            {monthsLong[m.month - 1]} <span className="text-muted">{m.year}</span>
          </p>
          <div className="mt-4 h-[250px] rounded-2xl bg-[radial-gradient(circle,var(--wkd)_13px,transparent_14px)] bg-[length:14.28%_50px] opacity-70" />
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  const p = useI18n().m.planner;
  const br = p.breakDay.one;
  const breakLabel = br.charAt(0).toUpperCase() + br.slice(1);
  const items: [string, React.ReactNode, string][] = [
    ["bg-lime text-lime-ink", DayIcon.check, p.legendLeave],
    ["bg-lime text-lime-ink", DayIcon.lock, p.legendLocked],
    ["bg-sun text-sun-ink", DayIcon.sun, p.legendHoliday],
    ["bg-wkd", null, p.legendWeekend],
    ["bg-red text-white", DayIcon.x, p.legendBlocked],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted" aria-label={p.legend}>
      {items.map(([cls, icon, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cx("grid size-[18px] place-items-center rounded-full [&>svg]:size-[11px]", cls)}>
            {icon}
          </span>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-[18px] w-7 rounded-full bg-lime-soft" />
        {breakLabel}
      </li>
    </ul>
  );
}
