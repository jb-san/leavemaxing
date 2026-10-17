import type { Copy } from "../types";
import { nlNL } from "./nl-NL";

function be(value: string): string {
  return value
    .replaceAll("vakantiedagen", "verlofdagen")
    .replaceAll("vakantiedag", "verlofdag")
    .replaceAll("Vakantiedagen", "Verlofdagen")
    .replaceAll("vakantiejaar", "verlofjaar")
    .replaceAll("Vakantie", "Verlof")
    .replaceAll("vakantie", "verlof")
    .replaceAll("je werkgever", "je werkgever");
}

function walk<T>(value: T): T {
  if (typeof value === "string") return be(value) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = walk(item);
    return out as T;
  }
  return value;
}

const base = walk(nlNL);

export const nlBE: Copy = {
  ...base,
  home: {
    ...base.home,
    title: "Brugdagen in België: haal meer vrije dagen uit je verlof · leavemaxxing",
    description:
      "Kies hoeveel verlofdagen je hebt. leavemaxxing legt ze tegen weekenden en feestdagen, zodat elke dag in België een langere vrije periode oplevert.",
    h1: "Haal meer vrije tijd uit je verlofdagen",
  },
  best: {
    ...base.best,
    hero: "{flag} {name} maakt van {days} verlofdagen {off} vrije dagen in {year}.",
  },
  holiday: {
    ...base.holiday,
    bridgeNote: "Feestdagen op een dinsdag of donderdag zijn de beste brugdagen.",
  },
  about: {
    ...base.about,
    h1: "Zo plant leavemaxxing je verlof",
    title: "Zo plant leavemaxxing je verlof",
    li1: "We laden de feestdagen van België, en van je gemeenschap als die afwijkt.",
  },
};
