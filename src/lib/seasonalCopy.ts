/**
 * Seasonal search copy. Titles lead with the local phrase and the year.
 * Tokens: {year} {where} {count} {leave} {total} {multiplier} {when} {holiday}
 * {length} {range} {budget} {date} {countries} {days} {off} {place} {topName} {topOff}
 */

export interface Forms {
  one: string;
  few?: string;
  many: string;
}

export interface SeasonalCopy {
  phrase: string;
  and: string;
  /** "days" counts each working day. "bridges" counts each gap, which is what ponts and long weekends are. */
  countKind: "days" | "bridges";
  title: string;
  regionTitle: string;
  description: Forms;
  bestTitle: string;
  bestDescription: string;
  updated: string;
  introCount: Forms;
  introBest: Forms;
  introBudget: string;
  introNone: string;
  qCount: string;
  aCount: Forms;
  aCountNone: string;
  qBest: string;
  aBest: Forms;
  aBestNone: string;
  qLongest: string;
  aLongest: Forms;
  aLongestNone: string;
  qBudget: string;
  aBudget: string;
  bestLead: string;
  bestLeadTop: string;
  bestFollow: string;
  bestMethod: string;
}

const deDays = "Arbeitstage, die einen Feiertag mit einem oder zwei Urlaubstagen ans Wochenende binden";

