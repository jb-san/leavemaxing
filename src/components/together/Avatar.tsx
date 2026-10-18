import { cx } from "~/components/planner/ui";
import { textOn } from "~/lib/together/member";

/** A member's first letter on their colour, in whichever of white or black reads better. */
export function Avatar({
  name,
  color,
  size = 36,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden="true"
      // The letter scales with the circle: 16px at the default 36px.
      style={{
        backgroundColor: color,
        color: textOn(color),
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
      }}
      className={cx("grid shrink-0 place-items-center rounded-full font-extrabold leading-none", className)}
    >
      {initial}
    </span>
  );
}
