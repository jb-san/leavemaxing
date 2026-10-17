import type { Copy, Plural } from "../types";
import { deDE } from "./de-DE";

function swiss(value: string): string {
  return value
    .replaceAll("Urlaubsjahres", "Ferienjahres")
    .replaceAll("Urlaubsjahr", "Ferienjahr")
    .replaceAll("Urlaubstage", "Ferientage")
    .replaceAll("Urlaubstag", "Ferientag")
    .replaceAll("Urlaubstipp", "Ferientipp")
    .replaceAll("keinen Urlaub", "keine Ferien")
    .replaceAll("deinen Urlaub", "deine Ferien")
    .replaceAll("Dein Urlaub", "Deine Ferien")
    .replaceAll("Urlaub", "Ferien")
    .replaceAll("bundesweite Feiertage", "landesweite Feiertage")
    .replaceAll("Bundesländer", "Kantone")
    .replaceAll("Bundesland", "Kanton")
    .replaceAll("einzelnen Bundesländern", "einzelnen Kantonen")
    .replaceAll("deinem Arbeitgeber", "deinem Arbeitgeber");
}

function walk<T>(value: T): T {
  if (typeof value === "string") return swiss(value) as T;
  if (Array.isArray(value)) return value.map((item) => walk(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = walk(item);
    return out as T;
  }
  return value;
}

const base = walk(deDE);

export const deCH: Copy = {
  ...base,
  home: {
    ...base.home,
    title: "Brückentage planen: aus den Ferien mehr freie Tage machen · leavemaxxing",
    description:
      "Wähl deinen Kanton und wie viele Ferientage du hast. leavemaxxing legt sie an Wochenenden und Feiertage, damit aus jedem Tag in der Schweiz ein längerer freier Abschnitt wird.",
    h1: "Hol das Maximum aus deinen Ferientagen",
    regions: "Kantone",
  },
  best: {
    ...base.best,
    h1: "Wo die Ferien {year} am weitesten reichen",
    title: "Wo die Ferien {year} am weitesten reichen · leavemaxxing",
    hero: "{flag} {name} macht aus {days} Ferientagen {off} freie Tage im Jahr {year}.",
  },
  planner: {
    ...base.planner,
    wholeCountry: "Ganze Schweiz (landesweite Feiertage)",
    regionalHint: "Manche Feiertage gelten nur in einzelnen Kantonen. Wähl deinen für einen genauen Plan.",
    heroLeave: { one: "{n} Ferientag", few: "{n} Ferientage", many: "{n} Ferientage" } satisfies Plural,
  },
  about: {
    ...base.about,
    h1: "Wie leavemaxxing deine Ferien plant",
    title: "Wie leavemaxxing deine Ferien plant",
    li1: "Wir laden die gesetzlichen Feiertage der Schweiz und, wenn du einen wählst, deines Kantons.",
  },
};
