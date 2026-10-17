import type { Copy } from "../types";
import { deDE } from "./de-DE";

export const deAT: Copy = {
  ...deDE,
  home: {
    ...deDE.home,
    title: "Fenstertage planen: aus dem Urlaub mehr freie Tage machen · leavemaxxing",
    description:
      "Wähl dein Bundesland und wie viele Urlaubstage du hast. leavemaxxing legt sie an Wochenenden und Feiertage, damit aus jedem Tag in Österreich ein längerer freier Abschnitt wird.",
    step1Text: "Gesetzliche Feiertage für über 200 Länder, bis hinunter zum Bundesland.",
  },
  holiday: {
    ...deDE.holiday,
    bridgeNote: "Feiertage an einem Dienstag oder Donnerstag sind die besten Fenstertage.",
    tipMid: "Mitte der Woche: mit 2 Tagen das Fenster schließen",
  },
  about: {
    ...deDE.about,
    title: "Wie leavemaxxing deinen Urlaub plant",
    li1: "Wir laden die gesetzlichen Feiertage Österreichs und, wenn du eins wählst, deines Bundeslandes.",
  },
};
