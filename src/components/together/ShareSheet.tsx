import { Check, Copy, Share2, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cx, Sheet } from "~/components/planner/ui";
import { t } from "./copy";
import { QrCode } from "./QrCode";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A link as a big QR code, with copy and the phone's own share sheet. A `warning` marks a private link. */
export function ShareSheet({
  open,
  onClose,
  url,
  title,
  caption,
  warning,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  caption: string;
  warning?: string;
}) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await copyText(url)) setCopied(true);
  };
  const share = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // Dismissed, or the platform refused: the link is still there to copy.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <figure className="flex flex-col items-center gap-3">
        <div
          className={cx(
            "w-full max-w-[280px] rounded-[24px] border-2 p-2 dark:bg-hero-ink",
            warning ? "border-dashed border-sun" : "border-line",
          )}
        >
          <QrCode value={url} label={caption} size={264} className="w-full" />
        </div>
        <figcaption className="text-center font-display text-xl font-bold">{caption}</figcaption>
      </figure>

      {warning && (
        <p className="flex gap-2.5 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold">
          <TriangleAlert
            size={18}
            className="mt-0.5 shrink-0 text-sun-ink dark:text-sun"
            aria-hidden="true"
          />
          {warning}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-url`} className="field-label">
          {t.link}
        </label>
        <input
          id={`${id}-url`}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="input min-w-0 sm:text-sm"
        />
      </div>
      <div className="grid gap-2 sm:auto-cols-fr sm:grid-flow-col">
        <button type="button" className="btn btn-primary" onClick={copy}>
          <span key={String(copied)} className="swap">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </span>
          {copied ? t.copied : t.copyLink}
        </button>
        {canShare && (
          <button type="button" className="btn btn-soft" onClick={share}>
            <Share2 size={16} /> {t.share}
          </button>
        )}
      </div>
    </Sheet>
  );
}
