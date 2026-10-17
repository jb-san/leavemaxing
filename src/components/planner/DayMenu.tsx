import { Ban, Lock, Sparkles, Undo2 } from "lucide-react";
import { useRef } from "react";
import { useI18n } from "~/i18n/context";
import { type DayNum, parts } from "~/lib/dates";
import type { DayKind } from "~/lib/planner/types";
import type { DayAction } from "./state";
import { Sheet } from "./ui";

interface Option {
  action: DayAction;
  label: string;
  hint: string;
  Icon: typeof Lock;
}

export function DayMenu({
  day,
  kind,
  holidays,
  anchor,
  editable,
  onAction,
  onClose,
}: {
  day: DayNum | null;
  kind: DayKind | null;
  holidays: string[];
  anchor: DOMRect | null;
  editable: boolean;
  onAction: (day: DayNum, action: DayAction) => void;
  onClose: () => void;
}) {
  const last = useRef<{ day: DayNum; kind: DayKind; holidays: string[]; editable: boolean } | null>(null);
  const open = day !== null && kind !== null;
  if (open) last.current = { day, kind, holidays, editable };
  const shown = last.current;
  if (!shown)
    return (
      <Sheet open={false} onClose={onClose}>
        {null}
      </Sheet>
    );
  return <DayMenuSheet {...shown} open={open} anchor={anchor} onAction={onAction} onClose={onClose} />;
}

function DayMenuSheet({
  day,
  kind,
  holidays,
  anchor,
  editable,
  open,
  onAction,
  onClose,
}: {
  day: DayNum;
  kind: DayKind;
  holidays: string[];
  anchor: DOMRect | null;
  editable: boolean;
  open: boolean;
  onAction: (day: DayNum, action: DayAction) => void;
  onClose: () => void;
}) {
  const i18n = useI18n();
  const p = i18n.m.planner;
  const date = parts(day);
  const lock: Option = { action: "lock", label: p.keepLeave, hint: p.keepLeaveHint, Icon: Lock };
  const take: Option = { action: "lock", label: p.takeDay, hint: p.takeDayHint, Icon: Lock };
  const block: Option = { action: "block", label: p.cantTake, hint: p.cantTakeHint, Icon: Ban };
  const custom: Option = {
    action: "custom",
    label: p.dayOffAnyway,
    hint: p.dayOffAnywayHint,
    Icon: Sparkles,
  };

  let note: string | null = null;
  let options: Option[] = [];
  switch (kind) {
    case "leave":
      note = p.suggestedLeave;
      options = [lock, block, custom];
      break;
    case "work":
      options = [take, block, custom];
      break;
    case "locked":
      note = p.keepingLeave;
      options = [{ action: "clear", label: p.stopKeeping, hint: p.stopKeepingHint, Icon: Undo2 }];
      break;
    case "blocked":
      note = p.cantTakeNote;
      options = [{ action: "clear", label: p.allowAgain, hint: p.allowAgainHint, Icon: Undo2 }];
      break;
    case "custom":
      note = p.customNote;
      options = [{ action: "clear", label: p.removeDayOff, hint: p.removeDayOffHint, Icon: Undo2 }];
      break;
    case "holiday":
      note = holidays.length ? i18n.text(p.holidayNote, { names: holidays.join(", ") }) : p.holidayPlain;
      break;
    case "weekend":
      note = p.weekendNote;
      break;
  }
  if (!editable && options.length && kind !== "locked" && kind !== "blocked" && kind !== "custom") {
    note = `${note ? `${note} ` : ""}${p.outsideYear}`;
  }

  return (
    <Sheet open={open} onClose={onClose} anchor={anchor} title={`${i18n.formatShort(day)} ${date.year}`}>
      {note && <p className="-mt-2 text-sm text-muted">{note}</p>}
      {options.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {options.map((o) => (
            <li key={o.label}>
              <button
                type="button"
                onClick={() => {
                  onAction(day, o.action);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card-2 px-3.5 py-3 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-lime active:scale-[0.98]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-ink shadow-card">
                  <o.Icon size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{o.label}</span>
                  <span className="text-xs text-muted">{o.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
