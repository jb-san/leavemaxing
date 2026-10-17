import type { APIRoute } from "astro";
import { countries, countryByCode, ogYears } from "~/data";
import { serverPlan } from "~/data/server";
import { leaveYearRange } from "~/lib/dates";
import { renderOg } from "~/lib/og";
import { defaultSettings } from "~/lib/settings";

export function getStaticPaths() {
  return countries.flatMap((c) =>
    ogYears.map((year) => ({ params: { cc: c.code.toLowerCase(), year: String(year) } })),
  );
}

export const GET: APIRoute = async ({ params }) => {
  const code = (params.cc ?? "").toUpperCase();
  const year = Number(params.year);
  const country = countryByCode.get(code);
  const settings = defaultSettings(code, year);
  const { plan } = serverPlan(settings);
  const png = await renderOg({
    title: `${country?.name ?? code} ${year}`,
    subtitle: "Best days to take off",
    plan,
    range: leaveYearRange(year, 1),
  });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
