import { locales, replaceTokens } from "~/data/locales";
import { en } from "./en";
import { csCZ } from "./locales/cs-CZ";
import { daDK } from "./locales/da-DK";
import { deAT } from "./locales/de-AT";
import { deCH } from "./locales/de-CH";
import { deDE } from "./locales/de-DE";
import { esES } from "./locales/es-ES";
import { fiFI } from "./locales/fi-FI";
import { frBE } from "./locales/fr-BE";
import { frFR } from "./locales/fr-FR";
import { frLU } from "./locales/fr-LU";
import { itIT } from "./locales/it-IT";
import { nbNO } from "./locales/nb-NO";
import { nlBE } from "./locales/nl-BE";
import { nlNL } from "./locales/nl-NL";
import { plPL } from "./locales/pl-PL";
import { ptPT } from "./locales/pt-PT";
import { svSE } from "./locales/sv-SE";
import type { Copy } from "./types";

export const catalogs: Record<string, Copy> = {
  en,
  "de-DE": deDE,
  "de-AT": deAT,
  "de-CH": deCH,
  "sv-SE": svSE,
  "nb-NO": nbNO,
  "da-DK": daDK,
  "fi-FI": fiFI,
  "pl-PL": plPL,
  "nl-NL": nlNL,
  "nl-BE": nlBE,
  "fr-FR": frFR,
  "fr-BE": frBE,
  "fr-LU": frLU,
  "es-ES": esES,
  "it-IT": itIT,
  "pt-PT": ptPT,
  "cs-CZ": csCZ,
};

export function normalizeLocale(code: string | undefined | null): string {
  if (!code) return "en";
  const hit = Object.keys(catalogs).find((key) => key.toLowerCase() === code.toLowerCase());
  return hit ?? "en";
}

export function getCopy(code: string | undefined | null): Copy {
  return catalogs[normalizeLocale(code)] ?? en;
}

/** BCP 47 tag used for dates and country names. */
export function intlLocale(code: string | undefined | null): string {
  const id = normalizeLocale(code);
  return id === "en" ? "en" : id;
}

/** date-holidays language for a UI locale. English stays on the English names. */
export function holidayLang(code: string | undefined | null): string | undefined {
  const id = normalizeLocale(code);
  if (id === "en") return undefined;
  return locales[id]?.lang;
}

export function fill(text: string, tokens: Record<string, string | number> = {}): string {
  return replaceTokens(text, tokens);
}

export type { Copy, Plural } from "./types";
export { en };
