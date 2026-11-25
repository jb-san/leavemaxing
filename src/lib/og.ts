import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { mascotSvg, moodFor } from "~/components/Mascot";
import { englishCount } from "~/i18n/format";
import { type DayNum, MONTHS_SHORT } from "./dates";
import type { Plan } from "./planner/types";

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFileSync(require.resolve(`${pkg}/files/${file}`));

let fonts: { name: string; data: Buffer; weight: 500 | 700; style: "normal" }[] | null = null;
function loadFonts() {
  fonts ??= [
    {
      name: "Display",
      data: font("@fontsource/archivo-narrow", "archivo-narrow-latin-700-normal.woff"),
      weight: 700,
      style: "normal",
    },
    {
      name: "Display",
      data: font("@fontsource/archivo-narrow", "archivo-narrow-latin-ext-700-normal.woff"),
      weight: 700,
      style: "normal",
    },
    {
      name: "Body",
      data: font("@fontsource/archivo", "archivo-latin-500-normal.woff"),
      weight: 500,
      style: "normal",
    },
    {
      name: "Body",
      data: font("@fontsource/archivo", "archivo-latin-ext-500-normal.woff"),
      weight: 500,
      style: "normal",
    },
    {
      name: "Body",
      data: font("@fontsource/archivo", "archivo-latin-700-normal.woff"),
      weight: 700,
      style: "normal",
    },
    {
      name: "Body",
      data: font("@fontsource/archivo", "archivo-latin-ext-700-normal.woff"),
      weight: 700,
      style: "normal",
    },
    // Archivo has no Cyrillic. Satori uses the next face that contains the glyph.
    {
      name: "Noto Sans",
      data: font("@fontsource/noto-sans", "noto-sans-cyrillic-500-normal.woff"),
      weight: 500,
      style: "normal",
    },
    {
      name: "Noto Sans",
      data: font("@fontsource/noto-sans", "noto-sans-cyrillic-700-normal.woff"),
      weight: 700,
      style: "normal",
    },
  ];
  return fonts;
}

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children },
});

const C = {
  bg: "#EEF3EA",
  navy: "#1A2030",
  ink: "#F2F6EE",
  muted: "#A3ACBA",
  line: "#2F374A",
  lime: "#8BD12F",
  limeInk: "#1C3300",
  sun: "#FFC83D",
};

/** The year as a bar of breaks (lime with leave, sun without) over month initials. */
function yearStrip(
  plan: Plan,
  range: { start: DayNum; end: DayNum },
  months: readonly string[] = MONTHS_SHORT,
): Node[] {
  const strip: Node[] = [];
  const span = range.end - range.start + 1;
  const pct = (d: DayNum) => (Math.min(Math.max(d - range.start, 0), span) / span) * 100;
  strip.push(
    h("div", {
      position: "absolute",
      left: 0,
      right: 0,
      top: 13,
      height: 10,
      borderRadius: 5,
      background: C.line,
    }),
  );
  for (const b of plan.breaks) {
    if (b.end < range.start || b.start > range.end) continue;
    strip.push(
      h("div", {
        position: "absolute",
        top: 4,
        height: 28,
        borderRadius: 14,
        minWidth: 14,
        left: `${pct(b.start)}%`,
        width: `${pct(b.end + 1) - pct(b.start)}%`,
        background: b.leave > 0 ? C.lime : "rgba(255,200,61,0.8)",
      }),
    );
  }
  months.forEach((m, i) => {
    strip.push(
      h(
        "div",
        { position: "absolute", top: 42, left: `${(i / 12) * 100}%`, fontSize: 18, color: C.muted },
        m,
      ),
    );
  });
  return strip;
}

function toPng(svg: string): Buffer {
  // satori draws text as paths, so resvg needs no fonts. Loading the system's fonts costs far more
  // than drawing the card.
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 }, font: { loadSystemFonts: false } })
    .render()
    .asPng();
}

/** The logo row along the top of every card. */
function header(mascot: string): Node {
  return h(
    "div",
    { alignItems: "center", justifyContent: "space-between", width: 1088 },
    h(
      "div",
      { alignItems: "center", gap: 18 },
      { type: "img", props: { src: mascot, width: 72, height: 72 } },
      h(
        "div",
        { fontFamily: "Display", fontSize: 40, color: C.navy },
        "leavema",
        h("span", { color: "#4F8A0E" }, "xx"),
        "ing",
      ),
    ),
    h("div", { fontSize: 24, fontWeight: 700, color: "#646F60" }, "leavemaxxing.com"),
  );
}

function badge(multiplier: number): Node {
  return h(
    "div",
    {
      width: 170,
      height: 170,
      borderRadius: 85,
      background: C.lime,
      color: C.limeInk,
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Display",
      fontSize: 56,
      boxShadow: "0 0 0 14px rgba(139,209,47,0.18)",
    },
    `${multiplier.toFixed(1)}×`,
  );
}

