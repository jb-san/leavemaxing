#!/usr/bin/env node
/**
 * Submit every URL in the built sitemap to IndexNow (Bing, Yandex, Seznam, Naver, and others).
 *
 *   node scripts/indexnow.mjs [distDir]
 *
 * Reads dist/sitemap-index.xml (or any dist/sitemap*.xml), follows the child sitemaps
 * on disk, and POSTs the URLs in batches of at most 10,000. The key is the 32-hex file
 * in public/ (served at https://leavemaxxing.com/<key>.txt), or INDEXNOW_KEY.
 *
 * This never exits non-zero: a failed ping must not fail a deploy.
 * Set INDEXNOW_DRY_RUN=1 to print what would be sent, INDEXNOW_DELAY_MS to change the wait.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HOST = "leavemaxxing.com";
export const ENDPOINT = "https://api.indexnow.org/indexnow";
export const BATCH_SIZE = 10_000;
const KEY_FILE = /^([0-9a-f]{32})\.txt$/;

/** @param {string} xml */
export function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) =>
    (match[1] ?? "").replaceAll("&amp;", "&"),
  );
}

/** @param {string} xml */
export function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/.test(xml);
}

/**
 * Page URLs from the sitemaps in `dist`, following a sitemap index to the child files on disk.
 * @param {string} dist
 * @returns {string[]}
 */
export function collectUrls(dist) {
  const files = readdirSync(dist).filter((name) => /^sitemap.*\.xml$/.test(name));
  const seen = new Set();
  const visited = new Set();
  /** @param {string} name */
  const visit = (name) => {
    if (visited.has(name)) return;
    visited.add(name);
    const path = join(dist, name);
    if (!existsSync(path)) return;
    const xml = readFileSync(path, "utf8");
    if (isSitemapIndex(xml)) {
      for (const child of locs(xml)) visit(basename(new URL(child).pathname));
      return;
    }
    for (const url of locs(xml)) {
      if (new URL(url).host === HOST) seen.add(url);
    }
  };
  const indexes = files.filter((name) => name.includes("index"));
  for (const name of [...indexes, ...files]) visit(name);
  return [...seen];
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function batches(items, size = BATCH_SIZE) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** @param {string} dir */
export function findKey(dir) {
  if (!existsSync(dir)) return null;
  for (const name of readdirSync(dir)) {
    const match = name.match(KEY_FILE);
    if (match && readFileSync(join(dir, name), "utf8").trim() === match[1]) return match[1] ?? null;
  }
  return null;
}

/**
 * @param {string} key
 * @param {string[]} urlList
 */
export function payload(key, urlList) {
  return { host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList };
}

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const dist = process.argv[2] ?? join(root, "dist");
  const key = process.env.INDEXNOW_KEY || findKey(dist) || findKey(join(root, "public"));
  if (!key) {
    console.warn("IndexNow: no key file found, skipping.");
    return;
  }
  const urls = collectUrls(dist);
  if (urls.length === 0) {
    console.warn(`IndexNow: no URLs in ${dist}/sitemap*.xml, skipping.`);
    return;
  }
  if (process.env.INDEXNOW_DRY_RUN) {
    console.log(`IndexNow dry run: ${urls.length} URLs in ${batches(urls).length} batch(es), key ${key}.`);
    return;
  }
  const delay = Number(process.env.INDEXNOW_DELAY_MS ?? 20_000);
  if (delay > 0) {
    console.log(`IndexNow: waiting ${delay / 1000}s for the deploy to go live.`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  for (const [index, list] of batches(urls).entries()) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload(key, list)),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text().catch(() => "");
      const line = `IndexNow batch ${index + 1}: ${list.length} URLs, HTTP ${res.status}`;
      if (res.ok) console.log(line);
      else console.warn(`::warning::${line} ${text.slice(0, 300)}`);
    } catch (err) {
      console.warn(`::warning::IndexNow batch ${index + 1} failed: ${/** @type {Error} */ (err).message}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.warn(`::warning::IndexNow failed: ${err?.message ?? err}`);
  });
}
