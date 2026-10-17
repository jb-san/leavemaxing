import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cx, Sheet } from "~/components/planner/ui";
import { MONTHS_LONG, MONTHS_SHORT } from "~/lib/dates";
import { t } from "./copy";

export type Month = { year: number; month: number };
export interface MonthRange {
  from: Month;
  to: Month;
}

/** Months since year 0, so ranges are plain number comparisons. */
const index = (m: Month) => m.year * 12 + m.month - 1;
const monthAt = (i: number): Month => ({ year: Math.floor(i / 12), month: (i % 12) + 1 });
const short = (m: Month) => `${MONTHS_SHORT[m.month - 1]} ${m.year}`;

/** "Oct 2026 – Mar 2027", or "Oct 2026" for a single month. */
export function rangeLabel({ from, to }: MonthRange): string {
  return index(from) === index(to) ? short(from) : `${short(from)} – ${short(to)}`;
}

/** The picker's height on wider screens, so there's room to open it under the field. */
const POPOVER_HEIGHT = 400;
/** Arrow keys move by a month sideways and a row (three months) up and down. */
const STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };

/**
 * A field showing a range of months that opens a year grid: tap the first month, then the last.
 * A popover under the field on wider screens, a bottom sheet on phones.
 */
export function MonthRangePicker({
  id,
  labelId,
  value,
  onChange,
  min,
  max,
  maxMonths,
}: {
  id: string;
  /** The id of the visible field label. */
  labelId: string;
  value: MonthRange;
  onChange: (r: MonthRange) => void;
  /** First and last months that can be picked. */
  min: Month;
  max: Month;
  /** Longest range, counting both ends. */
  maxMonths: number;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  // A fresh grid each time it opens.
  const [opened, setOpened] = useState(0);

  const show = (el: HTMLElement) => {
    if (window.innerWidth >= 640) {
      // Make room below the field, so the popover never covers it.
      const room = window.innerHeight - el.getBoundingClientRect().bottom - 16;
      if (room < POPOVER_HEIGHT) window.scrollBy({ top: POPOVER_HEIGHT - room, behavior: "instant" });
    }
    setAnchor(el.getBoundingClientRect());
    setOpened((n) => n + 1);
    setOpen(true);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={(e) => show(e.currentTarget)}
        className="input flex h-[46px] items-center gap-2.5 text-left"
      >
        <CalendarDays size={18} className="shrink-0 text-muted" aria-hidden="true" />
        <span id={`${id}-value`} className="truncate">
          {rangeLabel(value)}
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} anchor={anchor} title={t.pickMonths}>
        <MonthGrid
          key={opened}
          value={value}
          min={index(min)}
          max={index(max)}
          maxMonths={maxMonths}
          onPick={(r) => {
            onChange(r);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function MonthGrid({
  value,
  min,
  max,
  maxMonths,
  onPick,
}: {
  value: MonthRange;
  min: number;
  max: number;
  maxMonths: number;
  onPick: (r: MonthRange) => void;
}) {
  const yearId = useId();
  const grid = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState(() => Math.min(max, Math.max(min, index(value.from))));
  const [year, setYear] = useState(() => Math.floor(focus / 12));
  const minYear = Math.floor(min / 12);
  const maxYear = Math.floor(max / 12);
  const today = min;

  const focusCell = (i: number) => grid.current?.querySelector<HTMLButtonElement>(`[data-i="${i}"]`)?.focus();

  // The dialog focuses its first control when it opens; start on the selected month instead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, after the dialog opens
  useEffect(() => {
    const frame = requestAnimationFrame(() => focusCell(focus));
    return () => cancelAnimationFrame(frame);
  }, []);

  // While picking the last month, the range follows the pointer or focus.
  let start = index(value.from);
  let end = index(value.to);
  if (pending !== null) {
    start = pending;
    end = hover !== null && hover >= pending && hover < pending + maxMonths ? hover : pending;
  }
  const disabled = (i: number) => i < min || i > max || (pending !== null && i >= pending + maxMonths);

  const pick = (i: number) => {
    if (disabled(i)) return;
    if (pending === null || i < pending) {
      setPending(i);
      setHover(i);
    } else onPick({ from: monthAt(pending), to: monthAt(i) });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = STEP[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = focus + step;
    if (next < min || next > max) return;
    // Render the move (maybe into another year) and focus it now, so a quick Enter lands on it.
    flushSync(() => {
      setFocus(next);
      setYear(Math.floor(next / 12));
      setHover(next);
    });
    focusCell(next);
  };

  const first = year * 12;
  const cells = Array.from({ length: 12 }, (_, k) => first + k);
  // One tab stop in the grid: the focused month if it's in this year, else the first open one.
  const tabStop = cells.includes(focus) ? focus : (cells.find((i) => !disabled(i)) ?? first);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t.prevYear}
          disabled={year <= minYear}
          onClick={() => setYear((y) => y - 1)}
          className="grid size-10 place-items-center rounded-full border border-line bg-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.94] disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 id={yearId} aria-live="polite" className="font-display text-xl font-bold">
          {year}
        </h3>
        <button
          type="button"
          aria-label={t.nextYear}
          disabled={year >= maxYear}
          onClick={() => setYear((y) => y + 1)}
          className="grid size-10 place-items-center rounded-full border border-line bg-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.94] disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        ref={grid}
        role="group"
        aria-labelledby={yearId}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
        className="grid grid-cols-3 gap-y-1.5"
      >
        {cells.map((i, k) => {
          const m = monthAt(i);
          const col = k % 3;
          const inRange = i >= start && i <= end;
          const edge = i === start || i === end;
          const off = disabled(i);
          return (
            <div key={i} className="relative flex">
              {inRange && start !== end && (
                // The band joining the months, like a break on the planner calendar.
                <span
                  aria-hidden="true"
                  className={cx(
                    "absolute inset-y-0 bg-lime-soft",
                    i === start ? "left-1/2 right-0" : i === end ? "left-0 right-1/2" : "inset-x-0",
                    col === 0 && i !== start && "rounded-l-full",
                    col === 2 && i !== end && "rounded-r-full",
                  )}
                />
              )}
              <button
                type="button"
                data-i={i}
                tabIndex={i === tabStop ? 0 : -1}
                aria-pressed={inRange}
                aria-disabled={off || undefined}
                aria-label={`${MONTHS_LONG[m.month - 1]} ${m.year}`}
                onClick={() => pick(i)}
                onFocus={() => {
                  setFocus(i);
                  setHover(i);
                }}
                onMouseEnter={() => setHover(i)}
                className={cx(
                  "relative h-11 w-full rounded-full text-sm font-bold transition-[transform,background-color] duration-150 ease-[var(--ease-out)]",
                  edge && "bg-lime text-lime-ink",
                  !inRange && !off && "hover:bg-card-2",
                  i === today && !edge && "ring-1 ring-line ring-inset",
                  off ? "cursor-default opacity-40" : "active:scale-[0.96]",
                )}
              >
                {MONTHS_SHORT[m.month - 1]}
              </button>
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className="text-sm text-muted">
        {pending === null ? t.pickFirst : t.pickLast}
      </p>
    </div>
  );
}
