export type Mood = "happy" | "sleepy" | "starry" | "wow" | "puzzled";

const NAVY = "#1A2030";
const LIME = "#8BD12F";
const SUN = "#FFC83D";

/** The leavemaxxing mark: a happy calendar page. Its face follows the plan's mood. */
export function Mascot({
  size = 40,
  mood = "happy",
  title = "leavemaxxing",
  className,
  blink = false,
}: {
  size?: number;
  mood?: Mood;
  title?: string;
  className?: string;
  blink?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{ flex: "none" }}
    >
      <rect x="4" y="9" width="56" height="51" rx="17" fill={NAVY} />
      <rect x="16" y="3" width="8" height="14" rx="4" fill={LIME} />
      <rect x="40" y="3" width="8" height="14" rx="4" fill={LIME} />
      <Face mood={mood} blink={blink} />
    </svg>
  );
}

function Face({ mood, blink }: { mood: Mood; blink: boolean }) {
  const eyes = blink ? "mascot-eyes" : undefined;
  switch (mood) {
    case "sleepy":
      return (
        <>
          <path
            d="M18 31 Q23 35 28 31 M36 31 Q41 35 46 31"
            stroke={SUN}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M25 44 H39" stroke={LIME} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case "starry":
      return (
        <>
          <Star cx={23} cy={30} />
          <Star cx={41} cy={30} />
          <path d="M19 40 Q32 54 45 40 Z" fill={LIME} stroke={LIME} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case "wow":
      return (
        <>
          <g className={eyes}>
            <circle cx="23" cy="30" r="5" fill={SUN} />
            <circle cx="41" cy="30" r="5" fill={SUN} />
          </g>
          <ellipse cx="32" cy="45" rx="5.5" ry="6" fill={LIME} />
        </>
      );
    case "puzzled":
      return (
        <>
          <g className={eyes}>
            <circle cx="23" cy="31" r="4.2" fill={SUN} />
            <circle cx="41" cy="29" r="4.2" fill={SUN} />
          </g>
          <path
            d="M22 45 Q27 41 32 45 T42 44"
            stroke={LIME}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    default:
      return (
        <>
          <g className={eyes}>
            <circle cx="23" cy="31" r="4.2" fill={SUN} />
            <circle cx="41" cy="31" r="4.2" fill={SUN} />
          </g>
          <path d="M20 41 Q32 52 44 41" stroke={LIME} strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      );
  }
}

function Star({ cx, cy }: { cx: number; cy: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 6.5 : 2.8;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill={SUN} />;
}

export function moodFor(multiplier: number, leaveUsed: number): Mood {
  if (leaveUsed === 0) return "sleepy";
  if (multiplier >= 3) return "starry";
  if (multiplier >= 2.4) return "wow";
  if (multiplier >= 1.6) return "happy";
  return "puzzled";
}

/** Static SVG markup of the mark (for favicons and generated images). */
export function mascotSvg(size = 64, mood: Mood = "happy"): string {
  const face: Record<Mood, string> = {
    happy: `<circle cx="23" cy="31" r="4.2" fill="${SUN}"/><circle cx="41" cy="31" r="4.2" fill="${SUN}"/><path d="M20 41 Q32 52 44 41" stroke="${LIME}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
    sleepy: `<path d="M18 31 Q23 35 28 31 M36 31 Q41 35 46 31" stroke="${SUN}" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M25 44 H39" stroke="${LIME}" stroke-width="5" stroke-linecap="round"/>`,
    starry: `<circle cx="23" cy="30" r="5" fill="${SUN}"/><circle cx="41" cy="30" r="5" fill="${SUN}"/><path d="M19 40 Q32 54 45 40 Z" fill="${LIME}" stroke="${LIME}" stroke-width="3" stroke-linejoin="round"/>`,
    wow: `<circle cx="23" cy="30" r="5" fill="${SUN}"/><circle cx="41" cy="30" r="5" fill="${SUN}"/><ellipse cx="32" cy="45" rx="5.5" ry="6" fill="${LIME}"/>`,
    puzzled: `<circle cx="23" cy="31" r="4.2" fill="${SUN}"/><circle cx="41" cy="29" r="4.2" fill="${SUN}"/><path d="M22 45 Q27 41 32 45 T42 44" stroke="${LIME}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect x="4" y="9" width="56" height="51" rx="17" fill="${NAVY}"/><rect x="16" y="3" width="8" height="14" rx="4" fill="${LIME}"/><rect x="40" y="3" width="8" height="14" rx="4" fill="${LIME}"/>${face[mood]}</svg>`;
}
