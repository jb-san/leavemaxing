/** Guide entries from the content collection, as the summaries the pure helpers in guides.ts take. */
import { type CollectionEntry, getCollection } from "astro:content";
import { type GuideLocale, type GuideSummary, slugFromId, sortGuides, wordCount } from "./guides";

export type GuideEntry = CollectionEntry<"guides">;

export function summarize(entry: GuideEntry): GuideSummary {
  const { data } = entry;
  return {
    slug: slugFromId(entry.id),
    locale: data.locale,
    translationKey: data.translationKey,
    title: data.title,
    description: data.description,
    category: data.category,
    published: data.published,
    updated: data.updated,
    countries: data.countries.map((code) => code.toUpperCase()),
    years: data.years,
    words: wordCount(entry.body ?? ""),
  };
}

/** Published guides, newest first, optionally for one language. */
export async function guideEntries(locale?: GuideLocale): Promise<Array<{ entry: GuideEntry; summary: GuideSummary }>> {
  const entries = await getCollection("guides", ({ data }) => !data.draft && (!locale || data.locale === locale));
  const items = entries.map((entry) => ({ entry, summary: summarize(entry) }));
  const order = sortGuides(items.map((item) => item.summary));
  return order.map((summary) => items.find((item) => item.summary === summary)!);
}

export async function guideSummaries(locale?: GuideLocale): Promise<GuideSummary[]> {
  return (await guideEntries(locale)).map((item) => item.summary);
}
