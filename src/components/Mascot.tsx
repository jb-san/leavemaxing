import { createElement } from "react";

export type Mood = "happy" | "sleepy" | "starry" | "wow" | "puzzled";

const NAVY = "#1A2030";
const LIME = "#8BD12F";
const SUN = "#FFC83D";
const PAPER = "#FBFDF7";
const BLUSH = "#FF9DB0";

/** One SVG element: tag plus attributes, so the React mark and the static markup share a drawing. */
type Shape = [tag: string, attrs: Record<string, string | number>];
/** Eyes are kept apart so the React mark can blink them. */
interface Drawing {
  eyes: Shape[];
  rest: Shape[];
}

const ink = { stroke: NAVY, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" };

// A paper page with a lime header band and binder rings, outlined in navy so it keeps its
// shape on light backgrounds and still reads as a bright page on dark ones.
const BODY: Shape[] = [
  ["rect", { x: 3, y: 7, width: 58, height: 54, rx: 17, fill: NAVY }],
  ["rect", { x: 6.5, y: 10.5, width: 51, height: 47, rx: 13.5, fill: PAPER }],
  ["path", { d: "M6.5 25V24A13.5 13.5 0 0 1 20 10.5H44A13.5 13.5 0 0 1 57.5 24V25Z", fill: LIME }],
  ["rect", { x: 6.5, y: 24, width: 51, height: 3, fill: NAVY }],
  ["rect", { x: 17.5, y: 4, width: 7, height: 13, rx: 3.5, fill: NAVY }],
  ["rect", { x: 39.5, y: 4, width: 7, height: 13, rx: 3.5, fill: NAVY }],
];

const cheeks: Shape[] = [
  ["ellipse", { cx: 16.5, cy: 46, rx: 3.6, ry: 2.4, fill: BLUSH }],
  ["ellipse", { cx: 47.5, cy: 46, rx: 3.6, ry: 2.4, fill: BLUSH }],
];

function eye(cx: number, cy: number, r = 3.9): Shape[] {
  return [
    ["ellipse", { cx, cy, rx: r, ry: r * 1.15, fill: NAVY }],
    ["circle", { cx: cx + r * 0.32, cy: cy - r * 0.42, r: r * 0.36, fill: "#FFFFFF" }],
  ];
}

function star(cx: number, cy: number): Shape {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 6 : 2.7;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return ["polygon", { points, fill: SUN, stroke: NAVY, "stroke-width": 1.6, "stroke-linejoin": "round" }];
}

const FACES: Record<Mood, Drawing> = {
  happy: {
    eyes: [...eye(24, 38.5), ...eye(40, 38.5)],
    rest: [...cheeks, ["path", { d: "M25.5 45Q32 52.5 38.5 45", "stroke-width": 3.4, ...ink }]],
  },
  sleepy: {
    eyes: [["path", { d: "M19.5 39Q24 42.5 28.5 39M35.5 39Q40 42.5 44.5 39", "stroke-width": 3, ...ink }]],
    rest: [...cheeks, ["path", { d: "M29 48H35", "stroke-width": 3, ...ink }]],
  },
  starry: {
    eyes: [star(24, 38.5), star(40, 38.5)],
    rest: [
      ...cheeks,
      [
        "path",
        { d: "M25 45Q32 55 39 45Z", fill: NAVY, stroke: NAVY, "stroke-width": 2, "stroke-linejoin": "round" },
      ],
      ["ellipse", { cx: 32, cy: 49.6, rx: 3.2, ry: 1.6, fill: BLUSH }],
    ],
  },
  wow: {
    eyes: [...eye(24, 38, 4.4), ...eye(40, 38, 4.4)],
    rest: [...cheeks, ["ellipse", { cx: 32, cy: 49, rx: 3.2, ry: 3.8, fill: NAVY }]],
  },
  puzzled: {
    eyes: [...eye(24, 39.5), ...eye(40, 37.5)],
    rest: [...cheeks, ["path", { d: "M25.5 48Q28.75 45 32 48T38.5 47", "stroke-width": 3, ...ink }]],
  },
};

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

function toReact([tag, attrs]: Shape, key: number) {
  const props: Record<string, string | number> = { key };
  for (const [k, v] of Object.entries(attrs)) props[camel(k)] = v;
  return createElement(tag, props);
}

const toMarkup = ([tag, attrs]: Shape) =>
  `<${tag} ${Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ")}/>`;

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
  const face = FACES[mood];
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
      {BODY.map(toReact)}
      <g className={blink ? "mascot-eyes" : undefined}>{face.eyes.map(toReact)}</g>
      {face.rest.map(toReact)}
    </svg>
  );
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
  const face = FACES[mood];
  const shapes = [...BODY, ...face.eyes, ...face.rest].map(toMarkup).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${shapes}</svg>`;
}
