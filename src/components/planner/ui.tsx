import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/context";

const CLOSE: Record<string, string> = {
  de: "Schließen",
  sv: "Stäng",
  nb: "Lukk",
  no: "Lukk",
  da: "Luk",
  fi: "Sulje",
  pl: "Zamknij",
  nl: "Sluiten",
  fr: "Fermer",
  es: "Cerrar",
  it: "Chiudi",
  pt: "Fechar",
  cs: "Zavřít",
};

function closeLabel(locale: string): string {
  if (locale === "en") return "Close";
  const lang = locale.toLowerCase().startsWith("nb") ? "nb" : locale.split("-")[0];
  return (lang && CLOSE[lang]) || "Close";
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** How long a closing sheet stays rendered, so it can animate out (matches global.css). */
const SHEET_EXIT_MS = 320;

/** Where a flick would come to rest (Apple's scroll-deceleration projection), in px from v px/ms. */
function project(v: number, decelerationRate = 0.998): number {
  return (v * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past an edge: the further you pull, the less it follows. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * overshoot);
}

/**
 * Modal built on <dialog>: a bottom sheet on phones, a centred card or anchored popover on wider screens.
 * On phones the grabber and title row drag the sheet down to dismiss it.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  anchor,
  wide = false,
  fit = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  anchor?: DOMRect | null;
  wide?: boolean;
  /**
   * Place an anchored popover by its measured height rather than a typical one, so a tall popover
   * stays inside the window and scrolls instead of running off it.
   */
  fit?: boolean;
}) {
  const close = closeLabel(useI18n().code);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [style, setStyle] = useState<React.CSSProperties | undefined>();
  // Keep the content rendered while the sheet animates out.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), SHEET_EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (anchor && window.innerWidth >= 640) {
        const width = 300;
        const left = Math.min(
          Math.max(16, anchor.left + anchor.width / 2 - width / 2),
          window.innerWidth - width - 16,
        );
        const below = anchor.bottom + 8;
        const flip = below + 260 > window.innerHeight;
        const top = flip ? Math.max(16, anchor.top - 8 - 260) : below;
        // Grow out of the tapped day.
        const originX = anchor.left + anchor.width / 2 - left;
        setStyle({
          position: "fixed",
          margin: 0,
          top,
          left,
          width,
          transformOrigin: `${originX}px ${flip ? "calc(100% + 8px)" : "-8px"}`,
        });
      } else setStyle(undefined);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, anchor]);

  // Whether `fit` has moved the popover, so its inline position can be handed back to `style`.
  const fitted = useRef(false);
  // Runs after every render while anchored, as the content's height can change while it's open.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!fit || !style || !anchor || !open || !d.open) {
      // Once a fitted popover has finished leaving, or the sheet opens unanchored, drop the fitted
      // values so a later open starts from `style` alone.
      if (fitted.current && (open || !mounted)) {
        d.style.top = style?.top === undefined ? "" : `${style.top}px`;
        d.style.maxHeight = "";
        d.style.transformOrigin = style?.transformOrigin?.toString() ?? "";
        fitted.current = false;
      }
      return;
    }
    fitted.current = true;
    const h = d.offsetHeight;
    const below = anchor.bottom + 8;
    const above = anchor.top - 8 - h;
    const flip = below + h > window.innerHeight - 16 && above >= 16;
    const top = flip ? above : Math.max(16, Math.min(below, window.innerHeight - 16 - h));
    const originX = style.transformOrigin?.toString().split(" ")[0] ?? "50%";
    d.style.top = `${top}px`;
    d.style.maxHeight = `${window.innerHeight - 32}px`;
    d.style.transformOrigin = `${originX} ${flip ? "calc(100% + 8px)" : `${anchor.top + anchor.height / 2 - top}px`}`;
  });

  useEffect(() => {
    const d = ref.current;
    const handler = () => closeRef.current();
    d?.addEventListener("close", handler);
    return () => d?.removeEventListener("close", handler);
  }, []);

  const drag = useRef<{ id: number; y: number; dy: number; samples: { t: number; dy: number }[] } | null>(
    null,
  );
  const onGrabDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = ref.current;
    if (!d || drag.current || window.innerWidth >= 640) return;
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    drag.current = { id: e.pointerId, y: e.clientY, dy: 0, samples: [{ t: e.timeStamp, dy: 0 }] };
    e.currentTarget.setPointerCapture(e.pointerId);
    d.style.transition = "none";
  };
  const onGrabMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = ref.current;
    const g = drag.current;
    if (!d || !g || g.id !== e.pointerId) return;
    const raw = e.clientY - g.y;
    // The sheet follows the finger 1:1 downwards and rubber-bands upwards.
    g.dy = raw >= 0 ? raw : -rubberband(-raw, d.offsetHeight);
    g.samples.push({ t: e.timeStamp, dy: raw });
    if (g.samples.length > 6) g.samples.shift();
    d.style.transform = `translateY(${g.dy}px)`;
  };
  const onGrabEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = ref.current;
    const g = drag.current;
    if (!d || !g || g.id !== e.pointerId) return;
    drag.current = null;
    // Release velocity (px/ms) from the last ~100ms of movement, not the whole drag.
    const recent = g.samples.filter((s) => e.timeStamp - s.t < 100);
    const first = recent[0] ?? g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const v = first && last && last.t > first.t ? (last.dy - first.dy) / (last.t - first.t) : 0;
    // Throw the sheet: dismiss if it's still heading down and its projected resting point is past halfway.
    const h = d.offsetHeight;
    const dismiss = v >= 0 && g.dy + project(v) > h / 2;
    // Match the finger's speed: --ease-drawer starts at ~2.25x its average speed.
    const remaining = dismiss ? h - g.dy : Math.abs(g.dy);
    const ms = Math.round(
      Math.min(300, Math.max(120, Math.abs(v) > 0.05 ? (2.25 * remaining) / Math.abs(v) : 300)),
    );
    d.style.transition = `transform ${ms}ms var(--ease-drawer), display ${ms}ms allow-discrete, overlay ${ms}ms allow-discrete`;
    // Clear the drag offset in the same frame as closing, so the exit continues from where the finger let go.
    d.style.transform = "";
    if (dismiss) d.close();
    setTimeout(() => {
      if (!drag.current) d.style.transition = "";
    }, ms + 50);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      className={cx("sheet", wide && "sm:!w-[min(720px,calc(100%-32px))]")}
      data-anchored={style ? "" : undefined}
      style={style}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {(open || mounted) && (
        <div className="flex flex-col gap-4 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div
            className="sheet-grab -mx-5 -mt-5 flex select-none flex-col gap-4 px-5 pt-5 max-sm:cursor-grab"
            onPointerDown={onGrabDown}
            onPointerMove={onGrabMove}
            onPointerUp={onGrabEnd}
            onPointerCancel={onGrabEnd}
          >
            <div className="mx-auto -mt-1 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
            {title && (
              <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="font-display text-xl font-bold">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={close}
                  className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-transform hover:bg-card-2 hover:text-ink active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const DayIcon = {
  check: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </g>
    </svg>
  ),
  x: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="7" rx="2" />
      <path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.8l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.4l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" />
    </svg>
  ),
};

export interface Toast {
  id: number;
  text: string;
  tone?: "good" | "info" | "warn";
  leaving?: boolean;
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-leaving={t.leaving ? "" : undefined}
          className={cx(
            "toast pointer-events-auto rounded-full px-5 py-3 text-sm font-bold shadow-lift",
            t.tone === "good" && "bg-lime text-lime-ink",
            t.tone === "warn" && "bg-sun text-sun-ink",
            (!t.tone || t.tone === "info") && "bg-ink text-card",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

const TOAST_MS = 3200;
const TOAST_EXIT_MS = 250;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = (text: string, tone: Toast["tone"] = "info") => {
    const id = ++idRef.current;
    setToasts((ts) => [...ts.slice(-2), { id, text, tone }]);
    // Mark it leaving first so it can sink out, then drop it.
    setTimeout(() => setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t))), TOAST_MS);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), TOAST_MS + TOAST_EXIT_MS);
  };
  return { toasts, push };
}

