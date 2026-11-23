/**
 * Extra, computed content for the strongest seasonal landing pages:
 * the German state pages and Germany hub (de-DE), Austria (de-AT),
 * the Netherlands (nl-NL), and Sweden (sv-SE).
 *
 * Every number comes from the holiday files and the bridge engine.
 * The copy only states what the data says, plus a few fixed legal facts.
 */
import { NL_REGIONS, NL_SCHOOL_HOLIDAYS, NL_SCHOOL_YEARS, type NlRegion } from "~/data/nlSchoolHolidays";
import { type BridgeCluster, listBridgeClusters } from "./bridgeFacts";
import { type DayNum, fromIso, parts, toIso, weekdayMon0 } from "./dates";
import { appliesTo, type HolidayFile, holidayName } from "./holidays";
import type { Break } from "./planner/types";
import { regionCopy } from "./regionLabels";
import type { FaqItem } from "./seasonalSeo";
import { defaultWorkWeek } from "./weekends";

/** Locales whose national seasonal page carries the bridge table and the extra FAQ. */
export const LANDING_LOCALES = ["de-DE", "de-AT", "nl-NL", "sv-SE"] as const;
export type LandingLocale = (typeof LANDING_LOCALES)[number];

export function isLandingLocale(code: string): code is LandingLocale {
  return (LANDING_LOCALES as readonly string[]).includes(code);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let hit = formatters.get(key);
  if (!hit) {
    hit = new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
    formatters.set(key, hit);
  }
  return hit;
}

function asDate(day: DayNum): Date {
  return new Date(day * 86_400_000);
}

/** "Donnerstag, 27. Mai", "torsdag 27 maj", "donderdag 27 mei". */
export function longDate(locale: string, day: DayNum): string {
  return formatter(locale, { weekday: "long", day: "numeric", month: "long" }).format(asDate(day));
}

/** "27. Mai", "27 maj", "27 mei". */
export function dayMonth(locale: string, day: DayNum): string {
  return formatter(locale, { day: "numeric", month: "long" }).format(asDate(day));
}

/** "Samstag", "lördag". */
export function weekdayName(locale: string, day: DayNum): string {
  return formatter(locale, { weekday: "long" }).format(asDate(day));
}

export function monthName(locale: string, month: number): string {
  return formatter(locale, { month: "long" }).format(new Date(Date.UTC(2027, month - 1, 1)));
}

