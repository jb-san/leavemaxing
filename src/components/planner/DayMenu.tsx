import { Ban, Lock, Sparkles, Undo2 } from "lucide-react";
import { type DayNum, formatShort, parts } from "~/lib/dates";
import type { DayKind } from "~/lib/planner/types";
import type { DayAction } from "./state";
import { Sheet } from "./ui";

interface Option {
  action: DayAction;
  label: string;
  hint: string;
  Icon: typeof Lock;
}

const LOCK: Option = { action: "lock", label: "Keep as leave", hint: "Always include this day", Icon: Lock };
const TAKE: Option = { action: "lock", label: "Take this day off", hint: "Uses one leave day", Icon: Lock };
const BLOCK: Option = {
  action: "block",
  label: "I can't take this day",
  hint: "The plan works around it",
  Icon: Ban,
};
const CUSTOM: Option = {
  action: "custom",
  label: "Day off anyway",
  hint: "Company shutdown, birthday… doesn't use leave",
  Icon: Sparkles,
};

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
  if (day === null || kind === null)
    return (
      <Sheet open={false} onClose={onClose}>
        {null}
      </Sheet>
    );
  const p = parts(day);

  let note: string | null = null;
  let options: Option[] = [];
  switch (kind) {
    case "leave":
      note = "Suggested leave day.";
      options = [LOCK, BLOCK, CUSTOM];
      break;
    case "work":
      options = [TAKE, BLOCK, CUSTOM];
      break;
    case "locked":
      note = "You're keeping this day as leave.";
      options = [{ action: "clear", label: "Stop keeping it", hint: "Let the planner decide", Icon: Undo2 }];
      break;
    case "blocked":
      note = "You can't take this day.";
      options = [{ action: "clear", label: "Allow it again", hint: "The planner may use it", Icon: Undo2 }];
      break;
    case "custom":
      note = "A day off that doesn't use leave.";
      options = [{ action: "clear", label: "Remove day off", hint: "Back to a normal workday", Icon: Undo2 }];
      break;
    case "holiday":
      note = holidays.length ? `Public holiday: ${holidays.join(", ")}.` : "Public holiday.";
      break;
    case "weekend":
      note = "Weekend. Already a day off.";
      break;
  }
  if (!editable && options.length && kind !== "locked" && kind !== "blocked" && kind !== "custom") {
    note = `${note ? `${note} ` : ""}This day is outside the leave year or in the past, but you can still mark it.`;
  }

  return (
    <Sheet open onClose={onClose} anchor={anchor} title={`${formatShort(day)} ${p.year}`}>
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
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card-2 px-3.5 py-3 text-left transition-colors hover:border-lime"
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
