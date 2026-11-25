import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { GUIDE_CATEGORIES, GUIDE_LOCALE_CODES } from "~/lib/guides";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");

/** Travel guides: src/content/guides/{en,sv-se,de-de}/{slug}.md. See docs/guides.md. */
const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string().min(10).max(110),
    /** Meta description and card excerpt. */
    description: z.string().min(60).max(220),
    /** Short title for the link preview image (about 40 characters). */
    ogTitle: z.string().max(48),
    locale: z.enum(GUIDE_LOCALE_CODES),
    /** Same value in every language version of one guide (the English slug). Drives hreflang. */
    translationKey: z.string(),
    category: z.enum(GUIDE_CATEGORIES),
    published: day,
    updated: day,
    /** Countries the guide is about (ISO codes). Planner pages for these countries link to it. */
    countries: z.array(z.string().length(2)).default([]),
    /** Planner years it is about. Country-year pages for these years link to it. */
    years: z.array(z.number().int()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides };
