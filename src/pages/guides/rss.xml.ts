import type { APIRoute } from "astro";
import { SITE } from "~/data/site";
import { guideSummaries } from "~/lib/guideEntries";
import { guideRss } from "~/lib/guides";

export const GET: APIRoute = async () =>
  new Response(guideRss("en", await guideSummaries("en"), SITE.url), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
