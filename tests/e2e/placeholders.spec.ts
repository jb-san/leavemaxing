import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures";

const PLACEHOLDER = /\{[A-Za-z][A-Za-z0-9]*\}/;

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

/**
 * Drop bundled scripts and styles, and island props: a localized planner gets its message
 * templates (such as "{n} leave days") as props, to fill in the browser. Keep JSON-LD, which is
 * page content.
 */
function visibleHtml(html: string): string {
  return html
    .replace(/<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/(<astro-island\b[^>]*?)\sprops="[^"]*"/gi, "$1");
}

test("built HTML has no leftover {placeholder} tokens", () => {
  test.skip(test.info().project.name !== "desktop", "scan the build once");
  const root = join(process.cwd(), "dist");
  const files = htmlFiles(root);
  expect(files.length).toBeGreaterThan(100);
  const hits: string[] = [];
  for (const file of files) {
    if (PLACEHOLDER.test(visibleHtml(readFileSync(file, "utf8")))) {
      hits.push(file.slice(root.length));
    }
  }
  expect(hits).toEqual([]);
});
