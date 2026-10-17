import { useMemo } from "react";
import { encode } from "uqr";
import { cx } from "~/components/planner/ui";

/** Modules of quiet zone on every side. Four is what the QR spec asks for. */
const QUIET = 4;

/**
 * A QR code drawn as one SVG path. Modules use currentColor on a light tile in both themes,
 * because some phone cameras can't read a light-on-dark code.
 */
export function QrCode({
  value,
  label,
  size = 240,
  className,
}: {
  value: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const { path, n } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: QUIET });
    let d = "";
    qr.data.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (!row[x]) {
          x++;
          continue;
        }
        // Join each run of dark modules in a row into one rectangle.
        let end = x;
        while (row[end + 1]) end++;
        d += `M${x} ${y}h${end - x + 1}v1h${-(end - x + 1)}z`;
        x = end + 1;
      }
    });
    return { path: d, n: qr.size };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cx("block h-auto max-w-full rounded-2xl text-ink dark:text-hero", className)}
    >
      <rect width={n} height={n} className="fill-card dark:fill-hero-ink" />
      <path d={path} fill="currentColor" />
    </svg>
  );
}
