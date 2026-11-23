/**
 * Dutch school holidays per region, copied from the Rijksoverheid open data
 * (opendata.rijksoverheid.nl/v1/infotypes/schoolholidays/schoolyear/{year}?output=json).
 * Dates are local: a period runs from its first Saturday to its last Sunday.
 * `advisory` marks the dates OCW only recommends (autumn, spring, and May),
 * which schools may move. Christmas and summer are fixed.
 *
 * Add the next school year here when Rijksoverheid publishes it. Pages show only
 * the periods listed, so a missing year leaves that part of the calendar out
 * instead of guessing.
 */

export type NlRegion = "noord" | "midden" | "zuid";

export const NL_REGIONS: NlRegion[] = ["noord", "midden", "zuid"];

export interface NlSchoolHoliday {
  /** Rijksoverheid name, for example "Herfstvakantie". */
  name: string;
  schoolYear: string;
  advisory: boolean;
  /** ISO start and end dates, inclusive. */
  regions: Record<NlRegion, { start: string; end: string }>;
}

export interface NlSchoolYear {
  schoolYear: string;
  source: string;
}

export const NL_SCHOOL_YEARS: NlSchoolYear[] = [
  {
    schoolYear: "2026-2027",
    source:
      "https://www.rijksoverheid.nl/onderwerpen/schoolvakanties/overzicht-schoolvakanties-per-schooljaar/overzicht-schoolvakanties-2026-2027",
  },
  {
    schoolYear: "2027-2028",
    source:
      "https://www.rijksoverheid.nl/onderwerpen/schoolvakanties/overzicht-schoolvakanties-per-schooljaar/overzicht-schoolvakanties-2027-2028",
  },
];

function all(start: string, end: string): Record<NlRegion, { start: string; end: string }> {
  return { noord: { start, end }, midden: { start, end }, zuid: { start, end } };
}

export const NL_SCHOOL_HOLIDAYS: NlSchoolHoliday[] = [
  {
    name: "Herfstvakantie",
    schoolYear: "2026-2027",
    advisory: true,
    regions: {
      noord: { start: "2026-10-10", end: "2026-10-18" },
      midden: { start: "2026-10-17", end: "2026-10-25" },
      zuid: { start: "2026-10-17", end: "2026-10-25" },
    },
  },
  {
    name: "Kerstvakantie",
    schoolYear: "2026-2027",
    advisory: false,
    regions: all("2026-12-19", "2027-01-03"),
  },
  {
    name: "Voorjaarsvakantie",
    schoolYear: "2026-2027",
    advisory: true,
    regions: {
      noord: { start: "2027-02-20", end: "2027-02-28" },
      midden: { start: "2027-02-20", end: "2027-02-28" },
      zuid: { start: "2027-02-13", end: "2027-02-21" },
    },
  },
  {
    name: "Meivakantie",
    schoolYear: "2026-2027",
    advisory: true,
    regions: all("2027-04-24", "2027-05-02"),
  },
  {
    name: "Zomervakantie",
    schoolYear: "2026-2027",
    advisory: false,
    regions: {
      noord: { start: "2027-07-10", end: "2027-08-22" },
      midden: { start: "2027-07-17", end: "2027-08-29" },
      zuid: { start: "2027-07-24", end: "2027-09-05" },
    },
  },
  {
    name: "Herfstvakantie",
    schoolYear: "2027-2028",
    advisory: true,
    regions: {
      noord: { start: "2027-10-16", end: "2027-10-24" },
      midden: { start: "2027-10-16", end: "2027-10-24" },
      zuid: { start: "2027-10-23", end: "2027-10-31" },
    },
  },
  {
    name: "Kerstvakantie",
    schoolYear: "2027-2028",
    advisory: false,
    regions: all("2027-12-25", "2028-01-09"),
  },
  {
    name: "Voorjaarsvakantie",
    schoolYear: "2027-2028",
    advisory: true,
    regions: {
      noord: { start: "2028-02-19", end: "2028-02-27" },
      midden: { start: "2028-02-26", end: "2028-03-05" },
      zuid: { start: "2028-02-26", end: "2028-03-05" },
    },
  },
  {
    name: "Meivakantie",
    schoolYear: "2027-2028",
    advisory: true,
    regions: all("2028-04-29", "2028-05-07"),
  },
  {
    name: "Zomervakantie",
    schoolYear: "2027-2028",
    advisory: false,
    regions: {
      noord: { start: "2028-07-15", end: "2028-08-27" },
      midden: { start: "2028-07-08", end: "2028-08-20" },
      zuid: { start: "2028-07-22", end: "2028-09-03" },
    },
  },
];
