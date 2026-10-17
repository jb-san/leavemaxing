import { describe, expect, it } from "vitest";
import { locales } from "~/data/locales";
import { shouldIndexPage } from "~/data/sitemap-config";
import { shellAlternates } from "~/lib/hreflang";
import { catalogs, en } from "./index";
import {
  aboutAlternates,
  bestAlternates,
  contactAlternates,
  homeAlternates,
  localizedBestYears,
} from "./routes";
import { equivalentPath } from "./switcher";

function leaves(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("translation catalogs", () => {
  const expected = leaves(en).sort();

  it("includes English and every shipping locale", () => {
    expect(Object.keys(catalogs).sort()).toEqual(["en", ...Object.keys(locales)].sort());
  });

  it("gives every locale every English key", () => {
    for (const [code, copy] of Object.entries(catalogs)) {
      expect(leaves(copy).sort(), code).toEqual(expected);
    }
  });

  it("has no empty strings", () => {
    for (const [code, copy] of Object.entries(catalogs)) {
      for (const path of leaves(copy)) {
        const value = path.split(".").reduce<unknown>((node, key) => {
          if (!node || typeof node !== "object") return undefined;
          return (node as Record<string, unknown>)[key];
        }, copy);
        expect(typeof value === "string" ? value.trim().length : 1, `${code} ${path}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("home and ranking hreflang", () => {
  const site = "https://leavemaxxing.com";

  it("pairs every home with the English home and x-default", () => {
    const pages = homeAlternates(site);
    for (const page of pages) {
      const links = shellAlternates(pages);
      expect(links.find((link) => link.lang === page.lang)?.url).toBe(page.url);
      expect(links.find((link) => link.lang === "en")?.url).toBe(`${site}/`);
      expect(links.find((link) => link.lang === "x-default")?.url).toBe(`${site}/`);
      expect(links.filter((link) => link.lang === "de-DE").map((link) => link.url)).toEqual([
        `${site}/de-de/`,
      ]);
      expect(links.filter((link) => link.lang === "sv-SE").map((link) => link.url)).toEqual([
        `${site}/sv-se/`,
      ]);
      expect(links.filter((link) => link.lang === "fr-FR").map((link) => link.url)).toEqual([
        `${site}/fr-fr/`,
      ]);
    }
  });

  it("pairs localized ranking pages with the English ranking for the same year", () => {
    for (const year of localizedBestYears()) {
      const pages = bestAlternates(site, year);
      const links = shellAlternates(pages);
      expect(links.find((link) => link.lang === "x-default")?.url).toBe(`${site}/best/${year}/`);
      expect(links.find((link) => link.lang === "de-DE")?.url).toBe(`${site}/de-de/best/${year}/`);
      expect(links.find((link) => link.lang === "en")?.url).toBe(`${site}/best/${year}/`);
    }
  });

  it("pairs about and contact pages", () => {
    const about = shellAlternates(aboutAlternates(site));
    const contact = shellAlternates(contactAlternates(site));
    expect(about.find((link) => link.lang === "x-default")?.url).toBe(`${site}/about/`);
    expect(about.find((link) => link.lang === "fr-FR")?.url).toBe(`${site}/fr-fr/about/`);
    expect(contact.find((link) => link.lang === "sv-SE")?.url).toBe(`${site}/sv-se/contact/`);
  });

  it("switches between equivalent pages", () => {
    expect(equivalentPath("/", "de-DE")).toBe("/de-de/");
    expect(equivalentPath("/de-de/", "en")).toBe("/");
    expect(equivalentPath("/de-de/", "sv-SE")).toBe("/sv-se/");
    expect(equivalentPath("/best/2027/", "fr-FR")).toBe("/fr-fr/best/2027/");
    expect(equivalentPath("/fr-fr/best/2027/", "en")).toBe("/best/2027/");
    expect(equivalentPath("/de-de/brueckentage-2027/", "en")).toBe("/de/2027/");
    expect(equivalentPath("/de/2027/", "de-DE")).toBe("/de-de/brueckentage-2027/");
    expect(equivalentPath("/de-de/brueckentage-2027/bayern/", "sv-SE")).toBe("/sv-se/klamdagar-2027/");
    expect(equivalentPath("/fr-be/ponts-2027/", "nl-BE")).toBe("/nl-be/brugdagen-2027/");
    expect(equivalentPath("/de-de/about/", "en")).toBe("/about/");
  });
});

describe("sitemap for new locale shells", () => {
  it("keeps homes, rankings, about and contact indexable", () => {
    for (const code of Object.keys(locales)) {
      const slug = code.toLowerCase();
      expect(shouldIndexPage(`https://leavemaxxing.com/${slug}/`)).toBe(true);
      expect(shouldIndexPage(`https://leavemaxxing.com/${slug}/about/`)).toBe(true);
      expect(shouldIndexPage(`https://leavemaxxing.com/${slug}/contact/`)).toBe(true);
      for (const year of localizedBestYears()) {
        expect(shouldIndexPage(`https://leavemaxxing.com/${slug}/best/${year}/`)).toBe(true);
      }
    }
  });

  it("still drops plans, and years outside the index window stay out of country URLs", () => {
    expect(shouldIndexPage("https://leavemaxxing.com/va/2027/")).toBe(false);
    expect(shouldIndexPage("https://leavemaxxing.com/de/2025/")).toBe(false);
    expect(shouldIndexPage("https://leavemaxxing.com/de/2027/")).toBe(true);
  });
});
