import type { APIRoute } from "astro";
import { bestDataEntries, bestDataFile } from "~/lib/bestData";

/** Best breaks and the recommended plan for one country-year. Format: docs/data-api.md. */
export function getStaticPaths() {
  return bestDataEntries().map(({ country, year }) => ({
    params: { cc: country.toLowerCase(), year: String(year) },
    props: { country, year },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(bestDataFile(props.country as string, props.year as number)), {
    headers: { "Content-Type": "application/json" },
  });
