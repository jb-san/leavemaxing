import { fill } from "./index";

interface WarningCopy {
  locked: string;
  left: string;
  fit: string;
}

const COPY: Record<string, WarningCopy> = {
  en: {
    locked: "You've locked {locked} days, more than your {budget}-day budget.",
    left: "Only {left} workdays are left in this leave year, so {extra} days can't be placed.",
    fit: "{n} days didn't fit with your break limits, so they're left unplanned. Try a shorter minimum break.",
  },
  de: {
    locked: "Du hast {locked} Tage festgehalten, mehr als dein Budget von {budget} Tagen.",
    left: "In diesem Urlaubsjahr sind nur noch {left} Arbeitstage frei, {extra} Tage lassen sich nicht mehr legen.",
    fit: "{n} Tage passen nicht zu deinen Pausengrenzen und bleiben ungeplant. Versuch es mit einer kürzeren Mindestpause.",
  },
  sv: {
    locked: "Du har låst {locked} dagar, fler än din budget på {budget} dagar.",
    left: "Bara {left} arbetsdagar är kvar i det här semesteråret, så {extra} dagar får inte plats.",
    fit: "{n} dagar fick inte plats med dina gränser för ledigheten och ligger kvar oplanerade. Prova en kortare minsta ledighet.",
  },
  no: {
    locked: "Du har låst {locked} dager, flere enn budsjettet på {budget} dager.",
    left: "Bare {left} arbeidsdager er igjen i ferieåret, så {extra} dager får ikke plass.",
    fit: "{n} dager passet ikke med grensene dine og ble stående uplanlagt. Prøv en kortere minimumspause.",
  },
  da: {
    locked: "Du har låst {locked} dage, flere end dit budget på {budget} dage.",
    left: "Der er kun {left} arbejdsdage tilbage i ferieåret, så {extra} dage kan ikke placeres.",
    fit: "{n} dage passede ikke med dine grænser og er stadig uplanlagte. Prøv en kortere minimumspause.",
  },
  fi: {
    locked: "Olet lukinnut {locked} päivää, enemmän kuin {budget} päivän kiintiösi.",
    left: "Lomavuodessa on jäljellä vain {left} työpäivää, joten {extra} päivää ei mahdu.",
    fit: "{n} päivää ei mahtunut taukorajoihisi ja jäi suunnittelematta. Kokeile lyhyempää vähimmäistaukoa.",
  },
  pl: {
    locked: "Masz zablokowane {locked} dni, więcej niż budżet {budget} dni.",
    left: "W tym roku urlopowym zostało tylko {left} dni roboczych, więc {extra} dni nie da się ułożyć.",
    fit: "{n} dni nie zmieściło się w twoich limitach przerw i zostało niezaplanowane. Skróć minimalną przerwę.",
  },
  nl: {
    locked: "Je hebt {locked} dagen vastgezet, meer dan je budget van {budget} dagen.",
    left: "Er zijn nog maar {left} werkdagen over in dit verlofjaar, dus {extra} dagen passen niet.",
    fit: "{n} dagen pasten niet binnen je pauzelimieten en blijven ongepland. Probeer een kortere minimumpauze.",
  },
  fr: {
    locked: "Vous avez verrouillé {locked} jours, plus que votre budget de {budget} jours.",
    left: "Il ne reste que {left} jours ouvrés cette année, donc {extra} jours ne peuvent pas être placés.",
    fit: "{n} jours ne rentraient pas dans vos limites de pause et restent non planifiés. Essayez une pause minimale plus courte.",
  },
  es: {
    locked: "Has fijado {locked} días, más que tu presupuesto de {budget} días.",
    left: "Solo quedan {left} días laborables en este año, así que {extra} días no caben.",
    fit: "{n} días no encajaban con tus límites de descanso y quedan sin planear. Prueba un descanso mínimo más corto.",
  },
  it: {
    locked: "Hai bloccato {locked} giorni, più del budget di {budget} giorni.",
    left: "Restano solo {left} giorni lavorativi in quest'anno, quindi {extra} giorni non si possono mettere.",
    fit: "{n} giorni non entravano nei limiti delle pause e restano non pianificati. Prova una pausa minima più corta.",
  },
  pt: {
    locked: "Fixou {locked} dias, mais do que o orçamento de {budget} dias.",
    left: "Só restam {left} dias úteis neste ano, por isso {extra} dias não cabem.",
    fit: "{n} dias não cabiam nos limites das pausas e ficaram por planear. Experimente uma pausa mínima mais curta.",
  },
  cs: {
    locked: "Máte uzamčeno {locked} dní, víc než rozpočet {budget} dní.",
    left: "V tomto roce zbývá jen {left} pracovních dní, takže {extra} dní se nevejde.",
    fit: "{n} dní se nevešlo do limitů přestávek a zůstalo neplánovaných. Zkuste kratší minimální přestávku.",
  },
};

const LOCKED = /^You've locked (\d+) days, more than your (\d+)-day budget\.$/;
const LEFT = /^Only (\d+) workdays are left in this leave year, so (\d+) days can't be placed\.$/;
const FIT =
  /^(\d+) days didn't fit with your break limits, so they're left unplanned\. Try a shorter minimum break\.$/;

function packFor(locale: string): WarningCopy {
  const lang = locale.toLowerCase().startsWith("nb") ? "no" : (locale.split("-")[0] ?? "en");
  const pack = COPY[lang] ?? COPY.en;
  if (!pack) throw new Error(`Missing warning copy for ${locale}`);
  return pack;
}

/** Planner warnings are produced in English. Show them in the page language. */
export function translateWarning(locale: string, warning: string): string {
  if (!locale || locale === "en") return warning;
  const pack = packFor(locale);
  const locked = warning.match(LOCKED);
  if (locked) return fill(pack.locked, { locked: locked[1] ?? "", budget: locked[2] ?? "" });
  const left = warning.match(LEFT);
  if (left) return fill(pack.left, { left: left[1] ?? "", extra: left[2] ?? "" });
  const fit = warning.match(FIT);
  if (fit) return fill(pack.fit, { n: fit[1] ?? "" });
  return warning;
}
