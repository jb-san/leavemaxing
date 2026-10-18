import { describe, expect, it } from "vitest";
import { countText } from "~/i18n/format";
import { locales, replaceTokens, sidebarHeading, UKRAINE_MARTIAL_LAW_NOTICE } from "./locales";

const PLACEHOLDER = /\{[A-Za-z][A-Za-z0-9]*\}/;

/** Tokens each page field is actually given. A leftover means the page would print it. */
const FILLED: Record<string, Record<string, string | number>> = {
  pageTitle: { year: 2027, region: " Bayern", leave: 20, total: 47 },
  pageDescription: { year: 2027, region: " Bayern", leave: 20, total: 47 },
  h1: { year: 2027 },
  h1Region: { year: 2027, region: "Bayern" },
  intro: { year: 2027, budget: 20, total: 47, multiplier: "2.4" },
  holidaysHeading: { year: 2027 },
  bestPlansHeading: { year: 2027 },
  withBudget: { budget: 20 },
  extraRegional: { region: "Bayern", count: 3 },
};

const COUNT_KEYS = ["leaveDays", "daysOff", "totalDays"] as const;
type CountKey = (typeof COUNT_KEYS)[number];

function isCount(key: string): key is CountKey {
  return (COUNT_KEYS as readonly string[]).includes(key);
}

function filledKey(key: string): key is keyof typeof FILLED {
  return key in FILLED;
}

function strings(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => strings(item, `${prefix}.${index}`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      strings(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

describe("locale placeholders", () => {
  it("interpolates every {token} the pages render", () => {
    for (const [code, locale] of Object.entries(locales)) {
      for (const [path, text] of strings(locale.translations)) {
        const key = path.split(".").find((part) => filledKey(part) || isCount(part));
        let shown = text;
        if (key && isCount(key)) shown = countText(locale.lang, 1, locale.translations[key]);
        else if (key && filledKey(key)) shown = replaceTokens(text, FILLED[key] ?? {});
        expect(shown, `${code} ${path}`).not.toMatch(PLACEHOLDER);
      }
      const heading = sidebarHeading(locale.translations.bestPlansHeading, 2027);
      expect(heading, code).not.toMatch(PLACEHOLDER);
      expect(heading, code).not.toContain("2027");
      expect(heading.length, code).toBeGreaterThan(0);
    }
  });

  it("states the Ukraine martial-law notice without a placeholder", () => {
    expect(UKRAINE_MARTIAL_LAW_NOTICE).toMatch(/martial law/);
    expect(UKRAINE_MARTIAL_LAW_NOTICE).toMatch(/working days/);
    expect(UKRAINE_MARTIAL_LAW_NOTICE).not.toMatch(PLACEHOLDER);
    expect(locales["uk-UA"]?.translations.notice).toMatch(/воєнн/);
    expect(locales["uk-UA"]?.translations.notice).not.toMatch(PLACEHOLDER);
  });
});
