import Holidays from "date-holidays";
import type { HolidayEntry, HolidayFile } from "../../src/lib/holidays";

const DAY_MS = 86_400_000;

/** Sunday = 0. First `weekday` on or after the given month-day, as YYYY-MM-DD in UTC. */
export function weekdayOnOrAfter(year: number, month: number, day: number, weekday: number): string {
  const start = Date.UTC(year, month - 1, day);
  const delta = (weekday - new Date(start).getUTCDay() + 7) % 7;
  return new Date(start + delta * DAY_MS).toISOString().slice(0, 10);
}

/**
 * date-holidays' "weekday after MM-DD" is inclusive: when MM-DD is already that weekday the
 * holiday lands on it. That matches a window that starts on MM-DD (Swedish midsummer, All Saints).
 * It does not match a window that starts the next day (Icelandic First Day of Summer is the
 * Thursday from 19 to 25 April, but the rule "thursday after 04-18" returns 18 April).
 * Our own Midsummer Eve helper had the same class of mistake: it searched for a Saturday in
 * 19–25 June, so 2027 (19 June is a Saturday) became 18 June instead of Friday 25 June.
 */
const FLOATING_FIXES: Record<string, Array<{ name: string; date: (year: number) => string }>> = {
  SE: [
    { name: "Midsummer Eve", date: (year) => weekdayOnOrAfter(year, 6, 19, 5) },
    { name: "Midsummer Day", date: (year) => weekdayOnOrAfter(year, 6, 20, 6) },
    { name: "All Saints' Day", date: (year) => weekdayOnOrAfter(year, 10, 31, 6) },
  ],
  FI: [
    { name: "Midsummer Eve", date: (year) => weekdayOnOrAfter(year, 6, 19, 5) },
    { name: "Midsummer Day", date: (year) => weekdayOnOrAfter(year, 6, 20, 6) },
    { name: "All Saints' Day", date: (year) => weekdayOnOrAfter(year, 10, 31, 6) },
  ],
  AX: [
    { name: "Midsummer Eve", date: (year) => weekdayOnOrAfter(year, 6, 19, 5) },
    { name: "Midsummer Day", date: (year) => weekdayOnOrAfter(year, 6, 20, 6) },
  ],
  IS: [{ name: "First Day of Summer", date: (year) => weekdayOnOrAfter(year, 4, 19, 4) }],
};

interface RawDay {
  date: string;
  name: string;
  local: string;
  names: Record<string, string>;
}

/**
 * date-holidays' Ukrainian gloss for a moved day off is the infinitive "замінити день".
 * The calendar term is "перенесений вихідний". Dates stay as the source returned them.
 */
function nativeHolidayName(lang: string, name: string): string {
  if (lang !== "uk") return name;
  return name.replaceAll("(замінити день)", "(перенесений вихідний)");
}

/**
 * Country-specific de facto non-working days that aren't in date-holidays as public holidays.
 * These are days that are culturally/legally treated as days off but not marked as "public" type.
 */
const DE_FACTO_HOLIDAYS: Record<
  string,
  Array<{ month: number; day: number; name: string; local?: string }>
> = {
  SE: [
    { month: 12, day: 24, name: "Christmas Eve", local: "Julafton" },
    { month: 12, day: 31, name: "New Year's Eve", local: "Nyårsafton" },
  ],
};

/**
 * Holidays to exclude for specific countries (by name pattern).
 * Some countries in date-holidays include observances from multiple religions that aren't official public holidays.
 */
const EXCLUDE_HOLIDAYS: Record<string, RegExp[]> = {
  ME: [/Ramadan/i, /Eid al-/i, /Pesach/i, /Yom Kippur/i],
};

