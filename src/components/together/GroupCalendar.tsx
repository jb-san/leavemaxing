import { useMemo } from "react";
import { MonthCarousel, MonthGrid } from "~/components/planner/MonthCards";
import { cx, DayIcon } from "~/components/planner/ui";
import type { DayNum } from "~/lib/dates";
import {
  bandEdges,
  bandsOf,
  blockedBy,
  type MemberDayKind,
  memberDayKind,
  overflow,
} from "~/lib/together/calendar";
import type { MemberRecord } from "~/lib/together/protocol";
import { groupRange } from "~/lib/together/score";
import { SUNDAY_FIRST } from "~/lib/weekends";
import { dayLabel, t } from "./copy";

const ICON: Partial<Record<MemberDayKind, React.ReactNode>> = {
  holiday: DayIcon.sun,
  blocked: DayIcon.x,
  custom: DayIcon.star,
};

/** Dots shown under a day before the rest become "+n". */
const MAX_DOTS = 4;

type Month = { year: number; month: number };
type Span = { start: DayNum; end: DayNum };

/**
 * The group's months as the planner's month cards, shared: your own weekends, holidays and days you
 * can't do, a coloured dot for each other member who can't, and the suggested dates as break bands.
 * Tapping a day marks it as one you can't do, or clears it.
 */
export function GroupCalendar({
  months,
  members,
  meId,
  holidays,
  ranked,
  agreed,
  today,
  onToggle,
}: {
  months: Month[];
  members: Map<string, MemberRecord>;
  meId: string;
  /** Your public holidays, by day. */
  holidays: Map<DayNum, string[]>;
  ranked: Span[];
  agreed: Span[];
  today: DayNum;
  onToggle: (day: DayNum) => void;
}) {
  const me = members.get(meId);
  const sorted = useMemo(
    () => [...months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)),
    [months],
  );
  const range = useMemo(() => groupRange({ months }), [months]);
  const cant = useMemo(() => blockedBy(members), [members]);
  const bands = useMemo(() => bandsOf(ranked, agreed), [ranked, agreed]);
  if (!me) return null;
  const sundayFirst = SUNDAY_FIRST.has(me.country);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold">{t.calendar}</h2>
        <p className="text-sm text-muted">{t.calendarHint}</p>
      </div>
      <Legend
        others={[...members]
          .filter(([id]) => id !== meId)
          .map(([, m]) => m.color)
          .slice(0, 3)}
        agreed={agreed.length > 0}
      />
      <MonthCarousel months={sorted} today={today} label={t.calendar}>
        {(m) => (
          <MonthGrid
            {...m}
            today={today}
            sundayFirst={sundayFirst}
            renderDay={(d, { index, col, count }) => {
              const kind = memberDayKind(d, me, holidays);
              const others = (cant.get(d) ?? []).filter((id) => id !== meId);
              const names = holidays.get(d);
              const dots = overflow(others, MAX_DOTS);
              const band = bands.get(d);
              const edges = bandEdges(bands, d);
              return (
                <button
                  key={d}
                  type="button"
                  className="day"
                  data-day={d}
                  data-k={kind}
                  data-today={d === today ? "" : undefined}
                  data-past={d < today ? "" : undefined}
                  data-br={band === "agreed" ? "agreed" : band ? "leave" : undefined}
                  data-s={band && (col === 0 || index === 0 || edges.start) ? "" : undefined}
                  data-e={band && (col === 6 || index === count - 1 || edges.end) ? "" : undefined}
                  disabled={d < today || d < range.start || d > range.end}
                  aria-pressed={kind === "blocked"}
                  aria-label={dayLabel(
                    d,
                    kind,
                    names ?? [],
                    others.map((id) => members.get(id)?.name ?? ""),
                  )}
                  title={names?.join(", ")}
                  onClick={() => onToggle(d)}
                >
                  <span className="n">{index + 1}</span>
                  <span className="dots" aria-hidden="true">
                    {dots.shown.map((id) => (
                      <span key={id} className="dot" style={{ backgroundColor: members.get(id)?.color }} />
                    ))}
                    {dots.more > 0 && <span>+{dots.more}</span>}
                  </span>
                  <span className="mk">{ICON[kind]}</span>
                </button>
              );
            }}
          />
        )}
      </MonthCarousel>
    </div>
  );
}

function Legend({ others, agreed }: { others: string[]; agreed: boolean }) {
  const items: [string, React.ReactNode, string][] = [
    ["bg-sun text-sun-ink", DayIcon.sun, t.legendHoliday],
    ["bg-wkd", null, t.legendWeekend],
    ["bg-red text-white", DayIcon.x, t.legendYouCant],
  ];
  const dots = others.length > 0 ? others : ["var(--sky)", "var(--violet)"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted" aria-label={t.legend}>
      {items.map(([cls, icon, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cx("grid size-[18px] place-items-center rounded-full [&>svg]:size-[11px]", cls)}>
            {icon}
          </span>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="flex h-[18px] items-center gap-0.5">
          {dots.map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two members can share a colour
            <span key={`${c}-${i}`} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
        {t.legendOthersCant}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-[18px] w-7 rounded-full bg-lime-soft" />
        {t.legendBreak}
      </li>
      {agreed && (
        <li className="flex items-center gap-1.5">
          <span className="h-[18px] w-7 rounded-full bg-lime" />
          {t.worksForEveryone}
        </li>
      )}
    </ul>
  );
}