/** "27. Mai – 30. Mai", or a single day. */
export function dateRange(locale: string, start: DayNum, end: DayNum): string {
  if (start === end) return dayMonth(locale, start);
  return `${dayMonth(locale, start)} – ${dayMonth(locale, end)}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function joinList(items: string[], and: string): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Holidays and bridges for one calendar
// ---------------------------------------------------------------------------

export interface DayHoliday {
  date: string;
  day: DayNum;
  name: string;
  /** Monday = 0 … Sunday = 6. */
  weekday: number;
  /** Off a normal working day (on a Monday–Friday for a five-day week). */
  onWorkday: boolean;
  /** Only some regions observe it. */
  regional: boolean;
}

/** Holidays that apply to a region (or the national set), one entry per date. */
export function holidaysFor(
  file: HolidayFile,
  country: string,
  region: string | null,
  locale: string,
): DayHoliday[] {
  const workWeek = defaultWorkWeek(country);
  const byDate = new Map<string, DayHoliday>();
  for (const holiday of file.holidays) {
    if (!appliesTo(holiday, region)) continue;
    const existing = byDate.get(holiday.date);
    const name = holidayName(holiday, locale);
    if (existing) {
      if (!existing.name.includes(name)) existing.name = `${existing.name} / ${name}`;
      continue;
    }
    const day = fromIso(holiday.date);
    const weekday = weekdayMon0(day);
    byDate.set(holiday.date, {
      date: holiday.date,
      day,
      name,
      weekday,
      onWorkday: workWeek[weekday] === true,
      regional: holiday.national === false || Boolean(holiday.regions),
    });
  }
  return [...byDate.values()].sort((a, b) => a.day - b.day);
}

export interface BridgeRow {
  /** ISO leave days, ascending. */
  days: string[];
  /** The leave days written out, for example "Freitag, 7. Mai". */
  daysLabel: string;
  /** One label per leave day. */
  dayLabels: string[];
  holidays: string[];
  leave: number;
  length: number;
  start: DayNum;
  end: DayNum;
  range: string;
  /** Days off per leave day, one decimal. */
  ratio: string;
  /** Month (1–12) of the first leave day. */
  month: number;
}

function toRow(cluster: BridgeCluster, locale: string, and: string): BridgeRow {
  const days = cluster.days.map(fromIso);
  const dayLabels = days.map((day) => longDate(locale, day));
  return {
    days: cluster.days,
    daysLabel: joinList(dayLabels, and),
    dayLabels,
    holidays: cluster.holidays,
    leave: cluster.leave,
    length: cluster.length,
    start: cluster.start,
    end: cluster.end,
    range: dateRange(locale, cluster.start, cluster.end),
    ratio: (cluster.length / cluster.leave).toFixed(1),
    month: parts(days[0] ?? cluster.start).month,
  };
}

/** Every bridge in the year, in calendar order. */
export function bridgeRows(
  file: HolidayFile,
  country: string,
  region: string | null,
  locale: string,
): BridgeRow[] {
  const and = AND[locale] ?? "and";
  return listBridgeClusters(file, country, region, locale)
    .map((cluster) => toRow(cluster, locale, and))
    .sort((a, b) => a.start - b.start || (a.days[0] ?? "").localeCompare(b.days[0] ?? ""));
}

const AND: Record<string, string> = { "de-DE": "und", "de-AT": "und", "nl-NL": "en", "sv-SE": "och" };

/** Calendar days off in a row around a day that is already off (weekend or holiday), without leave. */
function freeRun(file: HolidayFile, country: string, region: string | null, day: DayNum): number {
  const workWeek = defaultWorkWeek(country);
  const holidays = new Set(file.holidays.filter((h) => appliesTo(h, region)).map((h) => fromIso(h.date)));
  const off = (d: DayNum) => holidays.has(d) || workWeek[weekdayMon0(d)] !== true;
  let start = day;
  let end = day;
  while (off(start - 1)) start -= 1;
  while (off(end + 1)) end += 1;
  return end - start + 1;
}

// ---------------------------------------------------------------------------
// Bridge table copy
// ---------------------------------------------------------------------------

export interface BridgeTableCopy {
  heading: string;
  intro: string;
  none: string;
  colTake: string;
  colHoliday: string;
  colLeave: string;
  colOff: string;
  colRatio: string;
  leave: (n: number) => string;
  off: (n: number) => string;
}

export function bridgeTableCopy(
  locale: LandingLocale,
  year: number,
  where: string,
  count: number,
): BridgeTableCopy {
  switch (locale) {
    case "de-DE":
    case "de-AT": {
      const term = locale === "de-AT" ? "Fenstertag" : "Brückentag";
      const terms = locale === "de-AT" ? "Fenstertage" : "Brückentage";
      return {
        heading: `Alle ${terms} ${year} ${where} im Überblick`,
        intro: `${count === 1 ? `Dieser ${term}` : `Diese ${count} Möglichkeiten`} verbinden ${year} ${where} einen Feiertag mit dem Wochenende. Die Tabelle zeigt, welche Urlaubstage du nimmst und wie lange du dann am Stück frei hast.`,
        none: `${year} gibt es ${where} keinen ${term}: Die Feiertage liegen am Wochenende oder direkt daneben.`,
        colTake: "Urlaub nehmen am",
        colHoliday: "Feiertag",
        colLeave: "Urlaubstage",
        colOff: "Frei am Stück",
        colRatio: "Faktor",
        leave: (n) => plural(n, "Urlaubstag", "Urlaubstage"),
        off: (n) => plural(n, "Tag", "Tage"),
      };
    }
    case "nl-NL":
      return {
        heading: `Alle brugdagen ${year} ${where} op een rij`,
        intro: `Met ${count === 1 ? "deze brugdag" : `deze ${count} opties`} koppel je ${year} ${where} een feestdag aan het weekend. De tabel laat zien welke vakantiedagen je opneemt en hoe lang je dan aaneengesloten vrij bent.`,
        none: `Er zijn ${year} ${where} geen brugdagen: de feestdagen vallen in het weekend of er direct tegenaan.`,
        colTake: "Vrij nemen op",
        colHoliday: "Feestdag",
        colLeave: "Vakantiedagen",
        colOff: "Aaneengesloten vrij",
        colRatio: "Factor",
        leave: (n) => plural(n, "vakantiedag", "vakantiedagen"),
        off: (n) => plural(n, "dag", "dagen"),
      };
    case "sv-SE":
      return {
        heading: `Alla klämdagar ${year} ${where}`,
        intro: `${count === 1 ? "Den här klämdagen" : `De här ${count} alternativen`} kopplar ${year} en helgdag till helgen. Tabellen visar vilka semesterdagar du tar och hur länge du sedan är ledig i ett sträck.`,
        none: `Det finns inga klämdagar ${where} ${year}: helgdagarna ligger på en helg eller direkt intill den.`,
        colTake: "Ta ledigt",
        colHoliday: "Helgdag",
        colLeave: "Semesterdagar",
        colOff: "Ledigt i ett sträck",
        colRatio: "Faktor",
        leave: (n) => plural(n, "semesterdag", "semesterdagar"),
        off: (n) => plural(n, "dag", "dagar"),
      };
  }
}

// ---------------------------------------------------------------------------
// Weekend holidays FAQ (national pages)
// ---------------------------------------------------------------------------

export function weekendHolidayFaq(
  locale: LandingLocale,
  file: HolidayFile,
  country: string,
  region: string | null,
  year: number,
  where: string,
): FaqItem {
  const list = holidaysFor(file, country, region, locale).filter((h) => !h.onWorkday);
  const items = list.map((h) => `${h.name} (${longDate(locale, h.day)})`);
  const and = AND[locale] ?? "and";
  switch (locale) {
    case "de-DE":
    case "de-AT":
      return {
        question: `Welche Feiertage fallen ${year} ${where} auf ein Wochenende?`,
        answer:
          items.length === 0
            ? `${year} fällt ${where} kein Feiertag auf ein Wochenende.`
            : `${joinList(items, and)} ${items.length === 1 ? "fällt" : "fallen"} ${year} ${where} auf ein Wochenende. Einen Ersatz-Feiertag gibt es dafür nicht, ${items.length === 1 ? "er bringt" : "sie bringen"} also keinen zusätzlichen freien Tag.`,
      };
    case "nl-NL":
      return {
        question: `Welke feestdagen vallen ${year} ${where} in het weekend?`,
        answer:
          items.length === 0
            ? `In ${year} valt ${where} geen feestdag in het weekend.`
            : `${joinList(items, and)} ${items.length === 1 ? "valt" : "vallen"} ${year} in het weekend. Daar krijg je geen vervangende vrije dag voor, dus ${items.length === 1 ? "die levert" : "die leveren"} geen extra vrije dag op.`,
      };
    case "sv-SE":
      return {
        question: `Vilka helgdagar infaller på en lördag eller söndag ${year}?`,
        answer:
          items.length === 0
            ? `Ingen helgdag infaller på en lördag eller söndag ${year}.`
            : `${capitalize(joinList(items, and))} infaller på en helg ${year}. Det finns ingen ersättningsdag, så de ger ingen extra ledig dag.`,
      };
  }
}

// ---------------------------------------------------------------------------
// Germany: states
// ---------------------------------------------------------------------------

export interface StateSummary {
  code: string;
  name: string;
  slug: string;
  /** Statutory holidays in the state this year. */
  total: number;
  /** Of those, on Monday–Friday. */
  workdays: number;
  /** Holidays on top of the national set. */
  extra: DayHoliday[];
  /** Unique working days that belong to a one- or two-day bridge. */
  bridgeDays: number;
  best: BridgeRow | null;
}

export function germanStateSummary(file: HolidayFile, code: string, sourceName: string): StateSummary {
  const copy = regionCopy("DE", code, sourceName);
  const list = holidaysFor(file, "DE", code, "de-DE");
  const national = new Set(holidaysFor(file, "DE", null, "de-DE").map((h) => h.date));
  const clusters = listBridgeClusters(file, "DE", code, "de-DE");
  const best = clusters[0];
  return {
    code,
    name: copy.name,
    slug: copy.slug,
    total: list.length,
    workdays: list.filter((h) => h.onWorkday).length,
    extra: list.filter((h) => !national.has(h.date)),
    bridgeDays: new Set(clusters.flatMap((c) => c.days)).size,
    best: best ? toRow(best, "de-DE", "und") : null,
  };
}

export function germanStateSummaries(file: HolidayFile, regions: Record<string, string>): StateSummary[] {
  return Object.entries(regions)
    .map(([code, name]) => germanStateSummary(file, code, name))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** "im Saarland", "in Bayern". */
export function inState(name: string): string {
  return name === "Saarland" ? "im Saarland" : `in ${name}`;
}

/** "das Saarland", "Bayern", as a sentence subject. */
function stateSubject(name: string): string {
  return name === "Saarland" ? "das Saarland" : name;
}

const TITLE_TAILS = [": alle Termine und Feiertage", ": Termine und Feiertage", ": Feiertage", ""];

/** "Brückentage 2027 Bayern: alle Termine und Feiertage", shortened to stay within 60 characters. */
export function germanStateTitle(name: string, year: number): string {
  const head = `Brückentage ${year} ${name}`;
  for (const tail of TITLE_TAILS) {
    const title = `${head}${tail}`;
    if (title.length <= 60) return title;
  }
  return head;
}

export function germanStateH1(name: string, year: number): string {
  return `Brückentage ${year} ${name}`;
}

export function germanStateDescription(
  state: StateSummary,
  year: number,
  budget: number,
  daysOff: number,
): string {
  const extras = state.extra.map((h) => h.name);
  const including = extras.length > 0 ? `, darunter ${joinList(extras, "und")}` : "";
  return `Brückentage ${year} ${state.name}: ${plural(state.bridgeDays, "Brückentag", "Brückentage")} und ${state.total} Feiertage${including}. Aus ${budget} Urlaubstagen werden ${daysOff} freie Tage.`;
}

/** One sentence per extra state holiday, saying what it does for time off this year. */
function extraHolidayEffect(
  file: HolidayFile,
  state: StateSummary,
  holiday: DayHoliday,
  clusters: BridgeRow[],
  year: number,
): string {
  const when = longDate("de-DE", holiday.day);
  if (/sonntag/i.test(holiday.name)) {
    return `${holiday.name} ist ${inState(state.name)} ein gesetzlicher Feiertag, liegt aber immer auf einem Sonntag.`;
  }
  if (!holiday.onWorkday) {
    return `${holiday.name} fällt ${year} auf einen ${weekdayName("de-DE", holiday.day)} (${dayMonth("de-DE", holiday.day)}) und bringt deshalb keinen zusätzlichen freien Tag.`;
  }
  if (holiday.weekday === 0 || holiday.weekday === 4) {
    const run = freeRun(file, "DE", state.code, holiday.day);
    return `${holiday.name} am ${when}, verlängert das Wochenende ohne Urlaubstag auf ${run} freie Tage.`;
  }
  const bridge = clusters.find((row) => row.holidays.includes(holiday.name));
  if (!bridge) return `${holiday.name} liegt ${year} auf ${when}.`;
  const leave =
    bridge.leave === 1 ? `ein Urlaubstag am ${bridge.daysLabel},` : `zwei Urlaubstage (${bridge.daysLabel})`;
  return `Für ${holiday.name} am ${when}, ${bridge.leave === 1 ? "reicht" : "reichen"} ${leave} für ${bridge.length} freie Tage am Stück (${bridge.range}).`;
}

export interface StateLanding {
  title: string;
  h1: string;
  description: string;
  /** Section heading over the state-specific paragraphs. */
  heading: string;
  paragraphs: string[];
  faq: FaqItem;
}

export function germanStateLanding(input: {
  file: HolidayFile;
  code: string;
  sourceName: string;
  year: number;
  budget: number;
  daysOff: number;
}): StateLanding {
  const { file, year } = input;
  const state = germanStateSummary(file, input.code, input.sourceName);
  const national = holidaysFor(file, "DE", null, "de-DE").length;
  const rows = bridgeRows(file, "DE", input.code, "de-DE");
  const ranked = listBridgeClusters(file, "DE", input.code, "de-DE").map((c) => toRow(c, "de-DE", "und"));
  const extras = state.extra.map((h) => `${h.name} (${longDate("de-DE", h.day)})`);
  const paragraphs: string[] = [];

  if (state.extra.length === 0) {
    paragraphs.push(
      `${capitalize(inState(state.name))} gelten ${year} die ${national} bundesweiten Feiertage, ohne zusätzlichen Landesfeiertag.`,
    );
  } else {
    const added =
      state.extra.length === 1
        ? `kommt ${inState(state.name)} ${year} ein landesweiter Feiertag hinzu`
        : `kommen ${inState(state.name)} ${year} ${state.extra.length} landesweite Feiertage hinzu`;
    paragraphs.push(`Zu den ${national} bundesweiten Feiertagen ${added}: ${joinList(extras, "und")}.`);
  }
  for (const holiday of state.extra) {
    paragraphs.push(extraHolidayEffect(file, state, holiday, ranked, year));
  }
  if (input.code === "BY") {
    const assumption = fromIso(`${year}-08-15`);
    const weekend = weekdayMon0(assumption) >= 5;
    paragraphs.push(
      `Mariä Himmelfahrt (15. August) ist in Bayern kein landesweiter Feiertag: Er gilt nur in Gemeinden mit überwiegend katholischer Bevölkerung und ist hier deshalb nicht eingerechnet.${weekend ? ` ${year} fällt der Tag ohnehin auf einen ${weekdayName("de-DE", assumption)}.` : ""}`,
    );
  }
  const workdayText =
    state.workdays === 1 ? "liegt einer auf einem Werktag" : `liegen ${state.workdays} auf einem Werktag`;
  paragraphs.push(
    `Insgesamt hat ${stateSubject(state.name)} ${year} ${state.total} gesetzliche Feiertage. Davon ${workdayText} von Montag bis Freitag, und ${plural(rows.length, "Brücke", "Brücken")} mit einem oder zwei Urlaubstagen ${rows.length === 1 ? "verbindet" : "verbinden"} einen Feiertag mit dem Wochenende.`,
  );

  const answer =
    state.extra.length === 0
      ? `${capitalize(stateSubject(state.name))} hat ${year} keine zusätzlichen Feiertage, es gelten die ${national} bundesweiten.`
      : `${capitalize(stateSubject(state.name))} hat ${year} ${state.total} gesetzliche Feiertage, ${state.extra.length} mehr als die ${national} bundesweiten: ${joinList(extras, "und")}. ${state.workdays} davon fallen auf einen Werktag von Montag bis Freitag.`;

  return {
    title: germanStateTitle(state.name, year),
    h1: germanStateH1(state.name, year),
    description: germanStateDescription(state, year, input.budget, input.daysOff),
    heading: `Feiertage und Brückentage ${year} ${inState(state.name)}`,
    paragraphs,
    faq: { question: `Welche zusätzlichen Feiertage hat ${stateSubject(state.name)} ${year}?`, answer },
  };
}

export const STATE_TABLE_COPY = {
  heading: (year: number) => `Brückentage ${year} nach Bundesland`,
  intro: (year: number, budget: number) =>
    `Feiertage, Brückentage und freie Tage ${year} für alle 16 Bundesländer, bei einer Fünf-Tage-Woche und ${budget} Urlaubstagen. Wähle dein Bundesland für alle Termine.`,
  state: "Bundesland",
  holidays: "Feiertage",
  workdays: "davon Mo–Fr",
  bridges: "Brückentage",
  daysOff: (budget: number) => `Freie Tage mit ${budget} Urlaubstagen`,
  hub: (year: number) => `Brückentage ${year} in Deutschland`,
};

// ---------------------------------------------------------------------------
// Netherlands: school holidays per region
// ---------------------------------------------------------------------------

export const NL_REGION_LABELS: Record<NlRegion, string> = {
  noord: "Regio Noord",
  midden: "Regio Midden",
  zuid: "Regio Zuid",
};

export interface NlPeriodRow {
  name: string;
  schoolYear: string;
  advisory: boolean;
  start: DayNum;
  end: DayNum;
  range: string;
  /** Feestdagen inside the period. */
  holidays: string[];
  /** Bridges with a leave day inside the period. */
  bridges: BridgeRow[];
}

export interface NlRegionSection {
  region: NlRegion;
  label: string;
  periods: NlPeriodRow[];
  summary: string[];
}

export interface NlSchoolSections {
  heading: string;
  intro: string[];
  regions: NlRegionSection[];
  /** Last day the published school-holiday data covers, when that is before 31 December. */
  coveredUntil: string | null;
  sources: Array<{ label: string; url: string }>;
}

export function dutchSchoolSections(file: HolidayFile, year: number): NlSchoolSections | null {
  const yearStart = fromIso(`${year}-01-01`);
  const yearEnd = fromIso(`${year}-12-31`);
  const periods = NL_SCHOOL_HOLIDAYS.filter((period) =>
    NL_REGIONS.some((region) => {
      const dates = period.regions[region];
      return fromIso(dates.end) >= yearStart && fromIso(dates.start) <= yearEnd;
    }),
  );
  if (periods.length === 0) return null;
  const holidays = holidaysFor(file, "NL", null, "nl-NL");
  const bridges = bridgeRows(file, "NL", null, "nl-NL");
  const lastEnd = Math.max(
    ...NL_SCHOOL_HOLIDAYS.map((p) => Math.max(...NL_REGIONS.map((r) => fromIso(p.regions[r].end)))),
  );

  const regions = NL_REGIONS.map((region): NlRegionSection => {
    const rows = periods
      .map((period): NlPeriodRow => {
        const start = fromIso(period.regions[region].start);
        const end = fromIso(period.regions[region].end);
        return {
          name: period.name,
          schoolYear: period.schoolYear,
          advisory: period.advisory,
          start,
          end,
          range: `${dayMonth("nl-NL", start)} ${parts(start).year} – ${dayMonth("nl-NL", end)} ${parts(end).year}`,
          holidays: holidays.filter((h) => h.day >= start && h.day <= end).map((h) => h.name),
          bridges: bridges.filter((b) => b.days.some((d) => fromIso(d) >= start && fromIso(d) <= end)),
        };
      })
      .filter((row) => row.end >= yearStart && row.start <= yearEnd);
    const label = NL_REGION_LABELS[region];
    const summary: string[] = [];
    const summer = rows.find((row) => row.name === "Zomervakantie" && parts(row.start).year === year);
    if (summer) {
      summary.push(
        `De zomervakantie ${year} in ${label.toLowerCase()} loopt van ${longDate("nl-NL", summer.start)} tot en met ${longDate("nl-NL", summer.end)}.`,
      );
    }
    const spring = rows.find((row) => row.name === "Voorjaarsvakantie" && parts(row.start).year === year);
    if (spring) {
      summary.push(
        `De voorjaarsvakantie loopt van ${longDate("nl-NL", spring.start)} tot en met ${longDate("nl-NL", spring.end)} (adviesdatum).`,
      );
    }
    const inside = rows.flatMap((row) =>
      row.bridges.map(
        (bridge) =>
          `${bridge.daysLabel} (${joinList(bridge.holidays, "en")}, in de ${row.name.toLowerCase()})`,
      ),
    );
    summary.push(
      inside.length === 0
        ? `Geen enkele brugdag van ${year} valt in een schoolvakantie van ${label.toLowerCase()}: wie brugdagen pakt, is dan vrij terwijl de scholen open zijn.`
        : `Binnen de schoolvakanties van ${label.toLowerCase()} ${inside.length === 1 ? "valt deze brugdag" : "vallen deze brugdagen"}: ${joinList(inside, "en")}.`,
    );
    return { region, label, periods: rows, summary };
  });

  return {
    heading: `Schoolvakanties en brugdagen ${year} per regio`,
    intro: [
      `Feestdagen en brugdagen zijn in heel Nederland hetzelfde. De schoolvakanties verschillen wel per regio: noord, midden en zuid. Of een brugdag in een schoolvakantie valt, hangt dus af van je regio.`,
      `Welke regio voor een school geldt, hangt af van de gemeente. De herfst-, voorjaars- en meivakantie zijn adviesdata van het ministerie van OCW: scholen mogen daarvan afwijken. De kerst- en zomervakantie liggen vast.`,
    ],
    regions,
    coveredUntil: lastEnd < yearEnd ? toIso(lastEnd) : null,
    sources: NL_SCHOOL_YEARS.map((item) => ({
      label: `Rijksoverheid: schoolvakanties ${item.schoolYear}`,
      url: item.source,
    })),
  };
}

/** 5 May is a national holiday but only a day off when a contract says so. */
export function liberationDayFaq(file: HolidayFile, year: number): FaqItem | null {
  const iso = `${year}-05-05`;
  if (file.holidays.some((h) => h.date === iso)) return null;
  return {
    question: `Is Bevrijdingsdag ${year} een vrije dag?`,
    answer: `Bevrijdingsdag valt in ${year} op ${longDate("nl-NL", fromIso(iso))}. Het is een nationale feestdag, maar of je vrij bent, hangt af van je cao of arbeidsovereenkomst. Daarom telt 5 mei in deze berekening niet als vrije dag. Ben je wel vrij, markeer de dag dan in de planner als vrije dag.`,
  };
}

// ---------------------------------------------------------------------------
// Sweden: month by month
// ---------------------------------------------------------------------------

export interface SwedishMonth {
  month: number;
  id: string;
  heading: string;
  holidays: Array<{ name: string; date: string }>;
  bridges: BridgeRow[];
  breaks: Array<{ range: string; leave: number; length: number }>;
  summary: string;
}

export function swedishMonths(
  file: HolidayFile,
  breaks: Break[],
  year: number,
  budget: number,
): SwedishMonth[] {
  const holidays = holidaysFor(file, "SE", null, "sv-SE");
  const bridges = bridgeRows(file, "SE", null, "sv-SE");
  const yearStart = fromIso(`${year}-01-01`);
  const yearEnd = fromIso(`${year}-12-31`);
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const name = monthName("sv-SE", month);
    const inMonth = holidays.filter((h) => parts(h.day).month === month);
    const monthBridges = bridges.filter((b) => b.month === month);
    const monthBreaks = breaks
      .filter((b) => b.leave > 0 && b.end >= yearStart && b.start <= yearEnd)
      .filter((b) => parts(Math.max(b.start, yearStart)).month === month)
      .map((b) => ({ range: dateRange("sv-SE", b.start, b.end), leave: b.leave, length: b.length }));
    let summary: string;
    if (inMonth.length === 0) {
      summary = `${capitalize(name)} ${year} har inga helgdagar, så varje ledig vardag kostar en semesterdag.`;
    } else if (monthBridges.length === 0) {
      summary = `${capitalize(name)} ${year} har ${plural(inMonth.length, "helgdag", "helgdagar")} men ingen klämdag: ${inMonth.length === 1 ? "den ligger" : "de ligger"} på en helg eller direkt intill den.`;
    } else {
      const days = new Set(monthBridges.flatMap((b) => b.days)).size;
      const best = [...monthBridges].sort((a, b) => b.length / b.leave - a.length / a.leave)[0];
      summary = `${capitalize(name)} ${year} har ${plural(days, "klämdag", "klämdagar")}.${best ? ` Bäst är ${best.daysLabel}: ${plural(best.leave, "semesterdag", "semesterdagar")} ger ${plural(best.length, "dag", "dagar")} ledigt (${best.range}).` : ""}`;
    }
    if (monthBreaks.length > 0) {
      summary += ` Planen med ${budget} semesterdagar lägger ${monthBreaks.length === 1 ? "en ledighet" : `${monthBreaks.length} ledigheter`} här.`;
    }
    return {
      month,
      id: name.toLowerCase(),
      heading: `Klämdagar ${name} ${year}`,
      holidays: inMonth.map((h) => ({ name: h.name, date: longDate("sv-SE", h.day) })),
      bridges: monthBridges,
      breaks: monthBreaks,
      summary,
    };
  });
}

export const SWEDISH_MONTHS_COPY = {
  heading: (year: number) => `Klämdagar ${year} månad för månad`,
  intro: (year: number, budget: number) =>
    `Här är ${year} uppdelat från januari till december: helgdagarna, klämdagarna och var planen med ${budget} semesterdagar lägger din ledighet.`,
  holidays: "Helgdagar",
  bridges: "Klämdagar",
  breaks: (budget: number) => `I planen med ${budget} semesterdagar`,
  noHolidays: "Inga helgdagar",
  bridgeLine: (b: BridgeRow) =>
    `${b.daysLabel}: ${plural(b.leave, "semesterdag", "semesterdagar")} ger ${plural(b.length, "dag", "dagar")} ledigt, ${b.range}`,
  breakLine: (b: { range: string; leave: number; length: number }) =>
    `${b.range}: ${plural(b.leave, "semesterdag", "semesterdagar")} ger ${plural(b.length, "dag", "dagar")} ledigt`,
};
