import type { Copy } from "../types";
import { frFR } from "./fr-FR";

export const frLU: Copy = {
  ...frFR,
  home: {
    ...frFR.home,
    title: "Ponts au Luxembourg : tirez le maximum de vos 26 jours · leavemaxxing",
    description:
      "Au Luxembourg, le minimum légal est de 26 jours ouvrables. leavemaxxing les cale sur les fériés pour allonger le repos.",
    h1: "Tirez le maximum de vos jours de congé",
    intro:
      "Au Luxembourg, les ponts se jouent autour de l’Ascension et de la Fête nationale. Indiquez vos jours : le planificateur les place aux bonnes dates.",
  },
  planner: {
    ...frFR.planner,
    leaveYouHave: "Jours de congé dont vous disposez",
    leaveUnit: { one: "jour de congé", few: "jours de congé", many: "jours de congé" },
    heroLeave: { one: "{n} jour de congé", few: "{n} jours de congé", many: "{n} jours de congé" },
    leaveDay: { one: "jour de congé", few: "jours de congé", many: "jours de congé" },
  },
  about: {
    ...frFR.about,
    li1: "Nous chargeons les jours fériés légaux du Luxembourg, dont la Journée de l’Europe et la Fête nationale.",
    h1: "Comment leavemaxxing pose vos congés au Luxembourg",
    title: "Comment leavemaxxing pose vos congés au Luxembourg",
  },
};
