import type { APIRoute, GetStaticPaths } from "astro";
import { guideEntries } from "~/lib/guideEntries";
import { GUIDE_COPY } from "~/lib/guides";
import { renderOg } from "~/lib/og";

/** Link preview for each guide: its short title on the site's card. */
export const getStaticPaths = (async () =>
  (await guideEntries()).map(({ entry, summary }) => ({
    params: { locale: summary.locale.toLowerCase(), slug: summary.slug },
    props: { title: entry.data.ogTitle, subtitle: GUIDE_COPY[summary.locale].rssTitle, tagline: GUIDE_COPY[summary.locale].ogTagline },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { title, subtitle, tagline } = props as { title: string; subtitle: string; tagline: string };
  const png = await renderOg({ title, subtitle, tagline });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
