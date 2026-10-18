import { textOn } from "~/lib/together/member";

/** A member's first letter on their colour, in whichever of white or black reads better. */
export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color, color: textOn(color), width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full text-base font-extrabold"
    >
      {initial}
    </span>
  );
}