/** Public holidays of one country (or one of its states) for one year, one entry per day off. */
function publicDays(hd: Holidays, year: number): RawDay[] {
  const en = hd.getHolidays(year, "en");
  const local = hd.getHolidays(year);
  const supported = new Set(hd.getLanguages());
  const byLang = new Map<string, Map<number, string>>();
  for (const lang of supported) {
    if (lang === "en") continue;
    const map = new Map<number, string>();
    for (const h of hd.getHolidays(year, lang)) {
      if (h.type !== "public") continue;
      if (!map.has(h.start.getTime())) map.set(h.start.getTime(), h.name);
    }
    byLang.set(lang, map);
  }
  const out: RawDay[] = [];
  en.forEach((h, i) => {
    if (h.type !== "public") return;
    const duration = (h.end.getTime() - h.start.getTime()) / DAY_MS;
    // Skip half days such as "Christmas Eve from 14:00".
    if (duration < 0.75) return;
    const first = h.date.slice(0, 10);
    const aligned = local[i]?.start.getTime() === h.start.getTime() ? local[i] : undefined;
    const localName =
      aligned?.name ?? local.find((item) => item.start.getTime() === h.start.getTime())?.name ?? h.name;
    const names: Record<string, string> = {};
    for (const [lang, map] of byLang) {
      const translated = map.get(h.start.getTime());
      if (translated && translated !== h.name) names[lang] = nativeHolidayName(lang, translated);
    }
    const days = Math.max(1, Math.round(duration));
    for (let k = 0; k < days; k++) {
      const d = new Date(Date.parse(`${first}T00:00:00Z`) + k * DAY_MS).toISOString().slice(0, 10);
      if (!d.startsWith(String(year))) continue;
      out.push({ date: d, name: h.name, local: localName, names });
    }
  });
  return out;
}

export function listCountries(): Record<string, string> {
  const countries = new Holidays().getCountries("en") ?? {};
  if (countries.SZ) {
    countries.SZ = "Eswatini";
  }
  return countries;
}

export function listRegions(country: string): Record<string, string> {
  return new Holidays().getStates(country, "en") ?? {};
}

/** Build the data file for one country and year, merging national and regional holidays. */
export function extractCountryYear(country: string, year: number, regions: string[]): HolidayFile {
  const key = (d: RawDay) => `${d.date}|${d.name}`;
  const entries = new Map<string, { day: RawDay; national: boolean; regions: Set<string> }>();

  const excludePatterns = EXCLUDE_HOLIDAYS[country] || [];
  const shouldExclude = (name: string) => excludePatterns.some((pattern) => pattern.test(name));

  for (const d of publicDays(new Holidays(country), year)) {
    if (shouldExclude(d.name)) continue;
    entries.set(key(d), { day: d, national: true, regions: new Set() });
  }
  for (const region of regions) {
    for (const d of publicDays(new Holidays(country, region), year)) {
      if (shouldExclude(d.name)) continue;
      const e = entries.get(key(d));
      if (e) e.regions.add(region);
      else entries.set(key(d), { day: d, national: false, regions: new Set([region]) });
    }
  }

  const deFacto = DE_FACTO_HOLIDAYS[country];
  if (deFacto) {
    for (const h of deFacto) {
      const date = `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
      const localName = h.local ?? h.name;
      const raw: RawDay = {
        date,
        name: h.name,
        local: localName,
        names: localName !== h.name ? { sv: localName } : {},
      };
      entries.set(key(raw), { day: raw, national: true, regions: new Set() });
    }
  }

  // Midsommarafton is a bank holiday, not type "public", but the Annual Leave Act treats it as a Sunday.
  if (country === "SE") {
    const raw: RawDay = {
      date: weekdayOnOrAfter(year, 6, 19, 5),
      name: "Midsummer Eve",
      local: "Midsommarafton",
      names: { sv: "Midsommarafton" },
    };
    entries.set(key(raw), { day: raw, national: true, regions: new Set() });
  }

  for (const fix of FLOATING_FIXES[country] ?? []) {
    for (const entry of entries.values()) {
      if (entry.day.name === fix.name) entry.day.date = fix.date(year);
    }
  }

  const dateMap = new Map<string, { day: RawDay; national: boolean; regions: Set<string> }>();
  for (const [_k, e] of entries) {
    const existing = dateMap.get(e.day.date);
    if (existing) {
      if (e.national && !existing.national) {
        dateMap.set(e.day.date, e);
      } else if (e.national === existing.national && e.day.name < existing.day.name) {
        dateMap.set(e.day.date, e);
      }
    } else {
      dateMap.set(e.day.date, e);
    }
  }

  const holidays: HolidayEntry[] = [...dateMap.values()]
    .sort((a, b) => a.day.date.localeCompare(b.day.date) || a.day.name.localeCompare(b.day.name))
    .map((e) => {
      const entry: HolidayEntry = { date: e.day.date, name: e.day.name };
      if (e.day.local && e.day.local !== e.day.name) entry.local = e.day.local;
      if (Object.keys(e.day.names).length > 0) entry.names = e.day.names;
      const everywhere =
        regions.length === 0 || (e.national && (e.regions.size === regions.length || e.regions.size === 0));
      if (!everywhere) entry.regions = [...e.regions].sort();
      if (!e.national) entry.national = false;
      return entry;
    });

  return { country, year, holidays };
}
