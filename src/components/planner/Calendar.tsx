import { memo, useMemo } from "react";
import { useI18n } from "~/i18n/context";
import { type DayNum, dayNum, daysInMonth } from "~/lib/dates";
import type { Break, DayKind } from "~/lib/planner/types";
import { MonthCarousel, MonthGrid } from "./MonthCards";
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

  const leaveIn = (m: { year: number; month: number }) => {
    const first = dayNum(m.year, m.month, 1);
    let leave = 0;
    for (let d = first; d < first + daysInMonth(m.year, m.month); d++) {
      const k = kinds.get(d);
      if (k === "leave" || k === "locked") leave++;
    }
    return leave;
  };

  return (
    <MonthCarousel
      months={months}
      today={today}
      label={p.calendar}
      badge={(m) => {
        const leave = leaveIn(m);
        return (
          leave > 0 && (
            <span className="rounded-full bg-lime-soft px-2 py-0.5 font-sans text-xs font-bold">
              {i18n.count(leave, p.leaveDay)}
            </span>
          )
        );
      }}
    >
      {(m) => (
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
      )}
    </MonthCarousel>
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
  const i18n = useI18n();
  const p = i18n.m.planner;
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
    <MonthGrid
      year={year}
      month={month}
      today={today}
      sundayFirst={sundayFirst}
      badge={
        leave > 0 && (
          <span className="rounded-full bg-lime-soft px-2 py-0.5 font-sans text-xs font-bold text-ink">
            {i18n.count(leave, p.leaveDay)}
          </span>
        )
      }
      renderDay={(d, { index: i, col: c }) => {
        const k = kinds.get(d) ?? "work";
        const b = breakOf.get(d);
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
      }}
    />
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
