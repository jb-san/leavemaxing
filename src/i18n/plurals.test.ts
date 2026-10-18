import { describe, expect, it } from "vitest";
import { locales } from "~/data/locales";
import { countNoun, countText, pluralCategory } from "./format";
import { catalogs } from "./index";
import type { Plural } from "./types";

function isPlural(value: unknown): value is Plural {
  if (!value || typeof value !== "object") return false;
  const form = value as Partial<Plural>;
  return typeof form.one === "string" && typeof form.few === "string" && typeof form.many === "string";
}

function plurals(value: unknown, prefix = ""): Array<[string, Plural]> {
  if (isPlural(value)) return [[prefix, value]];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      plurals(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

describe("count plurals", () => {
  it("uses Intl categories, including French zero and Slavic few", () => {
    expect(pluralCategory("sv", 1)).toBe("one");
    expect(pluralCategory("sv", 2)).toBe("other");
    expect(pluralCategory("fr", 0)).toBe("one");
    expect(pluralCategory("fr", 1)).toBe("one");
    expect(pluralCategory("fr", 2)).toBe("other");
    expect(pluralCategory("pl", 1)).toBe("one");
    expect(pluralCategory("pl", 2)).toBe("few");
    expect(pluralCategory("pl", 5)).toBe("many");
    expect(pluralCategory("pl", 22)).toBe("few");
    expect(pluralCategory("pl", 12)).toBe("many");
    expect(pluralCategory("cs", 1)).toBe("one");
    expect(pluralCategory("cs", 2)).toBe("few");
    expect(pluralCategory("cs", 5)).toBe("other");
    expect(pluralCategory("uk", 1)).toBe("one");
    expect(pluralCategory("uk", 2)).toBe("few");
    expect(pluralCategory("uk", 5)).toBe("many");
    expect(pluralCategory("uk", 21)).toBe("one");
    expect(pluralCategory("uk", 11)).toBe("many");
  });

  it("says 1 semesterdag and 2 semesterdagar", () => {
    const planner = catalogs["sv-SE"]?.planner.leaveUnit;
    const page = locales["sv-SE"]?.translations.leaveDays;
    expect(planner && page).toBeTruthy();
    if (!planner || !page) return;
    expect(countNoun("sv", 1, planner)).toBe("1 semesterdag");
    expect(countNoun("sv", 2, planner)).toBe("2 semesterdagar");
    expect(countText("sv", 1, page)).toBe("1 semesterdag");
    expect(countText("sv", 5, page)).toBe("5 semesterdagar");
    expect(countText("sv", 1, locales["sv-SE"]?.translations.daysOff ?? page)).toBe("1 ledig dag");
    expect(countText("sv", 1, locales["sv-SE"]?.translations.totalDays ?? page)).toBe("1 dag ledigt");
  });

  it("uses Polish, Czech and Ukrainian few and many forms", () => {
    const pl = locales["pl-PL"]?.translations.daysOff;
    const cs = catalogs["cs-CZ"]?.planner.nDays;
    const uk = catalogs["uk-UA"]?.planner.leaveUnit;
    expect(pl && cs && uk).toBeTruthy();
    if (!pl || !cs || !uk) return;
    expect(countText("pl", 1, pl)).toBe("1 dzień wolny");
    expect(countText("pl", 2, pl)).toBe("2 dni wolne");
    expect(countText("pl", 5, pl)).toBe("5 dni wolnych");
    expect(countText("pl", 22, pl)).toBe("22 dni wolne");
    expect(countText("pl", 12, pl)).toBe("12 dni wolnych");
    expect(countText("cs", 1, cs)).toBe("1 den");
    expect(countText("cs", 2, cs)).toBe("2 dny");
    expect(countText("cs", 5, cs)).toBe("5 dní");
    expect(countNoun("uk", 1, uk)).toBe("1 день відпустки");
    expect(countNoun("uk", 2, uk)).toBe("2 дні відпустки");
    expect(countNoun("uk", 5, uk)).toBe("5 днів відпустки");
    expect(countNoun("uk", 21, uk)).toBe("21 день відпустки");
    expect(countNoun("uk", 11, uk)).toBe("11 днів відпустки");
  });

  it("treats French 0 and 1 as singular", () => {
    const days = catalogs["fr-FR"]?.planner.nDays;
    const be = catalogs["fr-BE"]?.planner.leaveUnit;
    expect(days && be).toBeTruthy();
    if (!days || !be) return;
    expect(countText("fr", 0, days)).toBe("0 jour");
    expect(countText("fr", 1, days)).toBe("1 jour");
    expect(countText("fr", 2, days)).toBe("2 jours");
    expect(countNoun("fr-BE", 1, be)).toBe("1 jour de congé");
    expect(countNoun("fr-BE", 2, be)).toBe("2 jours de congé");
  });

  it("gives every locale a plural form for every English count string", () => {
    const english = plurals(catalogs.en)
      .map(([path]) => path)
      .sort();
    expect(english.length).toBeGreaterThan(10);
    for (const [code, copy] of Object.entries(catalogs)) {
      expect(
        plurals(copy)
          .map(([path]) => path)
          .sort(),
        code,
      ).toEqual(english);
      for (const [path, forms] of plurals(copy)) {
        const text = countText(code === "en" ? "en" : code, 1, forms);
        expect(text, `${code} ${path}`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        expect(text.length, `${code} ${path}`).toBeGreaterThan(0);
      }
    }
    for (const [code, locale] of Object.entries(locales)) {
      for (const key of ["leaveDays", "daysOff", "totalDays"] as const) {
        const forms = locale.translations[key];
        expect(isPlural(forms), `${code} ${key}`).toBe(true);
        if (!isPlural(forms)) continue;
        const one = countText(locale.lang, 1, forms);
        const many = countText(locale.lang, 5, forms);
        expect(one, `${code} ${key}`).not.toMatch(/\{[A-Za-z]/);
        expect(many, `${code} ${key}`).not.toMatch(/\{[A-Za-z]/);
        if (forms.one !== forms.many) expect(one, `${code} ${key}`).not.toBe(many);
      }
    }
  });
});
