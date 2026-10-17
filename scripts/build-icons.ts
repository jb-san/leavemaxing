/** Renders the mascot mark into favicons and app icons in public/. Run with `pnpm icons`. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { mascotSvg } from "../src/components/Mascot";

const pub = new URL("../public", import.meta.url).pathname;
mkdirSync(join(pub, "icons"), { recursive: true });

const SAGE = "#EEF3EA";

function png(svg: string, size: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

/** The mark centred on a coloured square, `scale` = share of the canvas it fills. */
function padded(bg: string, scale: number, rounded = 0): string {
  const inner = mascotSvg(64)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "");
  const off = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rounded}" fill="${bg}"/><g transform="translate(${off} ${off}) scale(${scale})">${inner}</g></svg>`;
}

writeFileSync(join(pub, "favicon.svg"), mascotSvg(64));

// ICO with a single embedded 32px PNG.
const ico32 = png(mascotSvg(64), 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(ico32.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync(join(pub, "favicon.ico"), Buffer.concat([header, ico32]));

writeFileSync(join(pub, "apple-touch-icon.png"), png(padded(SAGE, 0.78), 180));
writeFileSync(join(pub, "icons/icon-192.png"), png(padded(SAGE, 0.82, 14), 192));
writeFileSync(join(pub, "icons/icon-512.png"), png(padded(SAGE, 0.82, 14), 512));
writeFileSync(join(pub, "icons/maskable-512.png"), png(padded(SAGE, 0.6), 512));
console.log("icons written");
