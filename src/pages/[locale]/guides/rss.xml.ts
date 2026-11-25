import type { APIRoute, GetStaticPaths } from "astro";
import { SITE } from "~/data/site";
import { guideSummaries } from "~/lib/guideEntries";
import { GUIDE_LOCALE_CODES, type GuideLocale, guideRss } from "~/lib/guides";

export const getStaticPaths = (() =>
  GUIDE_LOCALE_CODES.filter((code) => code !== "en").map((locale) => ({
    params: { locale: locale.toLowerCase() },
    props: { locale },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const locale = (props as { locale: GuideLocale }).locale;
  return new Response(guideRss(locale, await guideSummaries(locale), SITE.url), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
