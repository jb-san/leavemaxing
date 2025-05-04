export interface Holiday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

/**
 * Fetches public holidays for a given year and country code from the Nager.Date API.
 * @param year The year to fetch holidays for.
 * @param countryCode The ISO 3166-1 alpha-2 country code.
 * @returns A promise that resolves to an array of Holiday objects or null if an error occurs.
 */
export async function getPublicHolidays(
  year: number,
  countryCode: string,
): Promise<Holiday[] | null> {
  const url =
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `Error fetching holidays: ${response.status} ${response.statusText}`,
      );
      return null;
    }
    const holidays: Holiday[] = await response.json();
    return holidays;
  } catch (error) {
    console.error("Failed to fetch public holidays:", error);
    return null;
  }
}
