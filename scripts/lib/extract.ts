import Holidays from "date-holidays";
import type { HolidayEntry, HolidayFile } from "../../src/lib/holidays";

const DAY_MS = 86_400_000;

interface RawDay {
  date: string;
  name: string;
  local: string;
}

/** Public holidays of one country (or one of its states) for one year, one entry per day off. */
function publicDays(hd: Holidays, year: number): RawDay[] {
  const en = hd.getHolidays(year, "en");
  const local = hd.getHolidays(year);
  const out: RawDay[] = [];
  en.forEach((h, i) => {
    if (h.type !== "public") return;
    const duration = (h.end.getTime() - h.start.getTime()) / DAY_MS;
    // Skip half days such as "Christmas Eve from 14:00".
    if (duration < 0.75) return;
    const first = h.date.slice(0, 10);
    const localName = local[i]?.name ?? h.name;
    const days = Math.max(1, Math.round(duration));
    for (let k = 0; k < days; k++) {
      const d = new Date(Date.parse(`${first}T00:00:00Z`) + k * DAY_MS).toISOString().slice(0, 10);
      if (!d.startsWith(String(year))) continue;
      out.push({ date: d, name: h.name, local: localName });
    }
  });
  return out;
}

export function listCountries(): Record<string, string> {
  return new Holidays().getCountries("en") ?? {};
}

export function listRegions(country: string): Record<string, string> {
  return new Holidays().getStates(country, "en") ?? {};
}

/** Build the data file for one country and year, merging national and regional holidays. */
export function extractCountryYear(country: string, year: number, regions: string[]): HolidayFile {
  const key = (d: RawDay) => `${d.date}|${d.name}`;
  const entries = new Map<string, { day: RawDay; national: boolean; regions: Set<string> }>();

  for (const d of publicDays(new Holidays(country), year)) {
    entries.set(key(d), { day: d, national: true, regions: new Set() });
  }
  for (const region of regions) {
    for (const d of publicDays(new Holidays(country, region), year)) {
      const e = entries.get(key(d));
      if (e) e.regions.add(region);
      else entries.set(key(d), { day: d, national: false, regions: new Set([region]) });
    }
  }

  const holidays: HolidayEntry[] = [...entries.values()]
    .sort((a, b) => a.day.date.localeCompare(b.day.date) || a.day.name.localeCompare(b.day.name))
    .map((e) => {
      const entry: HolidayEntry = { date: e.day.date, name: e.day.name };
      if (e.day.local && e.day.local !== e.day.name) entry.local = e.day.local;
      const everywhere =
        regions.length === 0 || (e.national && (e.regions.size === regions.length || e.regions.size === 0));
      if (!everywhere) entry.regions = [...e.regions].sort();
      if (!e.national) entry.national = false;
      return entry;
    });

  return { country, year, holidays };
}
