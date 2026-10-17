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

  /** Breadcrumb label for the home link. Falls back to "Planner". */
  home?: string;
  /** Sidebar line under the best-plan list. Token: {budget}. */
  withBudget?: string;
  /** Sidebar line above the calculator link. */
  adjustHint?: string;
  /** Regional pages. Tokens: {region}, {count}. */
  extraRegional?: string;
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
      home: "Planer",
      withBudget: "Mit {budget} Urlaubstagen.",
      adjustHint: "Passe die Tage an deinen Vertrag an.",
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
      home: "Planer",
      withBudget: "Mit {budget} Urlaubstagen.",
      adjustHint: "Passe die Tage an deinen Vertrag an.",
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
      home: "Planerare",
      withBudget: "Med {budget} semesterdagar.",
      adjustHint: "Justera dagarna efter ditt avtal.",
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
      home: "Planlegger",
      withBudget: "Med {budget} feriedager.",
      adjustHint: "Tilpass dagene til avtalen din.",
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
      home: "Planlægger",
      withBudget: "Med {budget} feriedage.",
      adjustHint: "Tilpas dagene til din aftale.",
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
      home: "Suunnittelija",
      withBudget: "{budget} lomapäivällä.",
      adjustHint: "Säädä päivät sopimuksesi mukaan.",
    },
  },

  "pl-PL": {
    code: "pl-PL",
    lang: "pl",
    country: "PL",
    bridgeTerm: "długie weekendy",
    slug: "dlugie-weekendy",
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
      home: "Planer",
      withBudget: "Przy {budget} dniach urlopu.",
      adjustHint: "Dopasuj dni do swojej umowy.",
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
      home: "Vakantieplanner",
      withBudget: "Met {budget} vakantiedagen.",
      adjustHint: "Pas de dagen aan je contract aan.",
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
      home: "Planer",
      withBudget: "Mit {budget} Ferientagen.",
      adjustHint: "Pass die Tage an deinen Vertrag an.",
    },
  },

  "fr-FR": {
    code: "fr-FR",
    lang: "fr",
    country: "FR",
    bridgeTerm: "ponts",
    slug: "ponts",
    defaultBudget: 25,
    translations: {
      pageTitle: "Ponts {year}{region} : {leave} jours de congés pour {total} jours de repos",
      pageDescription:
        "Les meilleurs ponts de {year} en France. Posez {leave} jours de congés aux bonnes dates et vous arrivez à {total} jours de repos.",
      h1: "Ponts {year} : les jours à poser",
      h1Region: "Ponts {year} en {region}",
      holidaysHeading: "Jours fériés {year}",
      bestPlansHeading: "Les meilleurs plans {year}",
      howItWorksHeading: "Comment faire le pont",
      faqHeading: "Questions fréquentes",
      leaveDays: "jours de congés",
      daysOff: "jours de repos",
      totalDays: "jours de repos",
      bookTheseDays: "Jours à poser",
      result: "Résultat",
      intro:
        "En {year}, les jours fériés ne tombent pas tous au bon endroit. En posant {budget} jours de congés aux dates qui comptent, vous arrivez à {total} jours de repos, soit {multiplier} fois les jours posés.",
      faq: [
        {
          question: "C'est quoi, faire le pont ?",
          answer:
            "Faire le pont, c'est poser un jour de congé entre un jour férié et le week-end. Un jeudi férié plus le vendredi, et vous partez du jeudi au dimanche. Le pont de l'Ascension, quand elle tombe un jeudi, est le grand classique : un seul jour posé, quatre jours de repos.",
        },
        {
          question: "Combien de jours de congés payés ai-je ?",
          answer:
            "Le code du travail donne 2,5 jours ouvrables par mois de travail effectif, soit 25 jours pour une année complète. Beaucoup d'entreprises en ajoutent, RTT compris. Cette page part de 25 jours : changez le chiffre dans le planificateur si votre contrat est différent.",
        },
        {
          question: "Le lundi de Pentecôte est-il vraiment chômé ?",
          answer:
            "Depuis 2004, c'est le support habituel de la journée de solidarité : il n'est plus automatiquement chômé. Beaucoup d'employeurs le font travailler, d'autres le maintiennent ou le déplacent à une autre date. Le calendrier le compte encore comme férié. Vérifiez ce que fait votre entreprise avant de poser autour.",
        },
        {
          question: "L'Alsace-Moselle a-t-elle des jours en plus ?",
          answer:
            "Oui. En Moselle, dans le Bas-Rhin et le Haut-Rhin, le vendredi saint et le 26 décembre (Saint-Étienne) sont fériés en plus du calendrier national. Ailleurs en métropole, ces deux jours se travaillent. Les départements d'outre-mer ont aussi leur jour d'abolition de l'esclavage, à une date qui change selon le territoire.",
        },
        {
          question: "Mon employeur peut-il refuser un pont ?",
          answer:
            "Il fixe les dates de congés après avoir recueilli les souhaits, et il peut refuser pour nécessité de service. Un pont très demandé se joue souvent à qui pose le premier. Mieux vaut le faire à l'automne, quand les plannings de l'année suivante s'ouvrent.",
        },
      ],
      otherYears: "Autres années",
      otherRegions: "",
      calculator: "Faire votre propre plan",
      calculatorLink: "Ouvrir le planificateur",
      publicHolidays: "Jours fériés",
      regionalHolidays: "Jours fériés locaux",
      home: "Accueil",
      withBudget: "Avec {budget} jours.",
      adjustHint: "Ajustez les dates, le nombre de jours et le style.",
      extraRegional: "En {region}, {count} jours fériés s'ajoutent au calendrier national.",
    },
  },

  "fr-BE": {
    code: "fr-BE",
    lang: "fr",
    country: "BE",
    bridgeTerm: "ponts",
    slug: "ponts",
    defaultBudget: 20,
    translations: {
      pageTitle: "Ponts {year} en Belgique : {leave} jours de congé pour {total} jours de repos",
      pageDescription:
        "Les meilleurs ponts de {year} en Belgique. Avec {leave} jours de congé posés aux bonnes dates, vous obtenez {total} jours de repos.",
      h1: "Ponts {year} en Belgique",
      h1Region: "Ponts {year} en {region}",
      holidaysHeading: "Jours fériés {year}",
      bestPlansHeading: "Les meilleurs plans {year}",
      howItWorksHeading: "Comment faire le pont",
      faqHeading: "Questions fréquentes",
      leaveDays: "jours de congé",
      daysOff: "jours de repos",
      totalDays: "jours de repos",
      bookTheseDays: "Jours à poser",
      result: "Résultat",
      intro:
        "En Belgique, {year} se joue sur quelques ponts bien placés. Avec {budget} jours de congé aux bonnes dates, vous obtenez {total} jours de repos, soit {multiplier} fois les jours posés.",
      faq: [
        {
          question: "Faire le pont, ça veut dire quoi ?",
          answer:
            "Un pont, c'est un jour de congé collé à un jour férié pour rejoindre le week-end. L'Ascension tombe souvent un jeudi : vous posez le vendredi et vous avez quatre jours d'affilée, du jeudi au dimanche.",
        },
        {
          question: "Combien de jours de congé légaux ?",
          answer:
            "Le régime des vacances annuelles donne 20 jours pour un temps plein sur cinq jours. Certains secteurs en prévoient davantage. Les dix jours fériés légaux viennent en plus et ne se prennent pas sur les vacances.",
        },
        {
          question: "Et si le jour férié tombe un week-end ?",
          answer:
            "Un jour férié qui tombe un dimanche, ou un jour où l'entreprise ne travaille de toute façon pas, doit être remplacé. La date se décide dans le secteur ou l'entreprise, en principe avant le 15 décembre de l'année d'avant. Ce calendrier montre les dates légales, pas le jour de remplacement choisi chez vous.",
        },
        {
          question: "Le 27 septembre est-il férié partout ?",
          answer:
            "Non. La fête de la Fédération Wallonie-Bruxelles, comme le 11 juillet côté flamand ou le 15 novembre côté germanophone, concerne surtout le secteur public et l'enseignement de cette Communauté. Dans le privé, les dix jours fériés légaux sont les mêmes dans tout le pays.",
        },
        {
          question: "Qui décide des ponts ?",
          answer:
            "Vous introduisez vos jours, l'employeur peut les refuser pour l'organisation du travail. Dans pas mal de secteurs, certains ponts sont fixés collectivement. Le règlement de travail tranche, et les dates les plus demandées partent tôt.",
        },
      ],
      otherYears: "Autres années",
      otherRegions: "",
      calculator: "Composer votre plan",
      calculatorLink: "Ouvrir le planificateur",
      publicHolidays: "Jours fériés",
      regionalHolidays: "Jours fériés régionaux",
      home: "Accueil",
      withBudget: "Avec {budget} jours.",
      adjustHint: "Ajustez les dates à votre horaire.",
      extraRegional: "En {region}, {count} jours fériés s'ajoutent au calendrier national.",
    },
  },

  "nl-BE": {
    code: "nl-BE",
    lang: "nl",
    country: "BE",
    bridgeTerm: "brugdagen",
    slug: "brugdagen",
    defaultBudget: 20,
    translations: {
      pageTitle: "Brugdagen {year} in België: van {leave} verlofdagen naar {total} vrije dagen",
      pageDescription:
        "De beste brugdagen van {year} in België. Met {leave} verlofdagen op de juiste data kom je aan {total} vrije dagen.",
      h1: "Brugdagen {year} in België",
      h1Region: "Brugdagen {year} in {region}",
      holidaysHeading: "Feestdagen {year}",
      bestPlansHeading: "De beste plannen {year}",
      howItWorksHeading: "Zo pak je een brugdag aan",
      faqHeading: "Veelgestelde vragen",
      leaveDays: "verlofdagen",
      daysOff: "vrije dagen",
      totalDays: "dagen vrij",
      bookTheseDays: "Neem deze dagen op",
      result: "Resultaat",
      intro:
        "In België hangt {year} af van een paar goed gekozen brugdagen. Met {budget} verlofdagen op de juiste data kom je aan {total} vrije dagen, een factor {multiplier}×.",
      faq: [
        {
          question: "Wat is een brugdag?",
          answer:
            "Een brugdag is een werkdag die tussen een feestdag en het weekend valt. Neem je die op als verlof, dan krijg je een langer stuk aaneen vrij. Valt een feestdag op donderdag, dan is de vrijdag de brugdag en ben je van donderdag tot en met zondag vrij.",
        },
        {
          question: "Op hoeveel verlofdagen heb ik recht?",
          answer:
            "Bij een voltijdse vijfdagenweek heb je recht op 20 wettelijke vakantiedagen. In sommige sectoren komen daar dagen bij. De tien wettelijke feestdagen staan daar los van: die gaan niet van je verlof af.",
        },
        {
          question: "Wat als een feestdag in het weekend valt?",
          answer:
            "Valt een feestdag op een zondag, of op een dag waarop je in de onderneming normaal niet werkt, dan moet die vervangen worden. De vervangingsdag legt je paritair comité of je werkgever vast, in principe vóór 15 december van het jaar ervoor. Deze kalender toont de wettelijke data, niet de vervangingsdag van jouw bedrijf.",
        },
        {
          question: "Zijn 11 juli en 27 september overal vrij?",
          answer:
            "Nee. De feestdag van de Vlaamse Gemeenschap, die van de Franse Gemeenschap en die van de Duitstalige Gemeenschap gelden vooral voor ambtenaren en onderwijs van die gemeenschap. In de privésector zijn de tien wettelijke feestdagen overal dezelfde.",
        },
        {
          question: "Kan mijn werkgever een brugdag weigeren?",
          answer:
            "Ja, als de organisatie van het werk dat vraagt. In veel sectoren worden sommige brugdagen collectief vastgelegd in het arbeidsreglement. Vraag de populaire data op tijd aan, liefst zodra de verlofplanning opengaat.",
        },
      ],
      otherYears: "Andere jaren",
      otherRegions: "",
      calculator: "Stel je eigen plan op",
      calculatorLink: "Naar de planner",
      publicHolidays: "Feestdagen",
      regionalHolidays: "Regionale feestdagen",
      home: "Start",
      withBudget: "Met {budget} dagen.",
      adjustHint: "Pas de dagen aan je eigen uurrooster aan.",
      extraRegional: "In {region} komen er {count} feestdagen bij bovenop de nationale.",
    },
  },

  "fr-LU": {
    code: "fr-LU",
    lang: "fr",
    country: "LU",
    bridgeTerm: "ponts",
    slug: "ponts",
    defaultBudget: 26,
    translations: {
      pageTitle: "Ponts {year} au Luxembourg : {leave} jours de congé pour {total} jours de repos",
      pageDescription:
        "Les meilleurs ponts de {year} au Luxembourg. Les {leave} jours de congé légaux, posés aux bonnes dates, donnent {total} jours de repos.",
      h1: "Ponts {year} au Luxembourg",
      h1Region: "Ponts {year} en {region}",
      holidaysHeading: "Jours fériés {year}",
      bestPlansHeading: "Les meilleurs plans {year}",
      howItWorksHeading: "Comment faire le pont",
      faqHeading: "Questions fréquentes",
      leaveDays: "jours de congé",
      daysOff: "jours de repos",
      totalDays: "jours de repos",
      bookTheseDays: "Jours à poser",
      result: "Résultat",
      intro:
        "Au Luxembourg, les {budget} jours de congé légaux de {year} couvrent {total} jours de repos si vous visez les ponts. C'est {multiplier} fois le nombre de jours posés.",
      faq: [
        {
          question: "Comment on fait le pont au Luxembourg ?",
          answer:
            "On pose le jour ouvré qui sépare un férié du week-end. Un jeudi férié plus le vendredi, et le repos court du jeudi au dimanche. L'Ascension est le cas le plus net, quand elle tombe un jeudi.",
        },
        {
          question: "Combien de jours de congé ai-je ?",
          answer:
            "Le Code du travail donne au moins 26 jours ouvrables par an à temps plein, davantage que les 25 jours français. Les jours fériés légaux s'y ajoutent, dont la Journée de l'Europe le 9 mai et la Fête nationale le 23 juin.",
        },
        {
          question: "La Fête nationale fait-elle un bon pont ?",
          answer:
            "Le 23 juin est fixe. S'il tombe un mardi ou un jeudi, un seul jour relie le week-end. S'il tombe un mercredi, il en faut deux. Le plan de l'année affichée donne le rendement exact, sans qu'on ait à recompter.",
        },
        {
          question: "Mon employeur peut-il refuser ?",
          answer:
            "Les congés se fixent d'un commun accord. L'employeur peut les refuser pour les besoins du service, en particulier autour de l'Ascension et de la Fête nationale, où tout le monde a la même idée. Posez la demande dès que le planning s'ouvre.",
        },
      ],
      otherYears: "Autres années",
      otherRegions: "",
      calculator: "Composer votre plan",
      calculatorLink: "Ouvrir le planificateur",
      publicHolidays: "Jours fériés",
      regionalHolidays: "Jours fériés locaux",
      home: "Accueil",
      withBudget: "Avec {budget} jours.",
      adjustHint: "Ajustez le plan à votre contrat.",
      extraRegional: "En {region}, {count} jours fériés s'ajoutent au calendrier national.",
    },
  },

  "es-ES": {
    code: "es-ES",
    lang: "es",
    country: "ES",
    bridgeTerm: "puentes",
    slug: "puentes",
    defaultBudget: 22,
    translations: {
      pageTitle: "Puentes {year}{region}: {leave} días de vacaciones y {total} días libres",
      pageDescription:
        "Los mejores puentes de {year}{region}. Con {leave} días de vacaciones bien puestos llegas a {total} días libres.",
      h1: "Puentes {year}",
      h1Region: "Puentes {year} en {region}",
      holidaysHeading: "Festivos {year}",
      bestPlansHeading: "Los mejores planes {year}",
      howItWorksHeading: "Cómo aprovechar los puentes",
      faqHeading: "Preguntas frecuentes",
      leaveDays: "días de vacaciones",
      daysOff: "días libres",
      totalDays: "días libres",
      bookTheseDays: "Días que conviene coger",
      result: "Resultado",
      intro:
        "En {year} los festivos caen como caen. Con {budget} días de vacaciones colocados en los puentes llegas a {total} días libres, un rendimiento de {multiplier}×.",
      faq: [
        {
          question: "¿Qué es un puente?",
          answer:
            "Es el día laborable que queda entre un festivo y el fin de semana. Te lo coges de vacaciones y unes el festivo al sábado y al domingo. Si el festivo cae en jueves, el viernes es el puente: cuatro días libres por uno de vacaciones.",
        },
        {
          question: "¿Cuántos días de vacaciones me corresponden?",
          answer:
            "El estatuto marca un mínimo de 30 días naturales al año. En una semana de lunes a viernes eso suele ser 22 días laborables, y el convenio puede mejorar la cifra. Esta página parte de 22: cámbiala si tu convenio da más.",
        },
        {
          question: "¿Los festivos son iguales en toda España?",
          answer:
            "No. Hay festivos nacionales, los de cada comunidad y dos festivos locales que fija el ayuntamiento. Aquí están los nacionales y los autonómicos, Ceuta y Melilla incluidas. Los de tu municipio no salen: míralos en el calendario laboral de tu provincia cuando se publique.",
        },
        {
          question: "¿Qué pasa si un festivo cae en domingo?",
          answer:
            "En muchas comunidades se traslada al lunes, o a otro día que marca el calendario laboral de ese año. Por eso el Día de la Comunidad de Madrid, el 2 de mayo, pasa al lunes cuando cae en domingo. El traslado ya está metido en el calendario de cada comunidad cuando la fuente lo publica así.",
        },
        {
          question: "¿Conviene hacer todos los puentes?",
          answer:
            "No siempre. A veces compensa guardar días para un bloque largo, Semana Santa o diciembre, en vez de gastarlos en todos los puentes de cuatro días. Los planes de arriba comparan varios presupuestos con el calendario de esta página.",
        },
      ],
      otherYears: "Otros años",
      otherRegions: "Por comunidad",
      calculator: "Arma tu propio plan",
      calculatorLink: "Abrir el planificador",
      publicHolidays: "Festivos nacionales",
      regionalHolidays: "Festivos autonómicos",
      home: "Inicio",
      withBudget: "Con {budget} días.",
      adjustHint: "Ajusta los días a tu convenio y a tu calendario.",
      extraRegional: "Además del calendario nacional, {region} suma {count} festivos propios.",
    },
  },

  "it-IT": {
    code: "it-IT",
    lang: "it",
    country: "IT",
    bridgeTerm: "ponti",
    slug: "ponti",
    defaultBudget: 20,
    translations: {
      pageTitle: "Ponti {year}: {leave} giorni di ferie diventano {total} giorni liberi",
      pageDescription:
        "I ponti migliori del {year} in Italia. Con {leave} giorni di ferie nei punti giusti arrivi a {total} giorni liberi.",
      h1: "Ponti {year}",
      h1Region: "Ponti {year} in {region}",
      holidaysHeading: "Festività {year}",
      bestPlansHeading: "I piani migliori {year}",
      howItWorksHeading: "Come si fa un ponte",
      faqHeading: "Domande frequenti",
      leaveDays: "giorni di ferie",
      daysOff: "giorni liberi",
      totalDays: "giorni liberi",
      bookTheseDays: "Giorni da prendere",
      result: "Risultato",
      intro:
        "Nel {year} i ponti fanno la differenza. Con {budget} giorni di ferie messi nei punti giusti arrivi a {total} giorni liberi, {multiplier} volte i giorni che chiedi.",
      faq: [
        {
          question: "Che cos'è un ponte?",
          answer:
            "È il giorno lavorativo fra una festa e il weekend. Lo prendi di ferie e allunghi il riposo. Se la festa cade di giovedì, il venerdì è il ponte: quattro giorni liberi con un solo giorno di ferie.",
        },
        {
          question: "Quanti giorni di ferie ho?",
          answer:
            "Il minimo di legge è quattro settimane. Su una settimana di cinque giorni sono 20 giorni lavorativi. Molti contratti nazionali danno di più, spesso intorno ai 26. La pagina parte da 20: alza il numero se il tuo contratto è più generoso.",
        },
        {
          question: "I santi patroni ci sono?",
          answer:
            "No. Il santo patrono del comune è festivo solo lì e non entra nel calendario nazionale. In Alto Adige, in più, il lunedì di Pentecoste è festivo: nel resto d'Italia no. Se ti riguarda, contalo a mano sopra questo piano.",
        },
        {
          question: "Ferragosto si può allungare?",
          answer:
            "Il 15 agosto è il ponte che guardano tutti. Se cade di martedì o di giovedì basta un giorno; se cade di mercoledì ne servono due per attaccare il weekend. Il piano dell'anno in pagina dice quale delle due è, senza doverlo ricalcolare.",
        },
        {
          question: "Il datore può dire di no?",
          answer:
            "Le ferie si concordano. L'azienda può rifiutare un periodo per esigenze di servizio, soprattutto ad agosto, quando la richiesta si concentra. Chi chiede prima, di solito, se lo prende.",
        },
      ],
      otherYears: "Altri anni",
      otherRegions: "",
      calculator: "Componi il tuo piano",
      calculatorLink: "Apri il pianificatore",
      publicHolidays: "Festività nazionali",
      regionalHolidays: "Festività locali",
      home: "Pianificatore",
      withBudget: "Con {budget} giorni.",
      adjustHint: "Adatta il piano ai giorni del tuo contratto.",
      extraRegional: "In {region} si aggiungono {count} festività rispetto al calendario nazionale.",
    },
  },

  "pt-PT": {
    code: "pt-PT",
    lang: "pt",
    country: "PT",
    bridgeTerm: "pontes",
    slug: "pontes",
    defaultBudget: 22,
    translations: {
      pageTitle: "Pontes {year}: {leave} dias de férias dão {total} dias de descanso",
      pageDescription:
        "As melhores pontes de {year} em Portugal. Com {leave} dias de férias nos sítios certos chegas a {total} dias de descanso.",
      h1: "Pontes {year}",
      h1Region: "Pontes {year} em {region}",
      holidaysHeading: "Feriados {year}",
      bestPlansHeading: "Os melhores planos {year}",
      howItWorksHeading: "Como fazer a ponte",
      faqHeading: "Perguntas frequentes",
      leaveDays: "dias de férias",
      daysOff: "dias de descanso",
      totalDays: "dias de descanso",
      bookTheseDays: "Dias a marcar",
      result: "Resultado",
      intro:
        "Em {year}, as pontes é que decidem. Com {budget} dias de férias nos sítios certos chegas a {total} dias de descanso, {multiplier} vezes os dias que gastas.",
      faq: [
        {
          question: "O que é fazer a ponte?",
          answer:
            "É tirares o dia útil que fica entre um feriado e o fim de semana. Se o feriado calha à quinta, a sexta é a ponte: ficas com quinta a domingo livres e só gastas um dia de férias.",
        },
        {
          question: "Quantos dias de férias tenho?",
          answer:
            "A lei dá 22 dias úteis por ano a quem não faltou injustificadamente no ano anterior. Com faltas, o número pode descer. Os feriados obrigatórios somam-se a esses 22, não saem deles.",
        },
        {
          question: "O Carnaval e o feriado municipal contam?",
          answer:
            "A terça-feira de Carnaval não é feriado nacional. Muitas empresas fecham à mesma, mas não são obrigadas. O feriado municipal também não está nesta lista: muda de concelho para concelho. Se a tua empresa dá esses dias, o descanso real fica acima do plano.",
        },
        {
          question: "E se o feriado calha ao fim de semana?",
          answer:
            "Em Portugal o feriado não passa para segunda. Se calha ao sábado ou ao domingo, o dia extra perde-se. Compensa guardar férias para os feriados que caem à terça ou à quinta, que são os que fazem ponte com um só dia.",
        },
        {
          question: "A entidade patronal pode recusar a ponte?",
          answer:
            "As férias marcam-se por acordo. A empresa pode recusar datas por necessidades de serviço. As pontes mais óbvias esgotam cedo: pede-as quando o mapa de férias abrir.",
        },
      ],
      otherYears: "Outros anos",
      otherRegions: "",
      calculator: "Faz o teu plano",
      calculatorLink: "Abrir o planeador",
      publicHolidays: "Feriados",
      regionalHolidays: "Feriados locais",
      home: "Início",
      withBudget: "Com {budget} dias.",
      adjustHint: "Ajusta o plano aos teus dias e ao teu concelho.",
      extraRegional: "Em {region} somam-se {count} feriados ao calendário nacional.",
    },
  },

  "cs-CZ": {
    code: "cs-CZ",
    lang: "cs",
    country: "CZ",
    bridgeTerm: "prodloužené víkendy",
    slug: "prodlouzene-vikendy",
    defaultBudget: 20,
    translations: {
      pageTitle: "Prodloužené víkendy {year}: z {leave} dnů dovolené je {total} volných dnů",
      pageDescription:
        "Nejlepší prodloužené víkendy {year} v Česku. Z {leave} dnů dovolené na správných datech uděláš {total} volných dnů.",
      h1: "Prodloužené víkendy {year}",
      h1Region: "Prodloužené víkendy {year} v {region}",
      holidaysHeading: "Státní svátky {year}",
      bestPlansHeading: "Nejlepší plány {year}",
      howItWorksHeading: "Jak si prodloužit víkend",
      faqHeading: "Časté otázky",
      leaveDays: "dny dovolené",
      daysOff: "volné dny",
      totalDays: "volných dnů",
      bookTheseDays: "Dny, které se vyplatí vzít",
      result: "Výsledek",
      intro:
        "V roce {year} rozhoduje, kam ty dny dovolené položíš. Z {budget} dní dovolené se dá vytěžit {total} volných dní, tedy {multiplier}×.",
      faq: [
        {
          question: "Co je to prodloužený víkend?",
          answer:
            "Den dovolené mezi státním svátkem a víkendem. Když svátek vyjde na čtvrtek, stačí pátek a máš volno od čtvrtka do neděle. Když vyjde na úterý, bereš pondělí. Jeden den dovolené, čtyři dny volna.",
        },
        {
          question: "Kolik dnů dovolené mám?",
          answer:
            "Zákoník práce dává nejméně 4 týdny, tedy 20 dní při pětidenním úvazku. Ve veřejném sektoru a u části zaměstnavatelů je to 5 týdnů, 25 dní. Tahle stránka počítá s 20 dny. Číslo si v plánovači změníš.",
        },
        {
          question: "Když svátek vyjde na víkend, dostanu náhradu?",
          answer:
            "Ne. Svátek, který připadne na sobotu nebo neděli, se v Česku nenahrazuje jiným dnem. Květen se tak v některých letech skoro smaže, protože Svátek práce i Den vítězství umí spadnout na sobotu.",
        },
        {
          question: "Které svátky se vyplatí spojit?",
          answer:
            "Nejvíc dají svátky v úterý a ve čtvrtek. Dva svátky hned po sobě, jako Cyril a Metoděj a Jan Hus na začátku července, jdou spojit do delšího bloku. Plány nahoře to spočítají pro několik rozpočtů dovolené.",
        },
        {
          question: "Může mi zaměstnavatel ten termín odmítnout?",
          answer:
            "Termín dovolené určuje zaměstnavatel podle písemného rozvrhu a má přihlížet k tvým zájmům. Na oblíbené prodloužené víkendy proto žádej brzo, ideálně když se rozvrh na příští rok otevírá.",
        },
      ],
      otherYears: "Další roky",
      otherRegions: "",
      calculator: "Sestav si vlastní plán",
      calculatorLink: "Otevřít plánovač",
      publicHolidays: "Státní svátky",
      regionalHolidays: "Regionální svátky",
      home: "Plánovač",
      withBudget: "Při {budget} dnech.",
      adjustHint: "Uprav si počet dní podle své smlouvy.",
      extraRegional: "V regionu {region} přibývá {count} svátků navíc k celostátním.",
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
  AT: true, // Pages only if a Bundesland calendar differs from the national set.
  CH: true, // Switzerland - 26 cantons
  ES: true, // Spain - autonomous communities whose calendars differ
} as const;

export type RegionalCountry = keyof typeof regionalCountries;

export function isRegionalCountry(country: string): country is RegionalCountry {
  return country in regionalCountries;
}
