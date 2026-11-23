import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BATCH_SIZE, batches, collectUrls, findKey, HOST, payload } from "./indexnow.mjs";

const urlset = (urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((url) => `<url><loc>${url}</loc></url>`)
    .join("")}</urlset>`;

describe("IndexNow submission", () => {
  it("follows a sitemap index to the child sitemaps and drops duplicates and other hosts", () => {
    const dist = mkdtempSync(join(tmpdir(), "indexnow-"));
    writeFileSync(
      join(dist, "sitemap-index.xml"),
      `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://leavemaxxing.com/sitemap-0.xml</loc></sitemap><sitemap><loc>https://leavemaxxing.com/sitemap-1.xml</loc></sitemap></sitemapindex>`,
    );
    writeFileSync(
      join(dist, "sitemap-0.xml"),
      urlset(["https://leavemaxxing.com/", "https://leavemaxxing.com/de-de/brueckentage-2027/bayern/"]),
    );
    writeFileSync(
      join(dist, "sitemap-1.xml"),
      urlset([
        "https://leavemaxxing.com/",
        "https://example.com/elsewhere/",
        "https://leavemaxxing.com/a?b=1&amp;c=2",
      ]),
    );
    expect(collectUrls(dist)).toEqual([
      "https://leavemaxxing.com/",
      "https://leavemaxxing.com/de-de/brueckentage-2027/bayern/",
      "https://leavemaxxing.com/a?b=1&c=2",
    ]);
  });

  it("reads a single sitemap when there is no index", () => {
    const dist = mkdtempSync(join(tmpdir(), "indexnow-"));
    writeFileSync(join(dist, "sitemap.xml"), urlset(["https://leavemaxxing.com/se/2027/"]));
    expect(collectUrls(dist)).toEqual(["https://leavemaxxing.com/se/2027/"]);
  });

  it("batches at 10,000 URLs and builds the documented payload", () => {
    const urls = Array.from({ length: BATCH_SIZE + 5 }, (_, i) => `https://${HOST}/${i}/`);
    const parts = batches(urls);
    expect(parts.map((part) => part.length)).toEqual([BATCH_SIZE, 5]);
    expect(payload("k".repeat(32), ["https://leavemaxxing.com/"])).toEqual({
      host: "leavemaxxing.com",
      key: "k".repeat(32),
      keyLocation: `https://leavemaxxing.com/${"k".repeat(32)}.txt`,
      urlList: ["https://leavemaxxing.com/"],
    });
  });

  it("finds the key file in public/, and its content is the key", () => {
    const publicDir = join(process.cwd(), "public");
    const key = findKey(publicDir);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    const files = readdirSync(publicDir).filter((name) => /^[0-9a-f]{32}\.txt$/.test(name));
    expect(files).toEqual([`${key}.txt`]);
    expect(readFileSync(join(publicDir, `${key}.txt`), "utf8").trim()).toBe(key);

    const other = mkdtempSync(join(tmpdir(), "indexnow-"));
    mkdirSync(join(other, "nested"));
    writeFileSync(join(other, `${"a".repeat(32)}.txt`), "not the key");
    expect(findKey(other)).toBeNull();
  });
});
