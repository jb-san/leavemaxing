import { mascotSvg, moodFor } from "~/components/Mascot";
import { type DayNum, MONTHS_SHORT, parts } from "./dates";
import type { Plan } from "./planner/types";

export type CardFormat = "wide" | "story";

export const CARD_SIZE: Record<CardFormat, { w: number; h: number }> = {
  wide: { w: 1200, h: 630 },
  story: { w: 1080, h: 1350 },
};

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
const DISPLAY = '"Bricolage Grotesque Variable", "Avenir Next", system-ui, sans-serif';
const BODY = '"Plus Jakarta Sans Variable", "Avenir Next", system-ui, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export interface CardData {
  plan: Plan;
  place: string;
  flag: string;
  yearLabel: string;
  range: { start: DayNum; end: DayNum };
}

/** Draw the shareable summary card. Everything happens in the browser. */
export async function drawShareCard(
  canvas: HTMLCanvasElement,
  data: CardData,
  format: CardFormat,
): Promise<void> {
  const { w, h } = CARD_SIZE[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  await Promise.all([
    document.fonts.load(`800 80px ${DISPLAY}`),
    document.fonts.load(`600 24px ${BODY}`),
  ]).catch(() => {});
  const { stats } = data.plan;
  const mood = moodFor(stats.multiplier, stats.leaveUsed);
  const mascot = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvg(256, mood))}`,
  );

  const story = format === "story";
  const pad = story ? 72 : 56;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  // Header: mascot + wordmark
  const markSize = story ? 96 : 72;
  ctx.drawImage(mascot, pad, pad, markSize, markSize);
  ctx.fillStyle = C.navy;
  ctx.font = `800 ${story ? 48 : 40}px ${DISPLAY}`;
  ctx.textBaseline = "middle";
  const wordY = pad + markSize / 2 + 4;
  ctx.fillText("leavema", pad + markSize + 20, wordY);
  const wA = ctx.measureText("leavema").width;
  ctx.fillStyle = "#4F8A0E";
  ctx.fillText("xx", pad + markSize + 20 + wA, wordY);
  const wB = ctx.measureText("xx").width;
  ctx.fillStyle = C.navy;
  ctx.fillText("ing", pad + markSize + 20 + wA + wB, wordY);

  // Hero panel
  const top = pad + markSize + (story ? 56 : 32);
  const panelH = h - top - pad - (story ? 70 : 0);
  ctx.fillStyle = C.navy;
  roundRect(ctx, pad, top, w - pad * 2, panelH, story ? 56 : 44);

  const inner = pad + (story ? 64 : 48);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.muted;
  ctx.font = `600 ${story ? 34 : 26}px ${BODY}`;
  ctx.fillText(`${data.flag}  ${data.place} · ${data.yearLabel}`, inner, top + (story ? 100 : 76));

  const bigSize = story ? 112 : 76;
  ctx.font = `800 ${bigSize}px ${DISPLAY}`;
  ctx.fillStyle = C.ink;
  const line1Y = top + (story ? 100 : 76) + bigSize * 1.15;
  ctx.fillText(`${stats.leaveUsed} days of leave →`, inner, line1Y);
  ctx.fillStyle = C.lime;
  ctx.fillText(`${stats.daysOff} days off`, inner, line1Y + bigSize * 1.05);

  // Multiplier badge
  const r = story ? 120 : 92;
  const cx = story ? w - pad - 64 - r : w - pad - 48 - r;
  const cy = story ? line1Y + bigSize * 1.05 + 70 + r : top + 48 + r;
  ctx.fillStyle = "rgba(139,209,47,0.18)";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.lime;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.limeInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${story ? 84 : 62}px ${DISPLAY}`;
  ctx.fillText(`${stats.multiplier.toFixed(1)}×`, cx, cy + 4);
  ctx.textAlign = "left";

  if (story) {
    ctx.font = `600 34px ${BODY}`;
    ctx.fillStyle = C.muted;
    const lines = [`${stats.breaksWithLeave} breaks`, `longest ${stats.longest} days`];
    lines.forEach((l, i) => {
      ctx.fillText(l, inner, cy - 24 + i * 52);
    });
  }

  // Year strip
  const stripY = top + panelH - (story ? 130 : 96);
  const stripX = inner;
  const stripW = w - pad * 2 - (inner - pad) * 2;
  const span = data.range.end - data.range.start + 1;
  const xOf = (d: DayNum) => stripX + (Math.min(Math.max(d - data.range.start, 0), span) / span) * stripW;
  ctx.fillStyle = C.line;
  roundRect(ctx, stripX, stripY - 6, stripW, 12, 6);
  for (const b of data.plan.breaks) {
    if (b.end < data.range.start || b.start > data.range.end) continue;
    ctx.fillStyle = b.leave > 0 ? C.lime : "rgba(255,200,61,0.75)";
    const x0 = xOf(b.start);
    roundRect(ctx, x0, stripY - 16, Math.max(14, xOf(b.end + 1) - x0), 32, 16);
  }
  ctx.fillStyle = C.muted;
  ctx.font = `600 ${story ? 22 : 18}px ${BODY}`;
  ctx.textBaseline = "top";
  const sp = parts(data.range.start);
  for (let i = 0; i < 12; i += story ? 2 : 1) {
    const m0 = sp.month - 1 + i;
    const d = Date.UTC(sp.year + Math.floor(m0 / 12), m0 % 12, 1) / 86_400_000;
    ctx.fillText(MONTHS_SHORT[m0 % 12] ?? "", xOf(d), stripY + 28);
  }

  if (story) {
    ctx.fillStyle = C.navy;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 34px ${BODY}`;
    ctx.fillText("Plan yours at leavemaxxing.com", w / 2, h - pad - 20);
    ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "#646F60";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `700 24px ${BODY}`;
    ctx.fillText("leavemaxxing.com", w - pad, wordY);
    ctx.textAlign = "left";
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
