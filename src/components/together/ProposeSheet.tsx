import { useEffect, useMemo, useState } from "react";
import { MonthCarousel, MonthGrid } from "~/components/planner/MonthCards";
import { Sheet } from "~/components/planner/ui";
import { type DayNum, formatRange } from "~/lib/dates";
import { bandsOf } from "~/lib/together/calendar";
import { inPick, MAX_PROPOSAL, openPick, type Pick, pickDay, pickedKey } from "~/lib/together/propose";
import type { MemberRecord, WindowKey } from "~/lib/together/protocol";
import { costFor, type ScoreMember } from "~/lib/together/score";
import { t } from "./copy";
import { SharedDay, useShared } from "./GroupCalendar";

type Month = { year: number; month: number };

/**
 * Pick a range of dates on the group's calendar and propose it to the group. Tap the first day,
 * then the last; the summary says what the range costs you.
 */
export function ProposeSheet({
  open,
  onClose,
  months,
  members,
  me,
  holidays,
  today,
  start,
  onPropose,
}: {
  open: boolean;
  onClose: () => void;
  months: Month[];
  members: Map<string, MemberRecord>;
  /** You, with your public holidays, to work out what the range costs you. */
  me: ScoreMember;
  /** Your public holidays, by day. */
  holidays: Map<DayNum, string[]>;
  today: DayNum;
  /** A day to open with as the start, so the next tap picks the end. */
  start?: DayNum;
  onPropose: (key: WindowKey) => void;
}) {
  const shared = useShared(months, members, me.id, holidays, today);
  const [pick, setPick] = useState<Pick | null>(null);
  // Bumped on each open, so the carousel mounts once the sheet is showing and can scroll to this month.
  const [opened, setOpened] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the start day only applies as the sheet opens
  useEffect(() => {
    if (!open) return;
    setPick(openPick(start));
    setOpened((n) => n + 1);
  }, [open]);

  const bands = useMemo(
    () => bandsOf(pick ? [{ start: pick.start, end: pick.end ?? pick.start }] : [], []),
    [pick],
  );
  const key = pickedKey(pick);

  return (
    <Sheet open={open} onClose={onClose} title={t.proposeDates} wide>
      {shared && opened > 0 && (
        <MonthCarousel
          key={opened}
          months={shared.sorted}
          today={today}
          label={t.proposeMonths}
          columns="sm:grid-cols-2"
        >
          {(m) => (
            <MonthGrid
              {...m}
              today={today}
              sundayFirst={shared.sundayFirst}
              renderDay={(d, cell) => (
                <SharedDay
                  key={d}
                  shared={shared}
                  day={d}
                  cell={cell}
                  bands={bands}
                  pressed={() => inPick(pick, d)}
                  leave={inPick(pick, d)}
                  onClick={() => setPick(pickDay(pick, d))}
                />
              )}
            />
          )}
        </MonthCarousel>
      )}
      <div className="sticky bottom-0 z-10 -mx-5 mb-[calc(-1*max(20px,env(safe-area-inset-bottom)))] flex flex-col gap-3 border-t border-line bg-card px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="flex min-h-[46px] min-w-0 flex-col justify-center">
          {pick?.end != null ? (
            <>
              <p className="font-display text-xl font-extrabold leading-tight">
                {formatRange(pick.start, pick.end)}
              </p>
              <p className="text-sm text-muted">
                <span>{t.proposeCost(pick.end - pick.start + 1, costFor(me, pick.start, pick.end))}</span>
                {pick.clamped && <span className="block">{t.proposeClamped(MAX_PROPOSAL, pick.end)}</span>}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted">{pick ? t.proposeLast : t.proposeFirst}</p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0 px-6 py-3 text-base disabled:opacity-50"
          disabled={!key}
          onClick={() => {
            if (key) onPropose(key);
          }}
        >
          {t.proposeDates}
        </button>
      </div>
    </Sheet>
  );
}
