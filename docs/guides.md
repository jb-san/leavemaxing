# Travel guides

The travel guides ("blog") live at `/guides/`, `/sv-se/guides/` and `/de-de/guides/`. They're plain markdown files in
an Astro content collection, rendered to static pages at build time. No client JavaScript: partner-link clicks go
through the site's existing delegated `data-track` listener (`src/lib/analytics.ts`).

## Routes

| Page | English | Swedish / German |
| --- | --- | --- |
| Hub | `/guides/` | `/sv-se/guides/`, `/de-de/guides/` |
| Guide | `/guides/{slug}/` | `/sv-se/guides/{slug}/`, `/de-de/guides/{slug}/` |
| Category | `/guides/category/{category}/` | `/sv-se/guides/category/{category}/`, … |
| RSS | `/guides/rss.xml` | `/sv-se/guides/rss.xml`, `/de-de/guides/rss.xml` |
| Preview image | `/og/guides/en/{slug}.png` | `/og/guides/sv-se/{slug}.png`, … |

Pages: `src/pages/guides/` and `src/pages/[locale]/guides/`, built from `src/components/guides/`. Routes, copy, JSON-LD
and RSS are pure helpers in `src/lib/guides.ts` (tested in `guides.test.ts`).

Category pages only exist for categories that have at least one guide in that language. The other 16 UI locales link
to the English guides (`guideLocaleFor`); de-AT and de-CH link to the German ones.

## Adding a guide

1. Create `src/content/guides/{en|sv-se|de-de}/{slug}.md`. The file name is the URL slug: lowercase ASCII and
   hyphens (`midsommar-2027.md`). Write the English version first.
2. Frontmatter (validated by `src/content.config.ts`):

   ```yaml
   ---
   title: "Midsummer 2027 in Sweden: dates, a longer break, and where to celebrate"
   description: "60–220 characters. Meta description, card excerpt and RSS description."
   ogTitle: "Midsummer 2027 in Sweden"   # ≤ 48 characters, drawn on the preview image
   locale: en                           # en | sv-SE | de-DE, must match the folder
   translationKey: midsummer-2027-sweden # the English slug, in every language version
   category: holiday-breaks             # destinations | holiday-breaks | planning-tips
   published: "2026-11-24"
   updated: "2026-11-24"                # bump when you change the content
   countries: ["SE"]                    # planner pages for these countries link here
   years: [2027]                        # …for these years (empty: every year)
   draft: false                         # true keeps it out of every page, feed and sitemap
   ---
   ```

   There's no author field: guides are published by "leavemaxxing" (an Organization in JSON-LD) and must not name a
   person.
3. Write the body in markdown: `##` sections, tables, lists. Link planner pages with site paths (`/se/2027/`,
   `/sv-se/klamdagar-2027/`, `/de-de/brueckentage-2027/bayern/`) and other guides with their full path.
4. Run `pnpm test`. `src/lib/guideContent.test.ts` checks folders and locales, that every translation has an
   English original, that dates aren't in the future, that English guides have at least 1,000 words, that partner
   links parse, and that internal links point at real guides or planner routes. `tests/e2e/guides.spec.ts` then
   requests every internal link in the built site.

### Translations

A translation is a file in `sv-se/` or `de-de/` with the same `translationKey` and its own native slug. The pages
add hreflang between all versions (x-default on English), an "Also in" line and the language switcher target. Write
translations for the reader in that country, not word for word: Swedish versions can drop Germany-only detail and
vice versa. Set `countries` to the country of the language (`["SE"]`, `["DE"]`) so they show on that planner.

### Facts

Check every holiday date against the generated data (`pnpm data`, then `public/data/{cc}/{year}.json`) and the
weekday with plain date arithmetic. Hedge things that change (prices, timetables, market dates, routes) with
"usually", "about" and "check before you book", give typical ranges rather than exact prices, and don't invent
statistics or personal anecdotes. When you revise a guide, update `updated`.

## Partner links

Write partner searches as pseudo-URLs; `renderGuideLinks` in `src/lib/guideLinks.ts` turns them into real links
with the helpers in `src/lib/affiliate.ts` (`guideLink`), so tracking formats and the partners' `enabled` flags are
the same as the planner's "Plan this break" row:

```md
[Search flights from Stockholm to anywhere, 6 – 9 May 2027](flights:STO/anywhere/2027-05-06/2027-05-09)
[Search flights from Munich to Lisbon](flights:MUC/LIS/2027-03-25/2027-03-29)
[Hotels in Leksand](stays:Leksand/2027-06-24/2027-06-27)
[Tours in Nuremberg](things:Nuremberg/2026-12-10/2026-12-13)
```

- `flights:FROM/TO/DEPART/RETURN`: Kiwi.com deep link (monetized). `FROM` and `TO` are IATA codes; `TO` can be
  `anywhere`.
- `stays:CITY/CHECKIN/CHECKOUT`: Booking.com search; plain while Booking.com is `enabled: false`.
- `things:QUERY/FROM/TO`: GetYourGuide search; plain while GetYourGuide is `enabled: false`.
- Use `_` (or `%20`) for spaces in names: `stays:Puerto_de_la_Cruz/…`.

Each link gets `target="_blank"`, `rel="sponsored nofollow noopener"` and the row's `data-track="affiliate_click"`
attributes (`partner`, `kind`, `country`, `days` = trip length), so a click sends `affiliate_click` with
`page: "guides"`. `country` is the flight origin's country (`ORIGIN_COUNTRY`), otherwise the guide's first country.
A malformed partner link fails the build. A link whose dates have passed, or a flight more than
`FLIGHT_WINDOW_DAYS` away, renders as plain text, so old guides never send readers to searches they can't book
(the weekly CI build keeps this current).

A guide with any partner link shows the row's disclosure line (`planner.tripDisclosure`) under its header. Keep it
modest: two to four contextual searches per guide, next to the text they belong to.

## SEO and feeds

- **Structured data:** `BlogPosting` (headline, description, dates, `inLanguage`, `wordCount`, `image`,
  `mainEntityOfPage`, author and publisher as the Organization) plus `BreadcrumbList` on guides; `Blog` or
  `CollectionPage` with their posts on hubs and category pages. Guides also get `og:type=article` and
  `article:published_time` / `article:modified_time`.
- **RSS:** one RSS 2.0 feed per language, linked from every guide page and hub with
  `<link rel="alternate" type="application/rss+xml">`.
- **Sitemap:** guides, hubs and categories are included by the normal `inSitemap` rule. Their `lastmod` is the
  guide's `updated` date (hubs: the newest guide), read by `integrations/guide-dates.mjs`.
- **llms.txt** lists the hubs and guides in a "Travel guides" section.

## Where guides are linked

- Header and footer in every locale (`chrome.navGuides`).
- Planner pages: `src/components/guides/PlannerGuides.astro` lists up to four guides in the page's language for its
  country and year, on `/{cc}/{year}/` and on the Swedish and German bridge-day and state pages.
- Each guide ends with links to its planner pages and three more guides.
