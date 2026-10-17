import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { mascotSvg, moodFor } from "~/components/Mascot";
import { type DayNum, MONTHS_SHORT } from "./dates";
import type { Plan } from "./planner/types";

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFileSync(require.resolve(`${pkg}/files/${file}`));

let fonts: { name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" }[] | null = null;
function loadFonts() {
  fonts ??= [
    {
      name: "Bricolage",
      data: font("@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff"),
      weight: 800,
      style: "normal",
    },
    {
      name: "Jakarta",
      data: font("@fontsource/plus-jakarta-sans", "plus-jakarta-sans-latin-500-normal.woff"),
      weight: 500,
      style: "normal",
    },
    {
      name: "Jakarta",
      data: font("@fontsource/plus-jakarta-sans", "plus-jakarta-sans-latin-700-normal.woff"),
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

export interface OgInput {
  title: string;
  subtitle: string;
  plan?: Plan;
  range?: { start: DayNum; end: DayNum };
}

/** Render a 1200×630 PNG link preview. */
export async function renderOg({ title, subtitle, plan, range }: OgInput): Promise<Buffer> {
  const mood = plan ? moodFor(plan.stats.multiplier, plan.stats.leaveUsed) : "happy";
  const mascot = `data:image/svg+xml;base64,${Buffer.from(mascotSvg(160, mood)).toString("base64")}`;

  const strip: Node[] = [];
  if (plan && range) {
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
    MONTHS_SHORT.forEach((m, i) => {
      strip.push(
        h(
          "div",
          { position: "absolute", top: 42, left: `${(i / 12) * 100}%`, fontSize: 18, color: C.muted },
          m,
        ),
      );
    });
  }

  const tree = h(
    "div",
    {
      width: 1088,
      height: 518,
      background: C.bg,
      padding: 56,
      flexDirection: "column",
      fontFamily: "Jakarta",
    },
    h(
      "div",
      { alignItems: "center", justifyContent: "space-between", width: 1088 },
      h(
        "div",
        { alignItems: "center", gap: 18 },
        { type: "img", props: { src: mascot, width: 72, height: 72 } },
        h(
          "div",
          { fontFamily: "Bricolage", fontSize: 40, color: C.navy },
          "leavema",
          h("span", { color: "#4F8A0E" }, "xx"),
          "ing",
        ),
      ),
      h("div", { fontSize: 24, fontWeight: 700, color: "#646F60" }, "leavemaxxing.com"),
    ),
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
      h(
        "div",
        { justifyContent: "space-between", alignItems: "flex-start" },
        h(
          "div",
          { flexDirection: "column", width: 780 },
          h("div", { fontSize: 28, fontWeight: 700, color: C.muted }, subtitle),
          h(
            "div",
            { fontFamily: "Bricolage", fontSize: 60, lineHeight: 1.05, color: C.ink, marginTop: 10 },
            title,
          ),
          plan
            ? h(
                "div",
                { fontFamily: "Bricolage", fontSize: 60, lineHeight: 1.05, color: C.lime, marginTop: 6 },
                `${plan.stats.leaveUsed} leave days, ${plan.stats.daysOff} days off`,
              )
            : h(
                "div",
                { fontFamily: "Bricolage", fontSize: 60, lineHeight: 1.05, color: C.lime, marginTop: 6 },
                "Way more time off.",
              ),
        ),
        plan
          ? h(
              "div",
              {
                width: 170,
                height: 170,
                borderRadius: 85,
                background: C.lime,
                color: C.limeInk,
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Bricolage",
                fontSize: 56,
                boxShadow: "0 0 0 14px rgba(139,209,47,0.18)",
              },
              `${plan.stats.multiplier.toFixed(1)}×`,
            )
          : h("div", {}),
      ),
      plan
        ? h("div", { position: "relative", height: 70, width: 992 }, ...strip)
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

  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: loadFonts(),
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
