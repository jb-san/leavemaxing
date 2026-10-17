import { Check, Copy, Download, Image as ImageIcon, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DayNum } from "~/lib/dates";
import { formatRange } from "~/lib/dates";
import { buildIcs, downloadFile, googleCalendarUrl } from "~/lib/ics";
import type { Plan } from "~/lib/planner/types";
import { CARD_SIZE, type CardData, type CardFormat, canvasToBlob, drawShareCard } from "~/lib/shareCard";
import { cx, Sheet } from "./ui";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareDialog({
  open,
  onClose,
  url,
  card,
  fileName,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  card: CardData;
  fileName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<CardFormat>("wide");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    drawShareCard(canvas, card, format).then(() => {
      if (live) setPreview(canvas.toDataURL("image/png"));
    });
    return () => {
      live = false;
    };
  }, [open, card, format]);

  const shareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const file = new File([blob], `${fileName}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My leavemaxxing plan", url });
        return;
      } catch {
        return;
      }
    }
    downloadFile(`${fileName}.png`, blob, "image/png");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My leavemaxxing plan", url });
      } catch {}
      return;
    }
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { w, h } = CARD_SIZE[format];
  return (
    <Sheet open={open} onClose={onClose} title="Share your plan" wide>
      <div className="flex flex-col gap-2">
        <label htmlFor="share-url" className="field-label">
          Link to this exact plan
        </label>
        <div className="flex gap-2">
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="input min-w-0 flex-1 text-sm"
          />
          <button
            type="button"
            className="btn btn-soft shrink-0"
            onClick={async () => {
              if (await copyText(url)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            <span key={String(copied)} className="swap">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </span>{" "}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="field-label">Image</span>
          <div role="radiogroup" aria-label="Image size" className="flex gap-1.5">
            {(["wide", "story"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={format === f}
                onClick={() => setFormat(f)}
                className="chip py-1 text-xs"
              >
                {f === "wide" ? "Wide" : "Story"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid place-items-center rounded-3xl bg-card-2 p-3">
          {preview ? (
            <img
              src={preview}
              alt="Preview of what you will share"
              width={w}
              height={h}
              className={cx(
                "h-auto rounded-2xl shadow-card",
                format === "story" ? "max-h-[46dvh] w-auto" : "w-full",
              )}
            />
          ) : (
            <div className="grid aspect-[1200/630] w-full place-items-center text-sm text-muted">
              <ImageIcon className="animate-pulse" />
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" className="btn btn-primary" onClick={shareImage}>
          <Download size={16} /> Save or share image
        </button>
        <button type="button" className="btn btn-soft" onClick={shareLink}>
          <Share2 size={16} /> Share link
        </button>
      </div>
    </Sheet>
  );
}

export function ExportDialog({
  open,
  onClose,
  plan,
  calendarName,
  fileName,
}: {
  open: boolean;
  onClose: () => void;
  plan: Plan;
  calendarName: string;
  fileName: string;
}) {
  const [days, setDays] = useState(false);
  const leaveDays: DayNum[] = [...plan.suggested, ...plan.locked];
  const breaks = plan.breaks.filter((b) => b.leave > 0);
  return (
    <Sheet open={open} onClose={onClose} title="Add to your calendar">
      <p className="-mt-2 text-sm text-muted">
        Download a calendar file with one all-day event per break. It works with Google Calendar, Apple
        Calendar and Outlook.
      </p>
      <label className="flex items-center gap-3 rounded-2xl border border-line bg-card-2 px-4 py-3 text-sm font-semibold">
        <input
          type="checkbox"
          id="ics-days"
          checked={days}
          onChange={(e) => setDays(e.target.checked)}
          className="size-4 accent-[var(--lime-strong)]"
        />
        Also add each leave day as its own event
      </label>
      <button
        type="button"
        className="btn btn-primary self-start"
        disabled={breaks.length === 0}
        onClick={() => {
          downloadFile(
            `${fileName}.ics`,
            buildIcs(plan, { calendarName, includeLeaveDays: days }),
            "text/calendar",
          );
          onClose();
        }}
      >
        <Download size={16} /> Download .ics file
      </button>
      {breaks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="field-label">Or add breaks to Google Calendar one by one</span>
          <ul className="flex flex-wrap gap-2">
            {breaks.map((b) => (
              <li key={b.start}>
                <a
                  className="chip"
                  href={googleCalendarUrl(b, leaveDays)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {formatRange(b.start, b.end)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

export function SaveDialog({
  open,
  onClose,
  defaultName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);
  return (
    <Sheet open={open} onClose={onClose} title="Save this plan">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name.trim() || defaultName);
          onClose();
        }}
      >
        <p className="-mt-2 text-sm text-muted">
          Saved plans stay in this browser. Nothing is uploaded. Find them under My plans.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="plan-name" className="field-label">
            Name
          </label>
          <input
            id="plan-name"
            className="input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary self-start">
          Save plan
        </button>
      </form>
    </Sheet>
  );
}
