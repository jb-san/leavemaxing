/**
 * Localization data for bridge-day pages across multiple countries.
 * Each locale has a language code, native term for "bridge days", and translations.
 */

export interface LocaleConfig {
  /** Language code (e.g., "de-DE", "sv-SE") */
  code: string;
  /** ISO 639-1 language code for <html lang=""> */
  lang: string;
  /** Country code (e.g., "DE", "SE") */
  country: string;
  /** Native term for "bridge days" */
  bridgeTerm: string;
  /** URL slug for the bridge days pages */
  slug: string;
  /** Default statutory leave days */
  defaultBudget: number;
  /** Translations for UI and content */
  translations: Translations;
}

export interface Translations {
  // Meta / SEO
  pageTitle: string; // e.g., "Brückentage {year} {region}: So machst du aus {leave} Urlaubstagen {total} freie Tage"
  pageDescription: string;

  // Headings
  h1: string; // e.g., "Brückentage {year}"
  h1Region: string; // e.g., "Brückentage {year} in {region}"

  // Content sections
  holidaysHeading: string;
  bestPlansHeading: string;
  howItWorksHeading: string;
  faqHeading: string;

  // Bridge plans
  leaveDays: string; // e.g., "Urlaubstage"
  daysOff: string; // e.g., "Freie Tage"
  totalDays: string; // e.g., "Tage frei"
  bookTheseDays: string; // e.g., "Diese Tage nehmen"
  result: string; // e.g., "Ergebnis"

  // Intro text template
  intro: string;

  // FAQ questions and answers (3-5 per locale)
  faq: Array<{
    question: string;
    answer: string;
  }>;

  // Links
  otherYears: string;
  otherRegions: string;
  calculator: string;
  calculatorLink: string;

  // Holidays
  publicHolidays: string;
  regionalHolidays: string;
}

