import type { Copy } from "../types";
import { frFR } from "./fr-FR";

export const frBE: Copy = {
  ...frFR,
  home: {
    ...frFR.home,
    title: "Ponts en Belgique : tirez le maximum de vos jours de congé · leavemaxxing",
    description:
      "Indiquez vos jours de congé. leavemaxxing les cale sur les week-ends et les jours fériés belges pour que chaque jour posé allonge le repos.",
    h1: "Tirez le maximum de vos jours de congé",
    intro:
      "En Belgique, quelques ponts bien placés changent l’année. Choisissez le nombre de jours : le planificateur les pose à côté des fériés.",
  },
  planner: {
    ...frFR.planner,
    leaveYouHave: "Jours de congé dont vous disposez",
    leaveUnit: "jours de congé",
    heroLeave: { one: "{n} jour de congé", few: "{n} jours de congé", many: "{n} jours de congé" },
    leaveDay: { one: "jour de congé", few: "jours de congé", many: "jours de congé" },
    quipNone: "Indiquez vos jours de congé dans les réglages pour voir où tombent les repos.",
    quipRatio: "Cela fait {ratio} jours de repos par jour de congé.",
  },
  best: {
    ...frFR.best,
    hero: "{flag} {name} transforme {days} jours de congé en {off} jours de repos en {year}.",
    description:
      "{count} pays classés selon le repos que {days} jours de congé achètent en {year}, avec les jours fériés du pays et le meilleur plan.",
  },
  about: {
    ...frFR.about,
    h1: "Comment leavemaxxing pose vos congés en Belgique",
    title: "Comment leavemaxxing pose vos congés en Belgique",
    li1: "Nous chargeons les dix jours fériés légaux belges. Le jour de remplacement choisi dans votre secteur n’y figure pas.",
  },
};
