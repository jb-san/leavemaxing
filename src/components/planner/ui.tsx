import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Modal built on <dialog>: a bottom sheet on phones, a centred card or anchored popover on wider screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  anchor,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  anchor?: DOMRect | null;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [style, setStyle] = useState<React.CSSProperties | undefined>();

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
        const top = below + 260 > window.innerHeight ? Math.max(16, anchor.top - 8 - 260) : below;
        setStyle({ position: "fixed", margin: 0, top, left, width });
      } else setStyle(undefined);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, anchor]);

  useEffect(() => {
    const d = ref.current;
    const handler = () => closeRef.current();
    d?.addEventListener("close", handler);
    return () => d?.removeEventListener("close", handler);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      className={cx("sheet", wide && "sm:!w-[min(720px,calc(100%-32px))]")}
      style={style}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="mx-auto -mt-1 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
          {title && (
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="font-display text-xl font-bold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-card-2 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
          )}
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
          className={cx(
            "pointer-events-auto rounded-full px-5 py-3 text-sm font-bold shadow-lift [animation:rise_.35s_var(--ease-spring)]",
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

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = (text: string, tone: Toast["tone"] = "info") => {
    const id = ++idRef.current;
    setToasts((ts) => [...ts.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  };
  return { toasts, push };
}

export function Stepper({
  id,
  value,
  onChange,
  min,
  max,
  label,
  big = false,
  format,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
  big?: boolean;
  format?: (n: number) => string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div
      className={cx(
        "flex items-center justify-between rounded-[18px] border border-line bg-card-2",
        big ? "p-1.5" : "p-1",
      )}
    >
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className={cx(
          "grid place-items-center rounded-full bg-card text-lg font-semibold shadow-card transition-transform active:scale-90 disabled:opacity-40",
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
          aria-label={label}
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
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className={cx(
          "grid place-items-center rounded-full bg-card text-lg font-semibold shadow-card transition-transform active:scale-90 disabled:opacity-40",
          big ? "size-10" : "size-8",
        )}
      >
        +
      </button>
    </div>
  );
}