export const locales: Record<string, LocaleConfig> = {
  "de-DE": {
    code: "de-DE",
    lang: "de",
    country: "DE",
    bridgeTerm: "Brückentage",
    slug: "brueckentage",
    defaultBudget: 20,
    translations: {
      pageTitle: "Brückentage {year}{region}: So machst du aus {leave} Urlaubstagen {total} freie Tage",
      pageDescription:
        "Die besten Brückentage {year}{region}. Mit nur {leave} Urlaubstagen kommst du auf {total} freie Tage. Optimale Planung für maximale Erholung.",
      h1: "Brückentage {year} – Die besten Tage für Urlaub",
      h1Region: "Brückentage {year} in {region}",
      holidaysHeading: "Feiertage {year}",
      bestPlansHeading: "Die besten Urlaubspläne {year}",
      howItWorksHeading: "So nutzt du Brückentage optimal",
      faqHeading: "Häufig gestellte Fragen",
      leaveDays: "Urlaubstage",
      daysOff: "Freie Tage",
      totalDays: "Tage frei",
      bookTheseDays: "Diese Tage nehmen",
      result: "Ergebnis",
      intro:
        "Mit cleverer Planung holst du {year} das Maximum aus deinem Urlaub heraus. Durch geschickte Brückentage kannst du aus {budget} Urlaubstagen bis zu {total} freie Tage machen – das ist ein Verhältnis von {multiplier}×.",
      faq: [
        {
          question: "Was sind Brückentage?",
          answer:
            "Brückentage sind Arbeitstage zwischen einem Feiertag und einem Wochenende. Nimmst du an diesen Tagen Urlaub, entsteht ein längerer zusammenhängender freier Zeitraum. So wird aus einem einzelnen Urlaubstag schnell ein verlängertes Wochenende.",
        },
        {
          question: "Wann sollte ich Brückentage beantragen?",
          answer:
            "Am besten planst du deine Brückentage so früh wie möglich, idealerweise schon im Herbst des Vorjahres. Viele Kollegen haben die gleiche Idee, und bei beliebten Brückentagen gilt oft: Wer zuerst kommt, mahlt zuerst.",
        },
        {
          question: "Wie viele Urlaubstage stehen mir zu?",
          answer:
            "In Deutschland haben Vollzeitbeschäftigte gesetzlich Anspruch auf mindestens 20 Urlaubstage bei einer 5-Tage-Woche. Viele Arbeitgeber bieten jedoch 25-30 Tage. Die genaue Anzahl findest du in deinem Arbeitsvertrag.",
        },
        {
          question: "Unterscheiden sich Feiertage in den Bundesländern?",
          answer:
            "Ja, in Deutschland gibt es neben bundesweiten Feiertagen auch regionale Feiertage. Zum Beispiel ist Heilige Drei Könige nur in Bayern, Baden-Württemberg und Sachsen-Anhalt ein Feiertag. Nutze unseren Rechner, um die Feiertage für dein Bundesland anzuzeigen.",
        },
        {
          question: "Kann mein Arbeitgeber Brückentage ablehnen?",
          answer:
            "Grundsätzlich muss dein Arbeitgeber deinen Urlaubswunsch berücksichtigen. Er kann ihn aber ablehnen, wenn wichtige betriebliche Gründe dagegensprechen oder zu viele Kollegen gleichzeitig frei haben möchten. Eine frühzeitige Planung erhöht deine Chancen.",
        },
      ],
      otherYears: "Andere Jahre",
      otherRegions: "Andere Bundesländer",
      calculator: "Eigenen Urlaubsplan erstellen",
      calculatorLink: "Zum Brückentage-Rechner",
      publicHolidays: "Gesetzliche Feiertage",
      regionalHolidays: "Regionale Feiertage",
    },
  },

  "de-AT": {
    code: "de-AT",
    lang: "de",
    country: "AT",
    bridgeTerm: "Fenstertage",
    slug: "fenstertage",
    defaultBudget: 25,
    translations: {
      pageTitle: "Fenstertage {year}{region}: Aus {leave} Urlaubstagen werden {total} freie Tage",
      pageDescription:
        "Die besten Fenstertage {year}{region} in Österreich. Mit nur {leave} Urlaubstagen erreichst du {total} freie Tage. Optimale Urlaubsplanung leicht gemacht.",
      h1: "Fenstertage {year} Österreich",
      h1Region: "Fenstertage {year} in {region}",
      holidaysHeading: "Feiertage {year} in Österreich",
      bestPlansHeading: "Die besten Urlaubspläne {year}",
      howItWorksHeading: "So nutzt du Fenstertage optimal",
      faqHeading: "Häufig gestellte Fragen",
      leaveDays: "Urlaubstage",
      daysOff: "Freie Tage",
      totalDays: "Tage frei",
      bookTheseDays: "Diese Tage nehmen",
      result: "Ergebnis",
      intro:
        "Mit kluger Planung holst du {year} in Österreich das Maximum aus deinem Urlaub. Durch geschickte Fenstertage machst du aus {budget} Urlaubstagen bis zu {total} freie Tage – ein Verhältnis von {multiplier}×.",
      faq: [
        {
          question: "Was sind Fenstertage?",
          answer:
            "Fenstertage sind Arbeitstage zwischen einem Feiertag und dem Wochenende. Wenn du an diesen Tagen Urlaub nimmst, entsteht ein längerer zusammenhängender freier Zeitraum.",
        },
        {
          question: "Wie viel Urlaub steht mir in Österreich zu?",
          answer:
            "In Österreich haben Arbeitnehmer nach dem Urlaubsgesetz Anspruch auf 5 Wochen Urlaub pro Jahr (25 Arbeitstage bei einer 5-Tage-Woche). Nach 25 Dienstjahren erhöht sich der Anspruch auf 6 Wochen.",
        },
        {
          question: "Wann sollte ich Fenstertage beantragen?",
          answer:
            "Je früher, desto besser! Idealerweise planst du deine Fenstertage bereits im Herbst des Vorjahres. So sicherst du dir die beliebten Termine, bevor Kollegen zugreifen.",
        },
        {
          question: "Kann mein Arbeitgeber Fenstertage ablehnen?",
          answer:
            "Der Arbeitgeber muss bei der Urlaubsplanung auf deine Wünsche Rücksicht nehmen. Er kann deinen Urlaub aber verschieben, wenn wichtige betriebliche Interessen oder Urlaubswünsche anderer Arbeitnehmer dem entgegenstehen.",
        },
      ],
      otherYears: "Andere Jahre",
      otherRegions: "Andere Bundesländer",
      calculator: "Eigenen Urlaubsplan erstellen",
      calculatorLink: "Zum Fenstertage-Rechner",
      publicHolidays: "Gesetzliche Feiertage",
      regionalHolidays: "Regionale Feiertage",
    },
  },

  "sv-SE": {
    code: "sv-SE",
    lang: "sv",
    country: "SE",
    bridgeTerm: "klämdagar",
    slug: "klamdagar",
    defaultBudget: 25,
    translations: {
      pageTitle: "Klämdagar {year}: Så gör du {leave} semesterdagar till {total} lediga dagar",
      pageDescription:
        "De bästa klämdagarna {year} i Sverige. Med bara {leave} semesterdagar får du {total} lediga dagar. Optimal semesterplanering för maximal ledighet.",
      h1: "Klämdagar {year} – Planera din semester smart",
      h1Region: "Klämdagar {year}",
      holidaysHeading: "Helgdagar {year}",
      bestPlansHeading: "De bästa semesterplanerna {year}",
      howItWorksHeading: "Så utnyttjar du klämdagar optimalt",
      faqHeading: "Vanliga frågor",
      leaveDays: "Semesterdagar",
      daysOff: "Lediga dagar",
      totalDays: "dagar ledigt",
      bookTheseDays: "Ta ledigt dessa dagar",
      result: "Resultat",
      intro:
        "Med smart planering får du ut maximalt av din semester {year}. Genom att utnyttja klämdagar kan du förvandla {budget} semesterdagar till hela {total} lediga dagar – en multiplikator på {multiplier}×.",
      faq: [
        {
          question: "Vad är klämdagar?",
          answer:
            "Klämdagar är vardagar som ligger mellan en helgdag och en helg. Genom att ta semester dessa dagar skapar du längre sammanhängande ledighetsperioder. En klämdag kan förvandla en långhelg till en hel vecka ledig.",
        },
        {
          question: "När räknas en dag som klämdag?",
          answer:
            "En klämdag är en vardag (måndag-fredag) som ligger mellan en röd dag och en helg. Till exempel om en helgdag infaller på en torsdag, så är fredagen en klämdag. Tar du ledigt då får du en fyra dagar lång helg.",
        },
        {
          question: "Hur många semesterdagar har jag rätt till?",
          answer:
            "I Sverige har du enligt semesterlagen rätt till minst 25 semesterdagar per år. Under ditt första anställningsår intjänar du 2,08 dagar per månad. Många kollektivavtal ger fler dagar, särskilt för äldre arbetstagare.",
        },
        {
          question: "Vad gäller för aftnar i Sverige?",
          answer:
            "Midsommarafton, julafton och nyårsafton jämställs med söndagar enligt semesterlagen, vilket innebär att de flesta har ledigt dessa dagar även om de inte är officiella helgdagar. Dessa dagar räknas inte som semesterdagar.",
        },
        {
          question: "När bör jag ansöka om semester på klämdagar?",
          answer:
            "Planera och ansök så tidigt som möjligt, gärna redan under hösten innan. Populära klämdagar blir snabbt upptagna av kollegor. Många arbetsgivare kräver att sommarens huvudsemester (4 veckor) anmäls senast den 1 april.",
        },
      ],
      otherYears: "Andra år",
      otherRegions: "",
      calculator: "Skapa din egen semesterplan",
      calculatorLink: "Till semesterplaneraren",
      publicHolidays: "Helgdagar",
      regionalHolidays: "Regionala helgdagar",
    },
  },

  "nb-NO": {
    code: "nb-NO",
    lang: "nb",
    country: "NO",
    bridgeTerm: "inneklemte dager",
    slug: "inneklemte-dager",
    defaultBudget: 25,
    translations: {
      pageTitle: "Inneklemte dager {year}: Gjør {leave} feriedager til {total} ledige dager",
      pageDescription:
        "De beste inneklemte dagene {year} i Norge. Med bare {leave} feriedager får du {total} ledige dager. Optimal ferieplanlegging.",
      h1: "Inneklemte dager {year}",
      h1Region: "Inneklemte dager {year}",
      holidaysHeading: "Helligdager {year}",
      bestPlansHeading: "De beste ferieplanene {year}",
      howItWorksHeading: "Slik utnytter du inneklemte dager",
      faqHeading: "Ofte stilte spørsmål",
      leaveDays: "Feriedager",
      daysOff: "Ledige dager",
      totalDays: "dager fri",
      bookTheseDays: "Ta fri disse dagene",
      result: "Resultat",
      intro:
        "Med smart planlegging får du maksimalt ut av ferien din i {year}. Ved å utnytte inneklemte dager kan du gjøre {budget} feriedager om til hele {total} ledige dager – en multiplikator på {multiplier}×.",
      faq: [
        {
          question: "Hva er inneklemte dager?",
          answer:
            "Inneklemte dager er virkedager som ligger mellom en helligdag og en helg. Ved å ta ferie disse dagene skaper du lengre sammenhengende ferieperioder.",
        },
        {
          question: "Hvor mange feriedager har jeg rett til?",
          answer:
            "I Norge har du rett til 25 virkedager ferie per år etter ferieloven (5 uker). Mange bedrifter gir imidlertid flere dager gjennom tariffavtaler eller bedriftens egne ordninger.",
        },
        {
          question: "Når bør jeg søke om ferie på inneklemte dager?",
          answer:
            "Det er lurt å planlegge og søke så tidlig som mulig, gjerne allerede høsten før. Populære inneklemte dager blir raskt opptatt av kolleger.",
        },
      ],
      otherYears: "Andre år",
      otherRegions: "",
      calculator: "Lag din egen ferieplan",
      calculatorLink: "Til ferieplanneren",
      publicHolidays: "Helligdager",
      regionalHolidays: "Regionale helligdager",
    },
  },

  "da-DK": {
    code: "da-DK",
    lang: "da",
    country: "DK",
    bridgeTerm: "klemmedage",
    slug: "klemmedage",
    defaultBudget: 25,
    translations: {
      pageTitle: "Klemmedage {year}: Få {total} fridage ud af {leave} feriedage",
      pageDescription:
        "De bedste klemmedage {year} i Danmark. Med kun {leave} feriedage får du {total} fridage. Optimal ferieplanlægning.",
      h1: "Klemmedage {year}",
      h1Region: "Klemmedage {year}",
      holidaysHeading: "Helligdage {year}",
      bestPlansHeading: "De bedste ferieplaner {year}",
      howItWorksHeading: "Sådan udnytter du klemmedage optimalt",
      faqHeading: "Ofte stillede spørgsmål",
      leaveDays: "Feriedage",
      daysOff: "Fridage",
      totalDays: "dage fri",
      bookTheseDays: "Hold fri disse dage",
      result: "Resultat",
      intro:
        "Med smart planlægning får du maksimalt ud af din ferie i {year}. Ved at udnytte klemmedage kan du gøre {budget} feriedage til hele {total} fridage – en multiplikator på {multiplier}×.",
      faq: [
        {
          question: "Hvad er klemmedage?",
          answer:
            "Klemmedage er hverdage, der ligger mellem en helligdag og en weekend. Ved at holde ferie disse dage skaber du længere sammenhængende ferieperioder.",
        },
        {
          question: "Hvor mange feriedage har jeg ret til?",
          answer:
            "I Danmark har du ret til 5 ugers ferie om året (25 dage ved en 5-dages arbejdsuge) efter ferieloven. Nogle overenskomster giver flere dage.",
        },
        {
          question: "Hvornår bør jeg ansøge om ferie på klemmedage?",
          answer:
            "Det er en god idé at planlægge og ansøge så tidligt som muligt, gerne allerede i efteråret før. Populære klemmedage bliver hurtigt booket af kolleger.",
        },
      ],
      otherYears: "Andre år",
      otherRegions: "",
      calculator: "Lav din egen ferieplan",
      calculatorLink: "Til ferieplanlæggeren",
      publicHolidays: "Helligdage",
      regionalHolidays: "Regionale helligdage",
    },
  },

  "fi-FI": {
    code: "fi-FI",
    lang: "fi",
    country: "FI",
    bridgeTerm: "välipäivät",
    slug: "valipaivat",
    defaultBudget: 25,
    translations: {
      pageTitle: "Välipäivät {year}: Tee {leave} lomapäivästä {total} vapaapäivää",
      pageDescription:
        "Parhaat välipäivät {year} Suomessa. Vain {leave} lomapäivällä saat {total} vapaapäivää. Optimaalinen lomansuunnittelu.",
      h1: "Välipäivät {year}",
      h1Region: "Välipäivät {year}",
      holidaysHeading: "Juhlapäivät {year}",
      bestPlansHeading: "Parhaat lomasuunnitelmat {year}",
      howItWorksHeading: "Näin hyödynnät välipäivät optimaalisesti",
      faqHeading: "Usein kysytyt kysymykset",
      leaveDays: "Lomapäivät",
      daysOff: "Vapaapäivät",
      totalDays: "päivää vapaata",
      bookTheseDays: "Pidä vapaata näinä päivinä",
      result: "Tulos",
      intro:
        "Älykkäällä suunnittelulla saat lomaasi maksimaalisen hyödyn vuonna {year}. Hyödyntämällä välipäiviä voit muuttaa {budget} lomapäivää jopa {total} vapaapäiväksi – kerroin {multiplier}×.",
      faq: [
        {
          question: "Mitä ovat välipäivät?",
          answer:
            "Välipäivät ovat arkipäiviä, jotka sijoittuvat juhlapäivän ja viikonlopun väliin. Pitämällä lomaa näinä päivinä luot pidempiä yhtenäisiä lomaperiodeja.",
        },
        {
          question: "Kuinka monta lomapäivää minulla on oikeus?",
          answer:
            "Suomessa työntekijällä on oikeus vähintään 24 arkipäivän vuosilomaan (noin 4 viikkoa). Lomaoikeus kasvaa 25 arkipäivään (noin 5 viikkoa), jos työsuhde on kestänyt alle vuoden lomanmääräytymisvuoden loppuun mennessä.",
        },
        {
          question: "Milloin minun pitäisi hakea lomaa välipäiville?",
          answer:
            "Kannattaa suunnitella ja hakea mahdollisimman aikaisin, mieluiten jo edellisenä syksynä. Suositut välipäivät varataan nopeasti.",
        },
      ],
      otherYears: "Muut vuodet",
      otherRegions: "",
      calculator: "Luo oma lomasuunnitelma",
      calculatorLink: "Lomasuunnittelijaan",
      publicHolidays: "Juhlapäivät",
      regionalHolidays: "Alueelliset juhlapäivät",
    },
  },

  "pl-PL": {
    code: "pl-PL",
    lang: "pl",
    country: "PL",
    bridgeTerm: "długie weekendy",
    slug: "dlugieweekendy",
    defaultBudget: 20,
    translations: {
      pageTitle: "Długie weekendy {year}: Zamień {leave} dni urlopu na {total} dni wolnych",
      pageDescription:
        "Najlepsze długie weekendy {year} w Polsce. Wykorzystaj tylko {leave} dni urlopu, aby mieć {total} dni wolnych. Optymalne planowanie urlopu.",
      h1: "Długie weekendy {year}",
      h1Region: "Długie weekendy {year}",
      holidaysHeading: "Święta {year}",
      bestPlansHeading: "Najlepsze plany urlopowe {year}",
      howItWorksHeading: "Jak optymalnie wykorzystać długie weekendy",
      faqHeading: "Najczęściej zadawane pytania",
      leaveDays: "Dni urlopu",
      daysOff: "Dni wolnych",
      totalDays: "dni wolnych",
      bookTheseDays: "Weź wolne w te dni",
      result: "Wynik",
      intro:
        "Dzięki mądrej strategii maksymalnie wykorzystasz urlop w {year} roku. Planując długie weekendy, z {budget} dni urlopu możesz uzyskać aż {total} dni wolnych – to współczynnik {multiplier}×.",
      faq: [
        {
          question: "Czym są długie weekendy?",
          answer:
            "Długie weekendy powstają, gdy dzień wolny od pracy (święto) przypada w pobliżu weekendu. Biorąc urlop w dni robocze między świętem a weekendem, możesz stworzyć dłuższy ciągły okres wolny od pracy.",
        },
        {
          question: "Ile dni urlopu mi przysługuje?",
          answer:
            "W Polsce pracownik ma prawo do 20 dni urlopu wypoczynkowego rocznie (przy stażu pracy poniżej 10 lat) lub 26 dni (przy stażu 10 lat i więcej). Do stażu wlicza się również okres nauki.",
        },
        {
          question: "Kiedy powinienem planować urlop na długie weekendy?",
          answer:
            "Im wcześniej, tym lepiej! Najlepiej zaplanuj swój urlop już jesienią poprzedniego roku. Najpopularniejsze długie weekendy są szybko rezerwowane przez współpracowników.",
        },
        {
          question: "Czy pracodawca może odmówić urlopu w długi weekend?",
          answer:
            "Pracodawca ustala termin urlopu w porozumieniu z pracownikiem. Może odmówić urlopu w danym terminie tylko z ważnych przyczyn, np. ze względu na konieczność zapewnienia normalnego toku pracy. Wczesne zgłoszenie zwiększa szanse na akceptację.",
        },
      ],
      otherYears: "Inne lata",
      otherRegions: "",
      calculator: "Stwórz własny plan urlopowy",
      calculatorLink: "Do planera urlopów",
      publicHolidays: "Święta państwowe",
      regionalHolidays: "Święta regionalne",
    },
  },

  "nl-NL": {
    code: "nl-NL",
    lang: "nl",
    country: "NL",
    bridgeTerm: "brugdagen",
    slug: "brugdagen",
    defaultBudget: 20,
    translations: {
      pageTitle: "Brugdagen {year}: Maak van {leave} vakantiedagen {total} vrije dagen",
      pageDescription:
        "De beste brugdagen {year} in Nederland. Met slechts {leave} vakantiedagen krijg je {total} vrije dagen. Optimale vakantieplanning.",
      h1: "Brugdagen {year}",
      h1Region: "Brugdagen {year}",
      holidaysHeading: "Feestdagen {year}",
      bestPlansHeading: "De beste vakantieplannen {year}",
      howItWorksHeading: "Zo benut je brugdagen optimaal",
      faqHeading: "Veelgestelde vragen",
      leaveDays: "Vakantiedagen",
      daysOff: "Vrije dagen",
      totalDays: "dagen vrij",
      bookTheseDays: "Neem vrij op deze dagen",
      result: "Resultaat",
      intro:
        "Met slimme planning haal je in {year} het maximale uit je vakantie. Door brugdagen te benutten kun je van {budget} vakantiedagen maar liefst {total} vrije dagen maken – een factor van {multiplier}×.",
      faq: [
        {
          question: "Wat zijn brugdagen?",
          answer:
            "Brugdagen zijn werkdagen die tussen een feestdag en een weekend liggen. Door op deze dagen vakantie op te nemen, creëer je een langere aaneengesloten vrije periode.",
        },
        {
          question: "Hoeveel vakantiedagen heb ik recht op?",
          answer:
            "In Nederland heb je wettelijk recht op minimaal 4 keer je aantal werkdagen per week aan vakantiedagen. Bij een fulltime dienstverband (5 dagen per week) is dat 20 dagen per jaar. Veel werkgevers bieden meer dagen via de cao of arbeidsovereenkomst.",
        },
        {
          question: "Wanneer moet ik brugdagen aanvragen?",
          answer:
            "Het is verstandig om zo vroeg mogelijk te plannen en aan te vragen, bij voorkeur al in het najaar ervoor. Populaire brugdagen zijn vaak snel volgeboekt door collega's.",
        },
        {
          question: "Kan mijn werkgever brugdagen weigeren?",
          answer:
            "Je werkgever moet rekening houden met je vakantiewensen, maar mag je verlof weigeren als er zwaarwegende bedrijfsbelangen zijn. Bij populaire brugdagen geldt vaak: wie het eerst komt, het eerst maalt. Vroegtijdig aanvragen vergroot je kansen.",
        },
      ],
      otherYears: "Andere jaren",
      otherRegions: "",
      calculator: "Maak je eigen vakantieplan",
      calculatorLink: "Naar de vakantieplanner",
      publicHolidays: "Feestdagen",
      regionalHolidays: "Regionale feestdagen",
    },
  },

  "de-CH": {
    code: "de-CH",
    lang: "de",
    country: "CH",
    bridgeTerm: "Brückentage",
    slug: "brueckentage",
    defaultBudget: 20,
    translations: {
      pageTitle: "Brückentage {year} Schweiz{region}: Aus {leave} Ferientagen werden {total} freie Tage",
      pageDescription:
        "Die besten Brückentage {year}{region} in der Schweiz. Mit nur {leave} Ferientagen erreichst du {total} freie Tage. Optimale Ferienplanung.",
      h1: "Brückentage {year} Schweiz",
      h1Region: "Brückentage {year} im Kanton {region}",
      holidaysHeading: "Feiertage {year}",
      bestPlansHeading: "Die besten Ferienpläne {year}",
      howItWorksHeading: "So nutzt du Brückentage optimal",
      faqHeading: "Häufig gestellte Fragen",
      leaveDays: "Ferientage",
      daysOff: "Freie Tage",
      totalDays: "Tage frei",
      bookTheseDays: "Diese Tage nehmen",
      result: "Ergebnis",
      intro:
        "Mit cleverer Planung holst du {year} das Maximum aus deinen Ferien heraus. Durch geschickte Brückentage kannst du aus {budget} Ferientagen bis zu {total} freie Tage machen – das ist ein Verhältnis von {multiplier}×.",
      faq: [
        {
          question: "Was sind Brückentage?",
          answer:
            "Brückentage sind Arbeitstage zwischen einem Feiertag und einem Wochenende. Nimmst du an diesen Tagen Ferien, entsteht ein längerer zusammenhängender freier Zeitraum.",
        },
        {
          question: "Wie viele Ferientage stehen mir in der Schweiz zu?",
          answer:
            "In der Schweiz haben Arbeitnehmer gesetzlich Anspruch auf mindestens 4 Wochen Ferien pro Jahr (20 Arbeitstage bei einer 5-Tage-Woche). Arbeitnehmer unter 20 Jahren haben Anspruch auf 5 Wochen. Viele Firmen bieten jedoch mehr Ferientage.",
        },
        {
          question: "Unterscheiden sich Feiertage zwischen den Kantonen?",
          answer:
            "Ja, in der Schweiz gibt es neben landesweiten Feiertagen auch kantonale und sogar lokale Feiertage. Die Anzahl und Art der Feiertage kann sich von Kanton zu Kanton stark unterscheiden. Nutze unseren Rechner für deinen Kanton.",
        },
      ],
      otherYears: "Andere Jahre",
      otherRegions: "Andere Kantone",
      calculator: "Eigenen Ferienplan erstellen",
      calculatorLink: "Zum Brückentage-Rechner",
      publicHolidays: "Gesetzliche Feiertage",
      regionalHolidays: "Kantonale Feiertage",
    },
  },
};

export function getLocale(code: string): LocaleConfig | undefined {
  return locales[code];
}

export function getLocaleForCountry(country: string, lang?: string): LocaleConfig | undefined {
  // Find locale matching country and optionally language
  const key = Object.keys(locales).find((k) => {
    const locale = locales[k];
    if (!locale) return false;
    if (lang) {
      return locale.country === country && locale.lang === lang;
    }
    return locale.country === country;
  });
  return key ? locales[key] : undefined;
}

/** Replace placeholders like {year}, {region}, {leave}, etc. in translated strings */
export function replaceTokens(text: string, tokens: Record<string, string | number>): string {
  let result = text;
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

/** Get regions for countries with regional holidays */
export const regionalCountries = {
  DE: true, // Germany - 16 Bundesländer
  AT: true, // Austria - 9 Bundesländer
  CH: true, // Switzerland - 26 cantons (start with top 8)
} as const;

export type RegionalCountry = keyof typeof regionalCountries;

export function isRegionalCountry(country: string): country is RegionalCountry {
  return country in regionalCountries;
}