export const seasonalCopy: Record<string, SeasonalCopy> = {
  en: {
    phrase: "Bridge days",
    and: "and",
    countKind: "days",
    title: "Bridge days {year} {where}: longest time off",
    regionTitle: "Bridge days {year} {where}: longest time off",
    description: {
      one: "Bridge days {year} {where}: {count} bridge day, and {leave} leave days become {total} days off.",
      many: "Bridge days {year} {where}: {count} bridge days, and {leave} leave days become {total} days off.",
    },
    bestTitle: "Bridge days {year} {where}: where leave goes furthest",
    bestDescription:
      "Bridge days {year} {where}: {countries} countries ranked, and {days} leave days become {off} days off.",
    updated: "Last updated {date}",
    introCount: {
      one: "There is {count} bridge day {where} in {year}.",
      many: "There are {count} bridge days {where} in {year}.",
    },
    introBest: {
      one: "The best is {when}, next to {holiday}: one leave day gives {length} days off ({range}).",
      many: "The best is {when}, next to {holiday}: {leave} leave days give {length} days off ({range}).",
    },
    introBudget: "{budget} leave days reach {total} days off, a {multiplier}× return.",
    introNone:
      "There is no bridge day {where} in {year}. The public holidays already fall on a weekend or beside one.",
    qCount: "How many bridge days are there {where} in {year}?",
    aCount: {
      one: "There is {count} bridge day {where} in {year}: a working day that joins a public holiday to the weekend.",
      many: "There are {count} bridge days {where} in {year}: working days that join a public holiday to the weekend with one or two leave days.",
    },
    aCountNone:
      "There is no bridge day {where} in {year}. The public holidays already fall on a weekend or directly beside one.",
    qBest: "What is the best bridge day {where} in {year}?",
    aBest: {
      one: "The best is {when}, next to {holiday}. One leave day gives {length} days off, {range}.",
      many: "The best bridge is {when}, next to {holiday}. {leave} leave days give {length} days off, {range}.",
    },
    aBestNone: "No single bridge day stands out {where} in {year}.",
    qLongest: "How many leave days give the longest break {where} in {year}?",
    aLongest: {
      one: "The longest break takes {leave} leave day and runs for {length} days off, {range}.",
      many: "The longest break takes {leave} leave days and runs for {length} days off, {range}.",
    },
    aLongestNone: "With this calendar, no planned break runs longer than a normal weekend.",
    qBudget: "How many days off do {budget} leave days give {where} in {year}?",
    aBudget: "{budget} leave days {where} reach {total} days off in {year}, a {multiplier}× return.",
    bestLead: "{place} turns {days} leave days into {off} days off in {year}.",
    bestLeadTop: "{place} leads {year}: {days} leave days become {off} days off.",
    bestFollow: "{topName} leads the list with {topOff} days off.",
    bestMethod:
      "The ranking covers {countries} countries, using national holidays and the same plan everywhere.",
  },
  "sv-SE": {
    phrase: "Klämdagar",
    and: "och",
    countKind: "days",
    title: "Klämdagar {year}: alla klämdagar i Sverige och hur du får längst ledighet",
    regionTitle: "Klämdagar {year} {where}: längst ledighet",
    description: {
      one: "Klämdagar {year} {where}: {count} klämdag, och {leave} semesterdagar ger {total} lediga dagar.",
      many: "Klämdagar {year} {where}: {count} klämdagar, och {leave} semesterdagar ger {total} lediga dagar.",
    },
    bestTitle: "Klämdagar {year} {where}: var ledigheten räcker längst",
    bestDescription:
      "Klämdagar {year} {where}: {countries} länder, och {days} semesterdagar ger {off} lediga dagar.",
    updated: "Senast uppdaterad {date}",
    introCount: {
      one: "Det finns {count} klämdag {where} {year}.",
      many: "Det finns {count} klämdagar {where} {year}.",
    },
    introBest: {
      one: "Bäst är {when} vid {holiday}: en semesterdag ger {length} dagar ledigt ({range}).",
      many: "Bäst är {when} vid {holiday}: {leave} semesterdagar ger {length} dagar ledigt ({range}).",
    },
    introBudget: "Med {budget} semesterdagar blir det {total} lediga dagar, {multiplier}×.",
    introNone: "Det finns ingen klämdag {where} {year}, eftersom helgdagarna redan ligger vid en helg.",
    qCount: "Hur många klämdagar finns det {where} {year}?",
    aCount: {
      one: "Det finns {count} klämdag {where} {year}: en vardag som med en semesterdag kopplar en helgdag till helgen.",
      many: "Det finns {count} klämdagar {where} {year}: vardagar som med en eller två semesterdagar kopplar en helgdag till helgen.",
    },
    aCountNone:
      "Det finns inga klämdagar {where} {year}. Helgdagarna ligger redan på en helg eller direkt intill den.",
    qBest: "Vilken är den bästa klämdagen {where} {year}?",
    aBest: {
      one: "Den bästa är {when}, intill {holiday}. En semesterdag ger {length} dagar ledigt, {range}.",
      many: "Den bästa är {when}, intill {holiday}. {leave} semesterdagar ger {length} dagar ledigt, {range}.",
    },
    aBestNone: "Ingen enskild klämdag förlänger helgen {where} {year}.",
    qLongest: "Hur många semesterdagar ger den längsta ledigheten {where} {year}?",
    aLongest: {
      one: "Den längsta ledigheten tar {leave} semesterdag och ger {length} dagar ledigt, {range}.",
      many: "Den längsta ledigheten tar {leave} semesterdagar och ger {length} dagar ledigt, {range}.",
    },
    aLongestNone: "Med det här kalendariet blir det ingen längre ledighet än en vanlig helg.",
    qBudget: "Hur många lediga dagar ger {budget} semesterdagar {where} {year}?",
    aBudget: "{budget} semesterdagar {where} ger {total} lediga dagar {year}, en faktor på {multiplier}×.",
    bestLead: "{place} får {off} lediga dagar {year} av {days} semesterdagar.",
    bestLeadTop: "{place} leder {year}: {days} semesterdagar ger {off} lediga dagar.",
    bestFollow: "{topName} leder listan med {topOff} lediga dagar.",
    bestMethod: "Jämförelsen omfattar {countries} länder, med nationella helgdagar och samma plan.",
  },
  "de-DE": {
    phrase: "Brückentage",
    and: "und",
    countKind: "days",
    title: "Brückentage {year}: alle Brückentage in Deutschland",
    regionTitle: "Brückentage {year} {where}: längste Auszeit",
    description: {
      one: "Brückentage {year} {where}: {count} Brückentag, und aus {leave} Urlaubstagen werden {total} freie Tage.",
      many: "Brückentage {year} {where}: {count} Brückentage, und aus {leave} Urlaubstagen werden {total} freie Tage.",
    },
    bestTitle: "Brückentage {year} {where}: längste freie Zeit",
    bestDescription:
      "Brückentage {year} {where}: {countries} Länder, und aus {days} Urlaubstagen werden {off} freie Tage.",
    updated: "Zuletzt aktualisiert am {date}",
    introCount: {
      one: "Es gibt {count} Brückentag {where} im Jahr {year}.",
      many: "Es gibt {count} Brückentage {where} im Jahr {year}.",
    },
    introBest: {
      one: "Der beste ist der {when} neben {holiday}: ein Urlaubstag bringt {length} freie Tage ({range}).",
      many: "Der beste ist {when} neben {holiday}: {leave} Urlaubstage bringen {length} freie Tage ({range}).",
    },
    introBudget: "Mit {budget} Urlaubstagen werden es {total} freie Tage, ein Verhältnis von {multiplier}×.",
    introNone:
      "Es gibt keinen Brückentag {where} im Jahr {year}. Die Feiertage liegen schon am Wochenende oder direkt daneben.",
    qCount: "Wie viele Brückentage gibt es {year} {where}?",
    aCount: {
      one: "Es gibt {count} Brückentag {where} im Jahr {year}: einen Arbeitstag, der einen Feiertag mit dem Wochenende verbindet.",
      many: `Es gibt {count} Brückentage {where} im Jahr {year}: ${deDays}.`,
    },
    aCountNone:
      "Es gibt keinen Brückentag {where} im Jahr {year}. Die Feiertage liegen schon am Wochenende oder direkt daneben.",
    qBest: "Welcher ist der beste Brückentag {year} {where}?",
    aBest: {
      one: "Der beste ist der {when}, neben {holiday}. Ein Urlaubstag bringt {length} freie Tage, {range}.",
      many: "Der beste ist {when}, neben {holiday}. {leave} Urlaubstage bringen {length} freie Tage, {range}.",
    },
    aBestNone: "{year} verlängert {where} kein Brückentag das Wochenende.",
    qLongest: "Wie viele Urlaubstage braucht die längste freie Zeit {year} {where}?",
    aLongest: {
      one: "Die längste freie Zeit braucht {leave} Urlaubstag und dauert {length} Tage, {range}.",
      many: "Die längste freie Zeit braucht {leave} Urlaubstage und dauert {length} Tage, {range}.",
    },
    aLongestNone:
      "Mit diesem Kalender entsteht keine freie Zeit, die länger ist als ein normales Wochenende.",
    qBudget: "Wie viele freie Tage bringen {budget} Urlaubstage {year} {where}?",
    aBudget:
      "{budget} Urlaubstage bringen {where} im Jahr {year} {total} freie Tage, ein Verhältnis von {multiplier}×.",
    bestLead: "{place} macht aus {days} Urlaubstagen {off} freie Tage im Jahr {year}.",
    bestLeadTop: "{place} liegt {year} vorn: aus {days} Urlaubstagen werden {off} freie Tage.",
    bestFollow: "{topName} führt die Liste mit {topOff} freien Tagen an.",
    bestMethod: "Der Vergleich umfasst {countries} Länder, mit nationalen Feiertagen und demselben Plan.",
  },
  "de-AT": {
    phrase: "Fenstertage",
    and: "und",
    countKind: "days",
    title: "Fenstertage {year}: alle Fenstertage in Österreich",
    regionTitle: "Fenstertage {year} {where}: längste Auszeit",
    description: {
      one: "Fenstertage {year} {where}: {count} Fenstertag, und aus {leave} Urlaubstagen werden {total} freie Tage.",
      many: "Fenstertage {year} {where}: {count} Fenstertage, und aus {leave} Urlaubstagen werden {total} freie Tage.",
    },
    bestTitle: "Fenstertage {year} {where}: längste freie Zeit",
    bestDescription:
      "Fenstertage {year} {where}: {countries} Länder, und aus {days} Urlaubstagen werden {off} freie Tage.",
    updated: "Zuletzt aktualisiert am {date}",
    introCount: {
      one: "Es gibt {count} Fenstertag {where} im Jahr {year}.",
      many: "Es gibt {count} Fenstertage {where} im Jahr {year}.",
    },
    introBest: {
      one: "Der beste ist der {when} neben {holiday}: ein Urlaubstag bringt {length} freie Tage ({range}).",
      many: "Der beste ist {when} neben {holiday}: {leave} Urlaubstage bringen {length} freie Tage ({range}).",
    },
    introBudget: "Mit {budget} Urlaubstagen werden es {total} freie Tage, ein Verhältnis von {multiplier}×.",
    introNone:
      "Es gibt keinen Fenstertag {where} im Jahr {year}. Die Feiertage liegen schon am Wochenende oder direkt daneben.",
    qCount: "Wie viele Fenstertage gibt es {year} {where}?",
    aCount: {
      one: "Es gibt {count} Fenstertag {where} im Jahr {year}: einen Arbeitstag, der einen Feiertag mit dem Wochenende verbindet.",
      many: "Es gibt {count} Fenstertage {where} im Jahr {year}: Arbeitstage, die einen Feiertag mit einem oder zwei Urlaubstagen ans Wochenende binden.",
    },
    aCountNone:
      "Es gibt keinen Fenstertag {where} im Jahr {year}. Die Feiertage liegen schon am Wochenende oder direkt daneben.",
    qBest: "Welcher ist der beste Fenstertag {year} {where}?",
    aBest: {
      one: "Der beste ist der {when}, neben {holiday}. Ein Urlaubstag bringt {length} freie Tage, {range}.",
      many: "Der beste ist {when}, neben {holiday}. {leave} Urlaubstage bringen {length} freie Tage, {range}.",
    },
    aBestNone: "{year} verlängert {where} kein Fenstertag das Wochenende.",
    qLongest: "Wie viele Urlaubstage braucht die längste freie Zeit {year} {where}?",
    aLongest: {
      one: "Die längste freie Zeit braucht {leave} Urlaubstag und dauert {length} Tage, {range}.",
      many: "Die längste freie Zeit braucht {leave} Urlaubstage und dauert {length} Tage, {range}.",
    },
    aLongestNone:
      "Mit diesem Kalender entsteht keine freie Zeit, die länger ist als ein normales Wochenende.",
    qBudget: "Wie viele freie Tage bringen {budget} Urlaubstage {year} {where}?",
    aBudget:
      "{budget} Urlaubstage bringen {where} im Jahr {year} {total} freie Tage, ein Verhältnis von {multiplier}×.",
    bestLead: "{place} macht aus {days} Urlaubstagen {off} freie Tage im Jahr {year}.",
    bestLeadTop: "{place} liegt {year} vorn: aus {days} Urlaubstagen werden {off} freie Tage.",
    bestFollow: "{topName} führt die Liste mit {topOff} freien Tagen an.",
    bestMethod: "Der Vergleich umfasst {countries} Länder, mit nationalen Feiertagen und demselben Plan.",
  },
  "de-CH": {
    phrase: "Brückentage",
    and: "und",
    countKind: "days",
    title: "Brückentage {year}: alle Brückentage in der Schweiz",
    regionTitle: "Brückentage {year} {where}: längste freie Zeit",
    description: {
      one: "Brückentage {year} {where}: {count} Brückentag, und aus {leave} Ferientagen werden {total} freie Tage.",
      many: "Brückentage {year} {where}: {count} Brückentage, und aus {leave} Ferientagen werden {total} freie Tage.",
    },
    bestTitle: "Brückentage {year} {where}: längste freie Zeit",
    bestDescription:
      "Brückentage {year} {where}: {countries} Länder, und aus {days} Ferientagen werden {off} freie Tage.",
    updated: "Zuletzt aktualisiert am {date}",
    introCount: {
      one: "Es gibt {count} Brückentag {where} im Jahr {year}.",
      many: "Es gibt {count} Brückentage {where} im Jahr {year}.",
    },
    introBest: {
      one: "Der beste ist der {when} neben {holiday}: ein Ferientag bringt {length} freie Tage ({range}).",
      many: "Der beste ist {when} neben {holiday}: {leave} Ferientage bringen {length} freie Tage ({range}).",
    },
    introBudget: "Mit {budget} Ferientagen werden es {total} freie Tage, ein Verhältnis von {multiplier}×.",
    introNone:
      "Es gibt keinen Brückentag {where} im Jahr {year}. Die Feiertage liegen schon am Wochenende oder direkt daneben.",
    qCount: "Wie viele Brückentage gibt es {year} {where}?",
    aCount: {
      one: "Es gibt {count} Brückentag {where} im Jahr {year}: einen Arbeitstag, der einen Feiertag mit dem Wochenende verbindet.",
      many: "Es gibt {count} Brückentage {where} im Jahr {year}: Arbeitstage, die einen Feiertag mit einem oder zwei Ferientagen ans Wochenende binden.",
    },
    aCountNone:
      "Es gibt keinen Brückentag {where} im Jahr {year}. Die Feiertage liegen schon am Wochenende oder direkt daneben.",
    qBest: "Welcher ist der beste Brückentag {year} {where}?",
    aBest: {
      one: "Der beste ist der {when}, neben {holiday}. Ein Ferientag bringt {length} freie Tage, {range}.",
      many: "Der beste ist {when}, neben {holiday}. {leave} Ferientage bringen {length} freie Tage, {range}.",
    },
    aBestNone: "{year} verlängert {where} kein Brückentag das Wochenende.",
    qLongest: "Wie viele Ferientage braucht die längste freie Zeit {year} {where}?",
    aLongest: {
      one: "Die längste freie Zeit braucht {leave} Ferientag und dauert {length} Tage, {range}.",
      many: "Die längste freie Zeit braucht {leave} Ferientage und dauert {length} Tage, {range}.",
    },
    aLongestNone:
      "Mit diesem Kalender entsteht keine freie Zeit, die länger ist als ein normales Wochenende.",
    qBudget: "Wie viele freie Tage bringen {budget} Ferientage {year} {where}?",
    aBudget:
      "{budget} Ferientage bringen {where} im Jahr {year} {total} freie Tage, ein Verhältnis von {multiplier}×.",
    bestLead: "{place} macht aus {days} Ferientagen {off} freie Tage im Jahr {year}.",
    bestLeadTop: "{place} liegt {year} vorn: aus {days} Ferientagen werden {off} freie Tage.",
    bestFollow: "{topName} führt die Liste mit {topOff} freien Tagen an.",
    bestMethod: "Der Vergleich umfasst {countries} Länder, mit nationalen Feiertagen und demselben Plan.",
  },
  "nb-NO": {
    phrase: "Inneklemte dager",
    and: "og",
    countKind: "days",
    title: "Inneklemte dager {year}: alle inneklemte dager i Norge",
    regionTitle: "Inneklemte dager {year} {where}: lengst ferie",
    description: {
      one: "Inneklemte dager {year} {where}: {count} inneklemt dag, og {leave} feriedager gir {total} ledige dager.",
      many: "Inneklemte dager {year} {where}: {count} inneklemte dager, og {leave} feriedager gir {total} ledige dager.",
    },
    bestTitle: "Inneklemte dager {year} {where}: der ferien rekker lengst",
    bestDescription:
      "Inneklemte dager {year} {where}: {countries} land, og {days} feriedager gir {off} ledige dager.",
    updated: "Sist oppdatert {date}",
    introCount: {
      one: "Det er {count} inneklemt dag {where} i {year}.",
      many: "Det er {count} inneklemte dager {where} i {year}.",
    },
    introBest: {
      one: "Den beste er {when} ved {holiday}: én feriedag gir {length} dager fri ({range}).",
      many: "Den beste er {when} ved {holiday}: {leave} feriedager gir {length} dager fri ({range}).",
    },
    introBudget: "Med {budget} feriedager blir det {total} ledige dager, {multiplier}×.",
    introNone:
      "Det er ingen inneklemt dag {where} i {year}, fordi helligdagene allerede ligger inntil en helg.",
    qCount: "Hvor mange inneklemte dager er det {where} i {year}?",
    aCount: {
      one: "Det er {count} inneklemt dag {where} i {year}: en virkedag som med én feriedag kobler en helligdag til helgen.",
      many: "Det er {count} inneklemte dager {where} i {year}: virkedager som med én eller to feriedager kobler en helligdag til helgen.",
    },
    aCountNone:
      "Det er ingen inneklemte dager {where} i {year}. Helligdagene faller allerede i en helg eller rett inntil.",
    qBest: "Hvilken er den beste inneklemte dagen {where} i {year}?",
    aBest: {
      one: "Den beste er {when}, ved {holiday}. Én feriedag gir {length} dager fri, {range}.",
      many: "Den beste er {when}, ved {holiday}. {leave} feriedager gir {length} dager fri, {range}.",
    },
    aBestNone: "Ingen enkelt inneklemt dag forlenger helgen {where} i {year}.",
    qLongest: "Hvor mange feriedager gir den lengste friperioden {where} i {year}?",
    aLongest: {
      one: "Den lengste friperioden tar {leave} feriedag og gir {length} dager fri, {range}.",
      many: "Den lengste friperioden tar {leave} feriedager og gir {length} dager fri, {range}.",
    },
    aLongestNone: "Med denne kalenderen blir ingen friperiode lenger enn en vanlig helg.",
    qBudget: "Hvor mange ledige dager gir {budget} feriedager {where} i {year}?",
    aBudget: "{budget} feriedager {where} gir {total} ledige dager i {year}, en faktor på {multiplier}×.",
    bestLead: "{place} får {off} ledige dager i {year} av {days} feriedager.",
    bestLeadTop: "{place} leder {year}: {days} feriedager gir {off} ledige dager.",
    bestFollow: "{topName} leder listen med {topOff} ledige dager.",
    bestMethod: "Sammenligningen dekker {countries} land, med nasjonale helligdager og samme plan.",
  },
  "da-DK": {
    phrase: "Klemmedage",
    and: "og",
    countKind: "days",
    title: "Klemmedage {year}: alle klemmedage i Danmark",
    regionTitle: "Klemmedage {year} {where}: længst ferie",
    description: {
      one: "Klemmedage {year} {where}: {count} klemmedag, og {leave} feriedage giver {total} fridage.",
      many: "Klemmedage {year} {where}: {count} klemmedage, og {leave} feriedage giver {total} fridage.",
    },
    bestTitle: "Klemmedage {year} {where}: hvor ferien rækker længst",
    bestDescription: "Klemmedage {year} {where}: {countries} lande, og {days} feriedage giver {off} fridage.",
    updated: "Sidst opdateret {date}",
    introCount: {
      one: "Der er {count} klemmedag {where} i {year}.",
      many: "Der er {count} klemmedage {where} i {year}.",
    },
    introBest: {
      one: "Den bedste er {when} ved {holiday}: én feriedag giver {length} dage fri ({range}).",
      many: "Den bedste er {when} ved {holiday}: {leave} feriedage giver {length} dage fri ({range}).",
    },
    introBudget: "Med {budget} feriedage bliver det til {total} fridage, {multiplier}×.",
    introNone:
      "Der er ingen klemmedag {where} i {year}, fordi helligdagene allerede ligger op ad en weekend.",
    qCount: "Hvor mange klemmedage er der {where} i {year}?",
    aCount: {
      one: "Der er {count} klemmedag {where} i {year}: en hverdag der med én feriedag kobler en helligdag til weekenden.",
      many: "Der er {count} klemmedage {where} i {year}: hverdage der med én eller to feriedage kobler en helligdag til weekenden.",
    },
    aCountNone:
      "Der er ingen klemmedage {where} i {year}. Helligdagene falder allerede i en weekend eller lige op ad.",
    qBest: "Hvilken er den bedste klemmedag {where} i {year}?",
    aBest: {
      one: "Den bedste er {when}, ved {holiday}. Én feriedag giver {length} dage fri, {range}.",
      many: "Den bedste er {when}, ved {holiday}. {leave} feriedage giver {length} dage fri, {range}.",
    },
    aBestNone: "Ingen enkelt klemmedag forlænger weekenden {where} i {year}.",
    qLongest: "Hvor mange feriedage giver den længste friperiode {where} i {year}?",
    aLongest: {
      one: "Den længste friperiode tager {leave} feriedag og giver {length} dage fri, {range}.",
      many: "Den længste friperiode tager {leave} feriedage og giver {length} dage fri, {range}.",
    },
    aLongestNone: "Med denne kalender bliver ingen friperiode længere end en almindelig weekend.",
    qBudget: "Hvor mange fridage giver {budget} feriedage {where} i {year}?",
    aBudget: "{budget} feriedage {where} giver {total} fridage i {year}, en faktor på {multiplier}×.",
    bestLead: "{place} får {off} fridage i {year} af {days} feriedage.",
    bestLeadTop: "{place} fører {year}: {days} feriedage giver {off} fridage.",
    bestFollow: "{topName} fører listen med {topOff} fridage.",
    bestMethod: "Sammenligningen dækker {countries} lande, med nationale helligdage og den samme plan.",
  },
  "fi-FI": {
    phrase: "Välipäivät",
    and: "ja",
    countKind: "days",
    title: "Välipäivät {year}: kaikki välipäivät Suomessa",
    regionTitle: "Välipäivät {year} {where}: pisin loma",
    description: {
      one: "Välipäivät {year} {where}: {count} välipäivä, ja {leave} lomapäivää tuottaa {total} vapaapäivää.",
      many: "Välipäivät {year} {where}: {count} välipäivää, ja {leave} lomapäivää tuottaa {total} vapaapäivää.",
    },
    bestTitle: "Välipäivät {year} {where}: missä loma riittää pisimmälle",
    bestDescription:
      "Välipäivät {year} {where}: {countries} maata, ja {days} lomapäivää tuottaa {off} vapaapäivää.",
    updated: "Päivitetty {date}",
    introCount: {
      one: "{where} on {count} välipäivä vuonna {year}.",
      many: "{where} on {count} välipäivää vuonna {year}.",
    },
    introBest: {
      one: "Paras on {when} ({holiday}): yksi lomapäivä antaa {length} vapaapäivää ({range}).",
      many: "Paras on {when} ({holiday}): {leave} lomapäivää antaa {length} vapaapäivää ({range}).",
    },
    introBudget: "{budget} lomapäivällä kertyy {total} vapaapäivää, kerroin {multiplier}×.",
    introNone:
      "{where} ei ole välipäivää vuonna {year}, koska pyhäpäivät osuvat jo viikonloppuun tai sen viereen.",
    qCount: "Kuinka monta välipäivää on {where} vuonna {year}?",
    aCount: {
      one: "{where} on {count} välipäivä vuonna {year}: arkipäivä, joka yhdellä lomapäivällä yhdistää pyhäpäivän viikonloppuun.",
      many: "{where} on {count} välipäivää vuonna {year}: arkipäiviä, jotka yhdellä tai kahdella lomapäivällä yhdistävät pyhäpäivän viikonloppuun.",
    },
    aCountNone:
      "{where} ei ole välipäiviä vuonna {year}. Pyhäpäivät osuvat jo viikonloppuun tai sen viereen.",
    qBest: "Mikä on paras välipäivä {where} vuonna {year}?",
    aBest: {
      one: "Paras on {when} ({holiday}). Yksi lomapäivä antaa {length} vapaapäivää, {range}.",
      many: "Paras on {when} ({holiday}). {leave} lomapäivää antaa {length} vapaapäivää, {range}.",
    },
    aBestNone: "Yksikään välipäivä ei pidennä viikonloppua {where} vuonna {year}.",
    qLongest: "Kuinka monta lomapäivää pisin vapaa vaatii {where} vuonna {year}?",
    aLongest: {
      one: "Pisin vapaa vie {leave} lomapäivän ja kestää {length} päivää, {range}.",
      many: "Pisin vapaa vie {leave} lomapäivää ja kestää {length} päivää, {range}.",
    },
    aLongestNone: "Tällä kalenterilla mikään vapaa ei kestä tavallista viikonloppua pidempään.",
    qBudget: "Kuinka monta vapaapäivää {budget} lomapäivää antaa {where} vuonna {year}?",
    aBudget: "{budget} lomapäivää antaa {where} {total} vapaapäivää vuonna {year}, kerroin {multiplier}×.",
    bestLead: "{place} saa {off} vapaapäivää vuonna {year} {days} lomapäivällä.",
    bestLeadTop: "{place} johtaa vuonna {year}: {days} lomapäivää antaa {off} vapaapäivää.",
    bestFollow: "{topName} johtaa listaa {topOff} vapaapäivällä.",
    bestMethod: "Vertailussa on {countries} maata, kansalliset pyhäpäivät ja sama suunnitelma.",
  },
  "pl-PL": {
    phrase: "Długie weekendy",
    and: "i",
    countKind: "bridges",
    title: "Długie weekendy {year}: wszystkie długie weekendy w Polsce",
    regionTitle: "Długie weekendy {year} {where}: najdłuższy urlop",
    description: {
      one: "Długie weekendy {year} {where}: {count} długi weekend, a {leave} dni urlopu daje {total} dni wolnych.",
      few: "Długie weekendy {year} {where}: {count} długie weekendy, a {leave} dni urlopu daje {total} dni wolnych.",
      many: "Długie weekendy {year} {where}: {count} długich weekendów, a {leave} dni urlopu daje {total} dni wolnych.",
    },
    bestTitle: "Długie weekendy {year} {where}: najdłuższy urlop",
    bestDescription:
      "Długie weekendy {year} {where}: {countries} krajów, a {days} dni urlopu daje {off} dni wolnych.",
    updated: "Ostatnia aktualizacja: {date}",
    introCount: {
      one: "W {year} roku jest {count} długi weekend {where}.",
      few: "W {year} roku są {count} długie weekendy {where}.",
      many: "W {year} roku jest {count} długich weekendów {where}.",
    },
    introBest: {
      one: "Najlepszy wypada {when}, przy {holiday}: jeden dzień urlopu daje {length} dni wolnych ({range}).",
      few: "Najlepszy wypada {when}, przy {holiday}: {leave} dni urlopu dają {length} dni wolnych ({range}).",
      many: "Najlepszy wypada {when}, przy {holiday}: {leave} dni urlopu daje {length} dni wolnych ({range}).",
    },
    introBudget: "{budget} dni urlopu daje {total} dni wolnych, współczynnik {multiplier}×.",
    introNone:
      "W {year} nie ma długiego weekendu {where}, bo święta wypadają już w weekend albo tuż przy nim.",
    qCount: "Ile długich weekendów jest {where} w {year}?",
    aCount: {
      one: "W {year} roku jest {count} długi weekend {where}: dzień albo dwa dni urlopu łączą święto z weekendem.",
      few: "W {year} roku są {count} długie weekendy {where}: dzień albo dwa dni urlopu łączą święto z weekendem.",
      many: "W {year} roku jest {count} długich weekendów {where}: dzień albo dwa dni urlopu łączą święto z weekendem.",
    },
    aCountNone: "W {year} nie ma długiego weekendu {where}. Święta wypadają już w weekend albo tuż przy nim.",
    qBest: "Który długi weekend jest najlepszy {where} w {year}?",
    aBest: {
      one: "Najlepszy wypada {when}, przy {holiday}. Jeden dzień urlopu daje {length} dni wolnych, {range}.",
      few: "Najlepszy wypada {when}, przy {holiday}. {leave} dni urlopu dają {length} dni wolnych, {range}.",
      many: "Najlepszy wypada {when}, przy {holiday}. {leave} dni urlopu daje {length} dni wolnych, {range}.",
    },
    aBestNone: "W {year} żaden długi weekend nie wydłuża weekendu {where}.",
    qLongest: "Ile dni urlopu daje najdłuższą przerwę {where} w {year}?",
    aLongest: {
      one: "Najdłuższa przerwa zabiera {leave} dzień urlopu i trwa {length} dni, {range}.",
      few: "Najdłuższa przerwa zabiera {leave} dni urlopu i trwa {length} dni, {range}.",
      many: "Najdłuższa przerwa zabiera {leave} dni urlopu i trwa {length} dni, {range}.",
    },
    aLongestNone: "Przy tym kalendarzu żadna przerwa nie jest dłuższa niż zwykły weekend.",
    qBudget: "Ile dni wolnych daje {budget} dni urlopu {where} w {year}?",
    aBudget: "{budget} dni urlopu daje {where} {total} dni wolnych w {year}, współczynnik {multiplier}×.",
    bestLead: "{place} ma {off} dni wolnych w {year} z {days} dni urlopu.",
    bestLeadTop: "{place} prowadzi w {year}: {days} dni urlopu daje {off} dni wolnych.",
    bestFollow: "{topName} prowadzi z {topOff} dniami wolnymi.",
    bestMethod: "Zestawienie obejmuje {countries} krajów, święta krajowe i ten sam plan.",
  },
  "nl-NL": {
    phrase: "Brugdagen",
    and: "en",
    countKind: "days",
    title: "Brugdagen {year}: alle brugdagen in Nederland",
    regionTitle: "Brugdagen {year} {where}: langste vakantie",
    description: {
      one: "Brugdagen {year} {where}: {count} brugdag, en {leave} vakantiedagen geven {total} vrije dagen.",
      many: "Brugdagen {year} {where}: {count} brugdagen, en {leave} vakantiedagen geven {total} vrije dagen.",
    },
    bestTitle: "Brugdagen {year} {where}: de langste vakantie",
    bestDescription:
      "Brugdagen {year} {where}: {countries} landen, en {days} vakantiedagen geven {off} vrije dagen.",
    updated: "Laatst bijgewerkt op {date}",
    introCount: {
      one: "Er is {count} brugdag {where} in {year}.",
      many: "Er zijn {count} brugdagen {where} in {year}.",
    },
    introBest: {
      one: "De beste is {when}, naast {holiday}: één vakantiedag levert {length} vrije dagen op ({range}).",
      many: "De beste is {when}, naast {holiday}: {leave} vakantiedagen leveren {length} vrije dagen op ({range}).",
    },
    introBudget: "Met {budget} vakantiedagen kom je op {total} vrije dagen, een factor {multiplier}×.",
    introNone:
      "Er is geen brugdag {where} in {year}, omdat de feestdagen al in een weekend of er direct tegenaan vallen.",
    qCount: "Hoeveel brugdagen zijn er {where} in {year}?",
    aCount: {
      one: "Er is {count} brugdag {where} in {year}: een werkdag die een feestdag met één vakantiedag aan het weekend koppelt.",
      many: "Er zijn {count} brugdagen {where} in {year}: werkdagen die een feestdag met één of twee vakantiedagen aan het weekend koppelen.",
    },
    aCountNone:
      "Er zijn geen brugdagen {where} in {year}. De feestdagen vallen al in een weekend of er direct tegenaan.",
    qBest: "Wat is de beste brugdag {where} in {year}?",
    aBest: {
      one: "De beste is {when}, naast {holiday}. Eén vakantiedag levert {length} vrije dagen op, {range}.",
      many: "De beste is {when}, naast {holiday}. {leave} vakantiedagen leveren {length} vrije dagen op, {range}.",
    },
    aBestNone: "Geen enkele brugdag verlengt het weekend {where} in {year}.",
    qLongest: "Hoeveel vakantiedagen geven de langste vrije periode {where} in {year}?",
    aLongest: {
      one: "De langste vrije periode kost {leave} vakantiedag en duurt {length} dagen, {range}.",
      many: "De langste vrije periode kost {leave} vakantiedagen en duurt {length} dagen, {range}.",
    },
    aLongestNone: "Met deze kalender duurt geen vrije periode langer dan een gewoon weekend.",
    qBudget: "Hoeveel vrije dagen geven {budget} vakantiedagen {where} in {year}?",
    aBudget: "{budget} vakantiedagen geven {where} {total} vrije dagen in {year}, een factor {multiplier}×.",
    bestLead: "{place} haalt {off} vrije dagen in {year} uit {days} vakantiedagen.",
    bestLeadTop: "{place} staat bovenaan in {year}: {days} vakantiedagen geven {off} vrije dagen.",
    bestFollow: "{topName} leidt de lijst met {topOff} vrije dagen.",
    bestMethod: "De vergelijking telt {countries} landen, met nationale feestdagen en hetzelfde plan.",
  },
  "nl-BE": {
    phrase: "Brugdagen",
    and: "en",
    countKind: "days",
    title: "Brugdagen {year}: alle brugdagen in België",
    regionTitle: "Brugdagen {year} {where}: langste verlof",
    description: {
      one: "Brugdagen {year} {where}: {count} brugdag, en {leave} verlofdagen geven {total} vrije dagen.",
      many: "Brugdagen {year} {where}: {count} brugdagen, en {leave} verlofdagen geven {total} vrije dagen.",
    },
    bestTitle: "Brugdagen {year} {where}: waar verlof het verst reikt",
    bestDescription:
      "Brugdagen {year} {where}: {countries} landen, en {days} verlofdagen geven {off} vrije dagen.",
    updated: "Laatst bijgewerkt op {date}",
    introCount: {
      one: "Er is {count} brugdag {where} in {year}.",
      many: "Er zijn {count} brugdagen {where} in {year}.",
    },
    introBest: {
      one: "De beste is {when}, naast {holiday}: één verlofdag levert {length} vrije dagen op ({range}).",
      many: "De beste is {when}, naast {holiday}: {leave} verlofdagen leveren {length} vrije dagen op ({range}).",
    },
    introBudget: "Met {budget} verlofdagen kom je aan {total} vrije dagen, een factor {multiplier}×.",
    introNone:
      "Er is geen brugdag {where} in {year}, omdat de feestdagen al in een weekend of er direct tegenaan vallen.",
    qCount: "Hoeveel brugdagen zijn er {where} in {year}?",
    aCount: {
      one: "Er is {count} brugdag {where} in {year}: een werkdag die een feestdag met één verlofdag aan het weekend koppelt.",
      many: "Er zijn {count} brugdagen {where} in {year}: werkdagen die een feestdag met één of twee verlofdagen aan het weekend koppelen.",
    },
    aCountNone:
      "Er zijn geen brugdagen {where} in {year}. De feestdagen vallen al in een weekend of er direct tegenaan.",
    qBest: "Wat is de beste brugdag {where} in {year}?",
    aBest: {
      one: "De beste is {when}, naast {holiday}. Eén verlofdag levert {length} vrije dagen op, {range}.",
      many: "De beste is {when}, naast {holiday}. {leave} verlofdagen leveren {length} vrije dagen op, {range}.",
    },
    aBestNone: "Geen enkele brugdag verlengt het weekend {where} in {year}.",
    qLongest: "Hoeveel verlofdagen geven de langste vrije periode {where} in {year}?",
    aLongest: {
      one: "De langste vrije periode kost {leave} verlofdag en duurt {length} dagen, {range}.",
      many: "De langste vrije periode kost {leave} verlofdagen en duurt {length} dagen, {range}.",
    },
    aLongestNone: "Met deze kalender duurt geen vrije periode langer dan een gewoon weekend.",
    qBudget: "Hoeveel vrije dagen geven {budget} verlofdagen {where} in {year}?",
    aBudget: "{budget} verlofdagen geven {where} {total} vrije dagen in {year}, een factor {multiplier}×.",
    bestLead: "{place} haalt {off} vrije dagen in {year} uit {days} verlofdagen.",
    bestLeadTop: "{place} staat bovenaan in {year}: {days} verlofdagen geven {off} vrije dagen.",
    bestFollow: "{topName} leidt de lijst met {topOff} vrije dagen.",
    bestMethod: "De vergelijking telt {countries} landen, met nationale feestdagen en hetzelfde plan.",
  },
  "fr-FR": {
    phrase: "Ponts",
    and: "et",
    countKind: "bridges",
    title: "Ponts {year} : tous les ponts en France",
    regionTitle: "Ponts {year} {where} : le plus long repos",
    description: {
      one: "Ponts {year} {where} : {count} pont, et {leave} jours de congés donnent {total} jours de repos.",
      many: "Ponts {year} {where} : {count} ponts, et {leave} jours de congés donnent {total} jours de repos.",
    },
    bestTitle: "Ponts {year} {where} : où les congés vont le plus loin",
    bestDescription:
      "Ponts {year} {where} : {countries} pays, et {days} jours de congés donnent {off} jours de repos.",
    updated: "Dernière mise à jour le {date}",
    introCount: {
      one: "Il y a {count} pont {where} en {year}.",
      many: "Il y a {count} ponts {where} en {year}.",
    },
    introBest: {
      one: "Le meilleur est {when}, à côté de {holiday} : un jour de congé donne {length} jours de repos ({range}).",
      many: "Le meilleur est {when}, à côté de {holiday} : {leave} jours de congés donnent {length} jours de repos ({range}).",
    },
    introBudget: "Avec {budget} jours de congés, vous arrivez à {total} jours de repos, soit {multiplier}×.",
    introNone:
      "Il n'y a pas de pont {where} en {year} : les fériés tombent déjà un week-end ou juste à côté.",
    qCount: "Combien de ponts y a-t-il {where} en {year} ?",
    aCount: {
      one: "Il y a {count} pont {where} en {year} : un jour de congé qui relie un jour férié au week-end.",
      many: "Il y a {count} ponts {where} en {year} : un ou deux jours de congé qui relient un jour férié au week-end.",
    },
    aCountNone:
      "Il n'y a pas de pont {where} en {year}. Les jours fériés tombent déjà un week-end ou juste à côté.",
    qBest: "Quel est le meilleur pont {where} en {year} ?",
    aBest: {
      one: "Le meilleur est {when}, à côté de {holiday}. Un jour de congé donne {length} jours de repos, {range}.",
      many: "Le meilleur est {when}, à côté de {holiday}. {leave} jours de congés donnent {length} jours de repos, {range}.",
    },
    aBestNone: "Aucun pont ne prolonge le week-end {where} en {year}.",
    qLongest: "Combien de jours de congés donnent la plus longue pause {where} en {year} ?",
    aLongest: {
      one: "La plus longue pause prend {leave} jour de congé et dure {length} jours, {range}.",
      many: "La plus longue pause prend {leave} jours de congés et dure {length} jours, {range}.",
    },
    aLongestNone: "Avec ce calendrier, aucune pause ne dépasse un week-end ordinaire.",
    qBudget: "Combien de jours de repos donnent {budget} jours de congés {where} en {year} ?",
    aBudget: "{budget} jours de congés donnent {where} {total} jours de repos en {year}, soit {multiplier}×.",
    bestLead: "{place} transforme {days} jours de congés en {off} jours de repos en {year}.",
    bestLeadTop: "{place} mène en {year} : {days} jours de congés donnent {off} jours de repos.",
    bestFollow: "{topName} mène la liste avec {topOff} jours de repos.",
    bestMethod: "Le classement couvre {countries} pays, avec les fériés nationaux et le même plan.",
  },
  "fr-BE": {
    phrase: "Ponts",
    and: "et",
    countKind: "bridges",
    title: "Ponts {year} en Belgique : le plus long repos",
    regionTitle: "Ponts {year} {where} : le plus long repos",
    description: {
      one: "Ponts {year} {where} : {count} pont, et {leave} jours de congé donnent {total} jours de repos.",
      many: "Ponts {year} {where} : {count} ponts, et {leave} jours de congé donnent {total} jours de repos.",
    },
    bestTitle: "Ponts {year} {where} : où les congés vont le plus loin",
    bestDescription:
      "Ponts {year} {where} : {countries} pays, et {days} jours de congé donnent {off} jours de repos.",
    updated: "Dernière mise à jour le {date}",
    introCount: {
      one: "Il y a {count} pont {where} en {year}.",
      many: "Il y a {count} ponts {where} en {year}.",
    },
    introBest: {
      one: "Le meilleur est {when}, à côté de {holiday} : un jour de congé donne {length} jours de repos ({range}).",
      many: "Le meilleur est {when}, à côté de {holiday} : {leave} jours de congé donnent {length} jours de repos ({range}).",
    },
    introBudget: "Avec {budget} jours de congé, vous arrivez à {total} jours de repos, soit {multiplier}×.",
    introNone:
      "Il n'y a pas de pont {where} en {year} : les fériés tombent déjà un week-end ou juste à côté.",
    qCount: "Combien de ponts y a-t-il {where} en {year} ?",
    aCount: {
      one: "Il y a {count} pont {where} en {year} : un jour de congé qui relie un jour férié au week-end.",
      many: "Il y a {count} ponts {where} en {year} : un ou deux jours de congé qui relient un jour férié au week-end.",
    },
    aCountNone:
      "Il n'y a pas de pont {where} en {year}. Les jours fériés tombent déjà un week-end ou juste à côté.",
    qBest: "Quel est le meilleur pont {where} en {year} ?",
    aBest: {
      one: "Le meilleur est {when}, à côté de {holiday}. Un jour de congé donne {length} jours de repos, {range}.",
      many: "Le meilleur est {when}, à côté de {holiday}. {leave} jours de congé donnent {length} jours de repos, {range}.",
    },
    aBestNone: "Aucun pont ne prolonge le week-end {where} en {year}.",
    qLongest: "Combien de jours de congé donnent la plus longue pause {where} en {year} ?",
    aLongest: {
      one: "La plus longue pause prend {leave} jour de congé et dure {length} jours, {range}.",
      many: "La plus longue pause prend {leave} jours de congé et dure {length} jours, {range}.",
    },
    aLongestNone: "Avec ce calendrier, aucune pause ne dépasse un week-end ordinaire.",
    qBudget: "Combien de jours de repos donnent {budget} jours de congé {where} en {year} ?",
    aBudget: "{budget} jours de congé donnent {where} {total} jours de repos en {year}, soit {multiplier}×.",
    bestLead: "{place} transforme {days} jours de congé en {off} jours de repos en {year}.",
    bestLeadTop: "{place} mène en {year} : {days} jours de congé donnent {off} jours de repos.",
    bestFollow: "{topName} mène la liste avec {topOff} jours de repos.",
    bestMethod: "Le classement couvre {countries} pays, avec les fériés nationaux et le même plan.",
  },
  "fr-LU": {
    phrase: "Ponts",
    and: "et",
    countKind: "bridges",
    title: "Ponts {year} au Luxembourg : le plus long repos",
    regionTitle: "Ponts {year} {where} : le plus long repos",
    description: {
      one: "Ponts {year} {where} : {count} pont, et {leave} jours de congé donnent {total} jours de repos.",
      many: "Ponts {year} {where} : {count} ponts, et {leave} jours de congé donnent {total} jours de repos.",
    },
    bestTitle: "Ponts {year} {where} : où les congés vont le plus loin",
    bestDescription:
      "Ponts {year} {where} : {countries} pays, et {days} jours de congé donnent {off} jours de repos.",
    updated: "Dernière mise à jour le {date}",
    introCount: {
      one: "Il y a {count} pont {where} en {year}.",
      many: "Il y a {count} ponts {where} en {year}.",
    },
    introBest: {
      one: "Le meilleur est {when}, à côté de {holiday} : un jour de congé donne {length} jours de repos ({range}).",
      many: "Le meilleur est {when}, à côté de {holiday} : {leave} jours de congé donnent {length} jours de repos ({range}).",
    },
    introBudget: "Avec {budget} jours de congé, vous arrivez à {total} jours de repos, soit {multiplier}×.",
    introNone:
      "Il n'y a pas de pont {where} en {year} : les fériés tombent déjà un week-end ou juste à côté.",
    qCount: "Combien de ponts y a-t-il {where} en {year} ?",
    aCount: {
      one: "Il y a {count} pont {where} en {year} : un jour de congé qui relie un jour férié au week-end.",
      many: "Il y a {count} ponts {where} en {year} : un ou deux jours de congé qui relient un jour férié au week-end.",
    },
    aCountNone:
      "Il n'y a pas de pont {where} en {year}. Les jours fériés tombent déjà un week-end ou juste à côté.",
    qBest: "Quel est le meilleur pont {where} en {year} ?",
    aBest: {
      one: "Le meilleur est {when}, à côté de {holiday}. Un jour de congé donne {length} jours de repos, {range}.",
      many: "Le meilleur est {when}, à côté de {holiday}. {leave} jours de congé donnent {length} jours de repos, {range}.",
    },
    aBestNone: "Aucun pont ne prolonge le week-end {where} en {year}.",
    qLongest: "Combien de jours de congé donnent la plus longue pause {where} en {year} ?",
    aLongest: {
      one: "La plus longue pause prend {leave} jour de congé et dure {length} jours, {range}.",
      many: "La plus longue pause prend {leave} jours de congé et dure {length} jours, {range}.",
    },
    aLongestNone: "Avec ce calendrier, aucune pause ne dépasse un week-end ordinaire.",
    qBudget: "Combien de jours de repos donnent {budget} jours de congé {where} en {year} ?",
    aBudget: "{budget} jours de congé donnent {where} {total} jours de repos en {year}, soit {multiplier}×.",
    bestLead: "{place} transforme {days} jours de congé en {off} jours de repos en {year}.",
    bestLeadTop: "{place} mène en {year} : {days} jours de congé donnent {off} jours de repos.",
    bestFollow: "{topName} mène la liste avec {topOff} jours de repos.",
    bestMethod: "Le classement couvre {countries} pays, avec les fériés nationaux et le même plan.",
  },
  "es-ES": {
    phrase: "Puentes",
    and: "y",
    countKind: "bridges",
    title: "Puentes {year}: todos los puentes en España",
    regionTitle: "Puentes {year} {where}: más días libres",
    description: {
      one: "Puentes {year} {where}: {count} puente, y {leave} días de vacaciones dan {total} días libres.",
      many: "Puentes {year} {where}: {count} puentes, y {leave} días de vacaciones dan {total} días libres.",
    },
    bestTitle: "Puentes {year} {where}: el descanso más largo",
    bestDescription:
      "Puentes {year} {where}: {countries} países, y {days} días de vacaciones dan {off} días libres.",
    updated: "Última actualización: {date}",
    introCount: {
      one: "Hay {count} puente {where} en {year}.",
      many: "Hay {count} puentes {where} en {year}.",
    },
    introBest: {
      one: "El mejor es {when}, junto a {holiday}: un día de vacaciones da {length} días libres ({range}).",
      many: "El mejor es {when}, junto a {holiday}: {leave} días de vacaciones dan {length} días libres ({range}).",
    },
    introBudget: "Con {budget} días de vacaciones llegas a {total} días libres, un {multiplier}×.",
    introNone: "No hay puente {where} en {year}: los festivos ya caen en fin de semana o justo al lado.",
    qCount: "¿Cuántos puentes hay {where} en {year}?",
    aCount: {
      one: "Hay {count} puente {where} en {year}: un día laborable que une un festivo al fin de semana.",
      many: "Hay {count} puentes {where} en {year}: uno o dos días laborables que unen un festivo al fin de semana.",
    },
    aCountNone: "No hay puente {where} en {year}. Los festivos ya caen en fin de semana o justo al lado.",
    qBest: "¿Cuál es el mejor puente {where} en {year}?",
    aBest: {
      one: "El mejor es {when}, junto a {holiday}. Un día de vacaciones da {length} días libres, {range}.",
      many: "El mejor es {when}, junto a {holiday}. {leave} días de vacaciones dan {length} días libres, {range}.",
    },
    aBestNone: "Ningún puente alarga el fin de semana {where} en {year}.",
    qLongest: "¿Cuántos días de vacaciones dan el descanso más largo {where} en {year}?",
    aLongest: {
      one: "El descanso más largo usa {leave} día de vacaciones y dura {length} días, {range}.",
      many: "El descanso más largo usa {leave} días de vacaciones y dura {length} días, {range}.",
    },
    aLongestNone: "Con este calendario, ningún descanso supera un fin de semana normal.",
    qBudget: "¿Cuántos días libres dan {budget} días de vacaciones {where} en {year}?",
    aBudget: "{budget} días de vacaciones dan {where} {total} días libres en {year}, un {multiplier}×.",
    bestLead: "{place} convierte {days} días de vacaciones en {off} días libres en {year}.",
    bestLeadTop: "{place} lidera {year}: {days} días de vacaciones dan {off} días libres.",
    bestFollow: "{topName} encabeza la lista con {topOff} días libres.",
    bestMethod: "La comparación incluye {countries} países, con festivos nacionales y el mismo plan.",
  },
  "it-IT": {
    phrase: "Ponti",
    and: "e",
    countKind: "bridges",
    title: "Ponti {year}: tutti i ponti in Italia",
    regionTitle: "Ponti {year} {where}: il riposo più lungo",
    description: {
      one: "Ponti {year} {where}: {count} ponte, e {leave} giorni di ferie danno {total} giorni liberi.",
      many: "Ponti {year} {where}: {count} ponti, e {leave} giorni di ferie danno {total} giorni liberi.",
    },
    bestTitle: "Ponti {year} {where}: dove le ferie arrivano più lontano",
    bestDescription:
      "Ponti {year} {where}: {countries} paesi, e {days} giorni di ferie danno {off} giorni liberi.",
    updated: "Ultimo aggiornamento: {date}",
    introCount: {
      one: "C'è {count} ponte {where} nel {year}.",
      many: "Ci sono {count} ponti {where} nel {year}.",
    },
    introBest: {
      one: "Il migliore è {when}, accanto a {holiday}: un giorno di ferie dà {length} giorni liberi ({range}).",
      many: "Il migliore è {when}, accanto a {holiday}: {leave} giorni di ferie danno {length} giorni liberi ({range}).",
    },
    introBudget: "Con {budget} giorni di ferie arrivi a {total} giorni liberi, {multiplier}×.",
    introNone: "Non c'è un ponte {where} nel {year}: le feste cadono già nel weekend o subito accanto.",
    qCount: "Quanti ponti ci sono {where} nel {year}?",
    aCount: {
      one: "C'è {count} ponte {where} nel {year}: un giorno lavorativo che unisce una festa al weekend.",
      many: "Ci sono {count} ponti {where} nel {year}: uno o due giorni lavorativi che uniscono una festa al weekend.",
    },
    aCountNone: "Non ci sono ponti {where} nel {year}. Le feste cadono già nel weekend o subito accanto.",
    qBest: "Qual è il ponte migliore {where} nel {year}?",
    aBest: {
      one: "Il migliore è {when}, accanto a {holiday}. Un giorno di ferie dà {length} giorni liberi, {range}.",
      many: "Il migliore è {when}, accanto a {holiday}. {leave} giorni di ferie danno {length} giorni liberi, {range}.",
    },
    aBestNone: "Nessun ponte allunga il weekend {where} nel {year}.",
    qLongest: "Quanti giorni di ferie danno la pausa più lunga {where} nel {year}?",
    aLongest: {
      one: "La pausa più lunga usa {leave} giorno di ferie e dura {length} giorni, {range}.",
      many: "La pausa più lunga usa {leave} giorni di ferie e dura {length} giorni, {range}.",
    },
    aLongestNone: "Con questo calendario nessuna pausa supera un weekend normale.",
    qBudget: "Quanti giorni liberi danno {budget} giorni di ferie {where} nel {year}?",
    aBudget: "{budget} giorni di ferie danno {where} {total} giorni liberi nel {year}, {multiplier}×.",
    bestLead: "{place} trasforma {days} giorni di ferie in {off} giorni liberi nel {year}.",
    bestLeadTop: "{place} è in testa nel {year}: {days} giorni di ferie danno {off} giorni liberi.",
    bestFollow: "{topName} guida la lista con {topOff} giorni liberi.",
    bestMethod: "Il confronto copre {countries} paesi, con le feste nazionali e lo stesso piano.",
  },
  "pt-PT": {
    phrase: "Pontes",
    and: "e",
    countKind: "bridges",
    title: "Pontes {year}: todas as pontes em Portugal",
    regionTitle: "Pontes {year} {where}: o descanso mais longo",
    description: {
      one: "Pontes {year} {where}: {count} ponte, e {leave} dias de férias dão {total} dias de descanso.",
      many: "Pontes {year} {where}: {count} pontes, e {leave} dias de férias dão {total} dias de descanso.",
    },
    bestTitle: "Pontes {year} {where}: onde as férias vão mais longe",
    bestDescription:
      "Pontes {year} {where}: {countries} países, e {days} dias de férias dão {off} dias de descanso.",
    updated: "Última atualização: {date}",
    introCount: {
      one: "Há {count} ponte {where} em {year}.",
      many: "Há {count} pontes {where} em {year}.",
    },
    introBest: {
      one: "A melhor é {when}, ao lado de {holiday}: um dia de férias dá {length} dias de descanso ({range}).",
      many: "A melhor é {when}, ao lado de {holiday}: {leave} dias de férias dão {length} dias de descanso ({range}).",
    },
    introBudget: "Com {budget} dias de férias chegas a {total} dias de descanso, {multiplier}×.",
    introNone: "Não há ponte {where} em {year}: os feriados já calham ao fim de semana ou mesmo ao lado.",
    qCount: "Quantas pontes há {where} em {year}?",
    aCount: {
      one: "Há {count} ponte {where} em {year}: um dia útil que liga um feriado ao fim de semana.",
      many: "Há {count} pontes {where} em {year}: um ou dois dias úteis que ligam um feriado ao fim de semana.",
    },
    aCountNone: "Não há pontes {where} em {year}. Os feriados já calham ao fim de semana ou mesmo ao lado.",
    qBest: "Qual é a melhor ponte {where} em {year}?",
    aBest: {
      one: "A melhor é {when}, ao lado de {holiday}. Um dia de férias dá {length} dias de descanso, {range}.",
      many: "A melhor é {when}, ao lado de {holiday}. {leave} dias de férias dão {length} dias de descanso, {range}.",
    },
    aBestNone: "Nenhuma ponte alonga o fim de semana {where} em {year}.",
    qLongest: "Quantos dias de férias dão o descanso mais longo {where} em {year}?",
    aLongest: {
      one: "O descanso mais longo usa {leave} dia de férias e dura {length} dias, {range}.",
      many: "O descanso mais longo usa {leave} dias de férias e dura {length} dias, {range}.",
    },
    aLongestNone: "Com este calendário, nenhum descanso passa de um fim de semana normal.",
    qBudget: "Quantos dias de descanso dão {budget} dias de férias {where} em {year}?",
    aBudget: "{budget} dias de férias dão {where} {total} dias de descanso em {year}, {multiplier}×.",
    bestLead: "{place} transforma {days} dias de férias em {off} dias de descanso em {year}.",
    bestLeadTop: "{place} lidera em {year}: {days} dias de férias dão {off} dias de descanso.",
    bestFollow: "{topName} lidera a lista com {topOff} dias de descanso.",
    bestMethod: "A comparação cobre {countries} países, com feriados nacionais e o mesmo plano.",
  },
  "cs-CZ": {
    phrase: "Prodloužené víkendy",
    and: "a",
    countKind: "bridges",
    title: "Prodloužené víkendy {year}: nejdelší volno v Česku",
    regionTitle: "Prodloužené víkendy {year} {where}: nejdelší volno",
    description: {
      one: "Prodloužené víkendy {year} {where}: {count} prodloužený víkend a z {leave} dnů dovolené je {total} volných dnů.",
      few: "Prodloužené víkendy {year} {where}: {count} prodloužené víkendy a z {leave} dnů dovolené je {total} volných dnů.",
      many: "Prodloužené víkendy {year} {where}: {count} prodloužených víkendů a z {leave} dnů dovolené je {total} volných dnů.",
    },
    bestTitle: "Prodloužené víkendy {year} {where}: kde dovolená dojde nejdál",
    bestDescription:
      "Prodloužené víkendy {year} {where}: {countries} zemí a z {days} dnů dovolené je {off} volných dnů.",
    updated: "Naposledy aktualizováno {date}",
    introCount: {
      one: "V roce {year} je {count} prodloužený víkend {where}.",
      few: "V roce {year} jsou {count} prodloužené víkendy {where}.",
      many: "V roce {year} je {count} prodloužených víkendů {where}.",
    },
    introBest: {
      one: "Nejvíc se vyplatí {when} u svátku {holiday}: jeden den dovolené dá {length} volných dnů ({range}).",
      few: "Nejvíc se vyplatí {when} u svátku {holiday}: {leave} dny dovolené dají {length} volných dnů ({range}).",
      many: "Nejvíc se vyplatí {when} u svátku {holiday}: {leave} dní dovolené dá {length} volných dnů ({range}).",
    },
    introBudget: "Z {budget} dnů dovolené je {total} volných dnů, poměr {multiplier}×.",
    introNone:
      "V roce {year} není {where} prodloužený víkend, protože svátky už vycházejí na víkend nebo hned k němu.",
    qCount: "Kolik prodloužených víkendů je {where} v roce {year}?",
    aCount: {
      one: "V roce {year} je {count} prodloužený víkend {where}: jeden nebo dva dny dovolené spojí svátek s víkendem.",
      few: "V roce {year} jsou {count} prodloužené víkendy {where}: jeden nebo dva dny dovolené spojí svátek s víkendem.",
      many: "V roce {year} je {count} prodloužených víkendů {where}: jeden nebo dva dny dovolené spojí svátek s víkendem.",
    },
    aCountNone:
      "V roce {year} není {where} prodloužený víkend. Svátky vycházejí na víkend nebo hned vedle něj.",
    qBest: "Který prodloužený víkend je v roce {year} nejlepší {where}?",
    aBest: {
      one: "Nejvíc se vyplatí {when}, u svátku {holiday}. Jeden den dovolené dá {length} volných dnů, {range}.",
      few: "Nejvíc se vyplatí {when}, u svátku {holiday}. {leave} dny dovolené dají {length} volných dnů, {range}.",
      many: "Nejvíc se vyplatí {when}, u svátku {holiday}. {leave} dní dovolené dá {length} volných dnů, {range}.",
    },
    aBestNone: "V roce {year} žádný prodloužený víkend {where} neprodlužuje volno.",
    qLongest: "Kolik dnů dovolené dá nejdelší volno {where} v roce {year}?",
    aLongest: {
      one: "Nejdelší volno vezme {leave} den dovolené a trvá {length} dní, {range}.",
      few: "Nejdelší volno vezme {leave} dny dovolené a trvá {length} dní, {range}.",
      many: "Nejdelší volno vezme {leave} dní dovolené a trvá {length} dní, {range}.",
    },
    aLongestNone: "S tímto kalendářem žádné volno nepřesáhne běžný víkend.",
    qBudget: "Kolik volných dnů dá {budget} dnů dovolené {where} v roce {year}?",
    aBudget: "{budget} dnů dovolené dá {where} {total} volných dnů v roce {year}, poměr {multiplier}×.",
    bestLead: "{place} má v roce {year} {off} volných dnů z {days} dnů dovolené.",
    bestLeadTop: "{place} vede rok {year}: z {days} dnů dovolené je {off} volných dnů.",
    bestFollow: "{topName} vede se {topOff} volnými dny.",
    bestMethod: "Srovnání zahrnuje {countries} zemí, státní svátky a stejný plán.",
  },
  "uk-UA": {
    phrase: "Довгі вихідні",
    and: "і",
    countKind: "bridges",
    title: "Довгі вихідні {year}: усі довгі вихідні в Україні",
    regionTitle: "Довгі вихідні {year} {where}: найдовший відпочинок",
    description: {
      one: "Довгі вихідні {year} {where}: {count} довгі вихідні, і з {leave} днів відпустки виходить {total} вільних днів.",
      few: "Довгі вихідні {year} {where}: {count} довгі вихідні, і з {leave} днів відпустки виходить {total} вільних днів.",
      many: "Довгі вихідні {year} {where}: {count} довгих вихідних, і з {leave} днів відпустки виходить {total} вільних днів.",
    },
    bestTitle: "Довгі вихідні {year} {where}: де відпустка сягає найдалі",
    bestDescription:
      "Довгі вихідні {year} {where}: {countries} країн, і з {days} днів відпустки виходить {off} вільних днів.",
    updated: "Востаннє оновлено {date}",
    introCount: {
      one: "У {year} році {where} є {count} довгі вихідні.",
      few: "У {year} році {where} є {count} довгі вихідні.",
      many: "У {year} році {where} є {count} довгих вихідних.",
    },
    introBest: {
      one: "Найкращі припадають на {when}, біля {holiday}: один день відпустки дає {length} вільних днів ({range}).",
      few: "Найкращі припадають на {when}, біля {holiday}: {leave} дні відпустки дають {length} вільних днів ({range}).",
      many: "Найкращі припадають на {when}, біля {holiday}: {leave} днів відпустки дають {length} вільних днів ({range}).",
    },
    introBudget: "З {budget} днів відпустки виходить {total} вільних днів, коефіцієнт {multiplier}×.",
    introNone:
      "У {year} році {where} немає довгих вихідних: свята вже припадають на вихідні або стоять упритул.",
    qCount: "Скільки довгих вихідних є {where} у {year} році?",
    aCount: {
      one: "У {year} році {where} є {count} довгі вихідні: один або два дні відпустки з’єднують свято з вікендом.",
      few: "У {year} році {where} є {count} довгі вихідні: один або два дні відпустки з’єднують свято з вікендом.",
      many: "У {year} році {where} є {count} довгих вихідних: один або два дні відпустки з’єднують свято з вікендом.",
    },
    aCountNone:
      "У {year} році {where} немає довгих вихідних. Свята вже припадають на суботу, неділю або стоять упритул.",
    qBest: "Які довгі вихідні найкращі {where} у {year} році?",
    aBest: {
      one: "Найкращі припадають на {when}, біля {holiday}. Один день відпустки дає {length} вільних днів, {range}.",
      few: "Найкращі припадають на {when}, біля {holiday}. {leave} дні відпустки дають {length} вільних днів, {range}.",
      many: "Найкращі припадають на {when}, біля {holiday}. {leave} днів відпустки дають {length} вільних днів, {range}.",
    },
    aBestNone: "У {year} році {where} жоден відрізок не подовжує вікенд.",
    qLongest: "Скільки днів відпустки дають найдовшу перерву {where} у {year} році?",
    aLongest: {
      one: "Найдовша перерва бере {leave} день відпустки і триває {length} днів, {range}.",
      few: "Найдовша перерва бере {leave} дні відпустки і триває {length} днів, {range}.",
      many: "Найдовша перерва бере {leave} днів відпустки і триває {length} днів, {range}.",
    },
    aLongestNone: "З цим календарем жодна перерва не довша за звичайні вихідні.",
    qBudget: "Скільки вільних днів дають {budget} днів відпустки {where} у {year} році?",
    aBudget:
      "{budget} днів відпустки дають {where} {total} вільних днів у {year} році, коефіцієнт {multiplier}×.",
    bestLead: "{place} має {off} вільних днів у {year} році з {days} днів відпустки.",
    bestLeadTop: "{place} лідирує у {year}: з {days} днів відпустки виходить {off} вільних днів.",
    bestFollow: "{topName} очолює список із {topOff} вільними днями.",
    bestMethod: "Порівняння охоплює {countries} країн, державні свята й однаковий план.",
  },
};