/** A value that slides in when it changes. */
export function Tick({ children }: { children: string | number }) {
  return (
    <span key={children} className="tick">
      {children}
    </span>
  );
}

export function Stepper({
  id,
  value,
  onChange,
  min,
  max,
  label,
  valueName,
  big = false,
  size,
  format,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  /** Fewer/more button name, usually the plural noun ("leave days"). */
  label: string;
  /** Accessible name of the number itself, including the count ("1 leave day"). */
  valueName?: string;
  big?: boolean;
  /** "field": exactly as tall as an `.input`, to line up with text fields in a form row. */
  size?: "field";
  format?: (n: number) => string;
}) {
  const i18n = useI18n();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const field = size === "field";
  return (
    <div
      className={cx(
        "flex items-center justify-between border border-line bg-card-2",
        field ? "h-[46px] rounded-[16px] px-[6px]" : big ? "rounded-[18px] p-1.5" : "rounded-[18px] p-1",
      )}
    >
      <button
        type="button"
        aria-label={i18n.text(i18n.m.planner.fewer, { label })}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className={cx(
          "grid place-items-center rounded-full bg-card text-lg font-semibold shadow-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.92] disabled:opacity-40",
          big ? "size-10" : "size-8",
        )}
      >
        −
      </button>
      {format ? (
        <output
          id={id}
          className={cx("font-display font-extrabold tabular-nums", big ? "text-3xl" : "text-lg")}
        >
          {format(value)}
        </output>
      ) : (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          aria-label={valueName ?? label}
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          className={cx(
            "w-20 bg-transparent text-center font-display font-extrabold tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none",
            big ? "text-3xl" : "text-lg",
          )}
        />
      )}
      <button
        type="button"
        aria-label={i18n.text(i18n.m.planner.more, { label })}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className={cx(
          "grid place-items-center rounded-full bg-card text-lg font-semibold shadow-card transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.92] disabled:opacity-40",
          big ? "size-10" : "size-8",
        )}
      >
        +
      </button>
    </div>
  );
}
