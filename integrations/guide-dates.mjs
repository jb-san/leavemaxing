// lastmod for travel guide URLs in the sitemap: each guide's `updated` date from its frontmatter, and
// for hubs and category pages the newest guide in that language. See docs/guides.md.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src/content/guides/", import.meta.url));
const SITE = "https://leavemaxxing.com";

/** @returns {Map<string, string>} absolute URL (guide pages) or hub prefix → YYYY-MM-DD */
function readDates() {
  const dates = new Map();
  for (const folder of readdirSync(ROOT)) {
    const prefix = folder === "en" ? "/guides/" : `/${folder}/guides/`;
    let newest = "";
    for (const name of readdirSync(join(ROOT, folder)).filter((file) => file.endsWith(".md"))) {
      const text = readFileSync(join(ROOT, folder, name), "utf8");
      if (/^draft:\s*true/m.test(text)) continue;
      const updated = /^updated:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(text)?.[1];
      if (!updated) continue;
      dates.set(`${SITE}${prefix}${name.replace(/\.md$/, "")}/`, updated);
      if (updated > newest) newest = updated;
    }
    if (newest) dates.set(`${SITE}${prefix}`, newest);
  }
  return dates;
}

const DATES = readDates();

/** lastmod for a sitemap URL, or undefined when it isn't a guide page. */
export function guideLastmod(url) {
  if (DATES.has(url)) return DATES.get(url);
  const hub =
    /^(https:\/\/leavemaxxing\.com\/(?:[a-z]{2}-[a-z]{2}\/)?guides\/)(?:category\/[a-z-]+\/)?$/.exec(
      url,
    )?.[1];
  return hub ? DATES.get(hub) : undefined;
}
