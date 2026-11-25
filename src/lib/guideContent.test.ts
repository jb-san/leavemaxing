/**
 * Checks on the guide markdown itself (src/content/guides). The schema in src/content.config.ts
 * checks the frontmatter types at build time; these check what a schema can't.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILD_DATE } from "./buildDate";
import { parseGuideHref } from "./guideLinks";
import { wordCount } from "./guides";

const ROOT = new URL("../content/guides/", import.meta.url).pathname;
const FOLDERS: Record<string, string> = { en: "en", "sv-se": "sv-SE", "de-de": "de-DE" };

interface File {
  folder: string;
  slug: string;
  front: Record<string, string>;
  body: string;
}

function read(): File[] {
  return Object.keys(FOLDERS).flatMap((folder) => {
    let names: string[] = [];
    try {
      names = readdirSync(join(ROOT, folder)).filter((name) => name.endsWith(".md"));
    } catch {
      return [];
    }
    return names.map((name) => {
      const text = readFileSync(join(ROOT, folder, name), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
      const front: Record<string, string> = {};
      for (const line of (match?.[1] ?? "").split("\n")) {
        const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line);
        if (pair?.[1]) front[pair[1]] = (pair[2] ?? "").replace(/^"(.*)"$/, "$1");
      }
      return { folder, slug: name.replace(/\.md$/, ""), front, body: match?.[2] ?? "" };
    });
  });
}

const files = read();
const english = files.filter((file) => file.folder === "en");
const paths = new Set(
  files.map((file) =>
    file.folder === "en" ? `/guides/${file.slug}/` : `/${file.folder}/guides/${file.slug}/`,
  ),
);

/** Internal routes guides may link to besides other guides. */
const ROUTES = [
  /^\/$/,
  /^\/[a-z]{2}-[a-z]{2}\/$/,
  /^\/[a-z]{2}\/\d{4}\/$/,
  /^\/(?:sv-se\/klamdagar|de-de\/brueckentage)-(?:2027|2028)\/$/,
  /^\/de-de\/brueckentage-(?:2027|2028)\/(?:baden-wuerttemberg|bayern|berlin|brandenburg|hansestadt-bremen|hansestadt-hamburg|hessen|mecklenburg-vorpommern|niedersachsen|nordrhein-westfalen|rheinland-pfalz|saarland|sachsen|sachsen-anhalt|schleswig-holstein|thueringen)\/$/,
  /^\/(?:together|compare|plans)\/$/,
  /^\/(?:[a-z]{2}-[a-z]{2}\/)?guides\/(?:category\/[a-z-]+\/)?$/,
];

describe("guide content", () => {
  it("has the launch guides", () => {
    expect(english.length).toBeGreaterThanOrEqual(9);
  });

  it("matches folder, locale and slug rules", () => {
    for (const file of files) {
      expect(file.front.locale, file.slug).toBe(FOLDERS[file.folder]);
      expect(file.slug, file.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      if (file.folder === "en") expect(file.front.translationKey, file.slug).toBe(file.slug);
    }
  });

  it("pairs every translation with an English guide, once per language", () => {
    const keys = new Set(english.map((file) => file.slug));
    for (const file of files.filter((item) => item.folder !== "en")) {
      expect(keys.has(file.front.translationKey ?? ""), `${file.folder}/${file.slug}`).toBe(true);
    }
    for (const folder of Object.keys(FOLDERS)) {
      const own = files.filter((file) => file.folder === folder).map((file) => file.front.translationKey);
      expect(new Set(own).size, folder).toBe(own.length);
    }
  });

  it("is dated, never in the future, and updated on or after publishing", () => {
    for (const file of files) {
      const { published = "", updated = "" } = file.front;
      expect(published, file.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(updated >= published, file.slug).toBe(true);
      expect(updated <= BUILD_DATE, `${file.slug} updated ${updated} after the build date`).toBe(true);
    }
  });

  it("names no person: no author field and no first-person anecdotes", () => {
    for (const file of files) {
      expect(Object.keys(file.front), file.slug).not.toContain("author");
      expect(file.body, file.slug).not.toMatch(/\bwhen I (?:visited|went|was)\b/i);
    }
  });

  it("gives each English guide at least 1,000 words", () => {
    for (const file of english) expect(wordCount(file.body), file.slug).toBeGreaterThanOrEqual(1000);
  });

  it("writes partner links that parse", () => {
    for (const file of files) {
      for (const [, href] of file.body.matchAll(/\]\(((?:flights|stays|things):[^)]*)\)/g)) {
        expect(() => parseGuideHref(href ?? ""), `${file.slug}: ${href}`).not.toThrow();
      }
    }
  });

  it("links only to pages that exist", () => {
    for (const file of files) {
      for (const [, href = ""] of file.body.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        const isGuide = /\/guides\/(?!category\/)[^/]+\/$/.test(href);
        const ok = isGuide ? paths.has(href) : ROUTES.some((re) => re.test(href));
        expect(ok, `${file.folder}/${file.slug} links to ${href}`).toBe(true);
      }
    }
  });
});
