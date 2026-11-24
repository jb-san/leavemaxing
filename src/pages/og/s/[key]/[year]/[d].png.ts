import type { APIRoute } from "astro";
import { shareCardFor, shareTargets } from "~/data/shareCards";
import { renderShareOg } from "~/lib/og";

/** Link preview for a shared plan with `d` leave days: "25 leave days → 52 days off". */
export function getStaticPaths() {
  return shareTargets().flatMap((target) =>
    target.budgets
      .map((days) => ({ days, data: shareCardFor(target, days) }))
      .filter(({ data }) => data !== null)
      .map(({ days, data }) => ({
        params: { key: target.key, year: String(target.year), d: String(days) },
        props: { data },
      })),
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { place, leave, off, plan, range, months } = props.data;
  const png = await renderShareOg({ place, leave, off, plan, range, months });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
