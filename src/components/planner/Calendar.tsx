import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  type DayNum,
  dayNum,
  daysInMonth,
  formatShort,
  MONTHS_LONG,
  WEEKDAYS_SHORT,
  weekdayMon0,
} from "~/lib/dates";
import type { Break, DayKind } from "~/lib/planner/types";
import { cx, DayIcon } from "./ui";

const KIND_LABEL: Record<DayKind, string> = {
  work: "workday",
  weekend: "weekend",
  holiday: "public holiday",
  custom: "your day off",
  leave: "suggested leave",
  locked: "leave you've locked",
  blocked: "blocked, you can't take it",
};

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
  }, [months[0]?.year, months[0]?.month]);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(months.length - 1, i));
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
  return (
    <section aria-label="Calendar" className="flex flex-col gap-3">
      <div className="flex items-center justify-between sm:hidden">
        <h2 className="font-display text-xl font-bold" aria-live="polite">
          {current ? `${MONTHS_LONG[current.month - 1]} ${current.year}` : ""}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="grid size-10 place-items-center rounded-full border border-line bg-card disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => go(index + 1)}
            disabled={index === months.length - 1}
            className="grid size-10 place-items-center rounded-full border border-line bg-card disabled:opacity-40"
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
          if (window.innerWidth < 640) setIndex(Math.round(el.scrollLeft / el.clientWidth));
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
            className={cx("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-ink" : "w-1.5 bg-line")}
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
  const headers = sundayFirst ? [WEEKDAYS_SHORT[6], ...WEEKDAYS_SHORT.slice(0, 6)] : WEEKDAYS_SHORT;

  let leave = 0;
  for (let d = first; d < first + count; d++) {
    const k = kinds.get(d);
    if (k === "leave" || k === "locked") leave++;
  }

  return (
    <div className="card h-full px-3 pb-4 pt-4 sm:px-3.5" id={`m-${year}-${month}`}>
      <h3 className="flex items-baseline justify-between px-1.5 pb-3 text-lg font-bold">
        <span>
          {MONTHS_LONG[month - 1]} <span className="text-muted">{year}</span>
        </span>
        {leave > 0 && (
          <span className="rounded-full bg-lime-soft px-2 py-0.5 font-sans text-xs font-bold text-ink">
            {leave} leave
          </span>
        )}
      </h3>
      <div className="cal" role="group" aria-label={`${MONTHS_LONG[month - 1]} ${year}`}>
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
          const label = `${formatShort(d)}, ${KIND_LABEL[k]}${names ? `: ${names.join(", ")}` : ""}`;
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

export function Legend() {
  const items: [string, React.ReactNode, string][] = [
    ["bg-lime text-lime-ink", DayIcon.check, "Leave"],
    ["bg-lime text-lime-ink", DayIcon.lock, "Locked"],
    ["bg-sun text-sun-ink", DayIcon.sun, "Public holiday"],
    ["bg-wkd", null, "Weekend"],
    ["bg-red text-white", DayIcon.x, "Blocked"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted" aria-label="Legend">
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
        Break
      </li>
    </ul>
  );
}