export interface OgInput {
  title: string;
  subtitle: string;
  plan?: Plan;
  range?: { start: DayNum; end: DayNum };
  /** Lime line under the title when there is no plan. */
  tagline?: string;
}

const mascotUri = (mood: ReturnType<typeof moodFor>) =>
  `data:image/svg+xml;base64,${Buffer.from(mascotSvg(160, mood)).toString("base64")}`;

/** The page: sage background, logo row, and a navy panel holding `panel`. */
function card(mascot: string, ...panel: Node[]): Node {
  return h(
    "div",
    { width: 1088, height: 518, background: C.bg, padding: 56, flexDirection: "column", fontFamily: "Body" },
    header(mascot),
    h(
      "div",
      {
        marginTop: 32,
        width: 992,
        height: 326,
        background: C.navy,
        borderRadius: 44,
        padding: "44px 48px",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
      },
      ...panel,
    ),
  );
}

async function draw(tree: Node): Promise<Buffer> {
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: loadFonts(),
  });
  return toPng(svg);
}

const big = { fontFamily: "Display", fontSize: 60, lineHeight: 1.05 };

/** Render a 1200×630 PNG link preview. */
export async function renderOg({ title, subtitle, plan, range, tagline }: OgInput): Promise<Buffer> {
  const mood = plan ? moodFor(plan.stats.multiplier, plan.stats.leaveUsed) : "happy";
  return draw(
    card(
      mascotUri(mood),
      h(
        "div",
        { justifyContent: "space-between", alignItems: "flex-start" },
        h(
          "div",
          { flexDirection: "column", width: 780 },
          h("div", { fontSize: 28, fontWeight: 700, color: C.muted }, subtitle),
          h("div", { ...big, color: C.ink, marginTop: 10 }, title),
          h(
            "div",
            { ...big, color: C.lime, marginTop: 6 },
            plan
              ? `${englishCount(plan.stats.leaveUsed, "leave day", "leave days")}, ${englishCount(plan.stats.daysOff, "day off", "days off")}`
              : (tagline ?? "Get the most from your leave."),
          ),
        ),
        plan ? badge(plan.stats.multiplier) : h("div", {}),
      ),
      plan && range
        ? h("div", { position: "relative", height: 70, width: 992 }, ...yearStrip(plan, range))
        : h(
            "div",
            {
              gap: 14,
              alignItems: "center",
              height: 70,
              paddingLeft: 30,
              borderRadius: 35,
              background: "rgba(139,209,47,0.16)",
              width: 560,
            },
            ...["sun", "lime", "lime", "lime", "lime", "wkd", "wkd", "sun", "lime"].map((k) =>
              h("div", {
                width: 44,
                height: 44,
                borderRadius: 22,
                background: k === "sun" ? C.sun : k === "lime" ? C.lime : C.line,
              }),
            ),
          ),
    ),
  );
}

export interface ShareOgInput {
  /** Country (or region) and year, e.g. "Sweden 2027". */
  place: string;
  /** "25 leave days", localized. */
  leave: string;
  /** "52 days off", localized. */
  off: string;
  plan: Plan;
  range: { start: DayNum; end: DayNum };
  /** Short month names in the card's language. */
  months: readonly string[];
}

/** An arrow drawn as a shape, since the card's fonts have no → glyph. */
function arrow(color: string): Node {
  return {
    type: "svg",
    props: {
      width: 58,
      height: 44,
      viewBox: "0 0 58 44",
      style: { marginRight: 18, marginTop: 8 },
      children: {
        type: "path",
        props: {
          d: "M4 22h44M30 5l19 17-19 17",
          fill: "none",
          stroke: color,
          strokeWidth: 9,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
      },
    },
  };
}

/** The preview for a shared plan link: "25 leave days → 52 days off" for a place and year. */
export async function renderShareOg({
  place,
  leave,
  off,
  plan,
  range,
  months,
}: ShareOgInput): Promise<Buffer> {
  return draw(
    card(
      mascotUri(moodFor(plan.stats.multiplier, plan.stats.leaveUsed)),
      h(
        "div",
        { justifyContent: "space-between", alignItems: "flex-start" },
        h(
          "div",
          { flexDirection: "column", width: 760 },
          h("div", { fontSize: 28, fontWeight: 700, color: C.muted }, place),
          h("div", { ...big, fontSize: 64, color: C.lime, marginTop: 12 }, leave),
          h(
            "div",
            { ...big, fontSize: 64, color: C.ink, marginTop: 4, alignItems: "center" },
            arrow(C.ink),
            off,
          ),
        ),
        badge(plan.stats.multiplier),
      ),
      h("div", { position: "relative", height: 70, width: 992 }, ...yearStrip(plan, range, months)),
    ),
  );
}
