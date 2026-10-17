/** Time zones → country, for the zones where the mapping is unambiguous and common. */
const ZONES: Record<string, string> = {
  "Europe/Malta": "MT",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Atlantic/Canary": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Luxembourg": "LU",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Prague": "CZ",
  "Europe/Bratislava": "SK",
  "Europe/Warsaw": "PL",
  "Europe/Budapest": "HU",
  "Europe/Ljubljana": "SI",
  "Europe/Zagreb": "HR",
  "Europe/Belgrade": "RS",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Athens": "GR",
  "Asia/Nicosia": "CY",
  "Europe/Istanbul": "TR",
  "Europe/Kyiv": "UA",
  "Europe/Kiev": "UA",
  "Europe/Vilnius": "LT",
  "Europe/Riga": "LV",
  "Europe/Tallinn": "EE",
  "Europe/Helsinki": "FI",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Atlantic/Reykjavik": "IS",
  "Europe/Lisbon": "PT",
  "Europe/Monaco": "MC",
  "Europe/Andorra": "AD",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Pacific/Auckland": "NZ",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Singapore": "SG",
  "Asia/Manila": "PH",
  "Asia/Jakarta": "ID",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Jerusalem": "IL",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Cairo": "EG",
  "Africa/Nairobi": "KE",
};

/** Best guess at the visitor's country from time zone, then browser language. */
export function detectCountry(valid: Set<string>): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const byZone = ZONES[tz];
    if (byZone && valid.has(byZone)) return byZone;
    if (tz.startsWith("America/") && !byZone) {
      // Most remaining America/* zones are US ones (New_York, Chicago, Denver, Los_Angeles…).
      const usZones = [
        "New_York",
        "Chicago",
        "Denver",
        "Los_Angeles",
        "Phoenix",
        "Anchorage",
        "Detroit",
        "Indiana",
      ];
      if (usZones.some((z) => tz.includes(z)) && valid.has("US")) return "US";
    }
  } catch {}
  const langs = typeof navigator !== "undefined" ? (navigator.languages ?? [navigator.language]) : [];
  for (const lang of langs) {
    const region = lang.split("-")[1]?.toUpperCase();
    if (region && valid.has(region)) return region;
  }
  return null;
}
