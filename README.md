# leavemaxxing

Turn your leave days into the most time off. Pick a country and how many leave days you have, and leavemaxxing finds the
workdays that join weekends and public holidays into the longest breaks.

Live at [leavemaxxing.com](https://leavemaxxing.com). Everything runs in the browser: no accounts, no backend.

## Features

- **Exact planner** for 200+ countries and their regions, with three styles (long weekends, balanced, one big trip),
  shortest/longest break, favourite months, custom work week and leave years that start in any month.
- **Edit the plan**: tap a day to keep it as leave, block it, or mark it as a day off. The plan rebuilds around it.
- **Share**: the URL holds the whole plan; share images are drawn in the browser. Shared links unfurl with a card
  for that plan ("25 leave days → 58 days off · Sweden 2027"), in the page's language.
- **Calendar export**: `.ics` download and Google Calendar links.
- **Saved plans** in local storage, **compare** up to four countries, **rankings** of where leave goes furthest.
- **Offline**: a service worker keeps visited pages and holiday data available.
- Light and dark mode, phone and desktop layouts.

## How it works

- **Holiday data** comes from [`date-holidays`](https://github.com/commenthol/date-holidays) (CC BY 3.0) and is generated
  at build time by `scripts/build-data.ts` into `public/data/{cc}/{year}.json`, for last year through 5 years ahead plus
  one extra year so plans can cross New Year. Non-Saturday/Sunday weekends are listed in `src/lib/weekends.ts`.
- **The planner** (`src/lib/planner/plan.ts`) is a dynamic programme over day numbers (no `Date` objects, so time zones
  can't shift weekdays). State is (leave used, current break length, break has leave); each style is a value curve for a
  break's length. Quarter pacing keeps plans spread over the year. It runs in a Web Worker in the browser.
- **Pages** are static Astro pages with React islands: `/`, `/{cc}/`, `/{cc}/{year}/`, `/compare/`, `/best/{year}/`,
  `/plans/`. Link preview images are rendered with satori at build time.
- **Shared plan previews**: crawlers don't run JavaScript, so `functions/_middleware.ts` (a Pages Function) rewrites
  the og: and twitter: tags of a shared link such as `/se/2027/?d=25` or `/de-de/brueckentage-2027/?d=30` to point at
  a card prepared at build time (`src/pages/og/s/`, about 750 PNGs: indexed countries this year and next, and every
  localized bridge-day page, for 5–30 leave days and each locale's default). It only rewrites tags, so it fits the free
  plan's CPU limit. Links with other plan settings, or other leave-day counts, keep the page's own preview. See
  `src/lib/shareMeta.ts`.
- **For answer engines**: bridge-day pages open with one answer-first paragraph in the server HTML, built from the
  same values as the page's FAQ, under a visible "last updated" date that is also `dateModified`. Static JSON with
  each country's best breaks (`/data/best/{cc}/{year}.json`), planner deep links
  (`/?country=DE&region=BY&year=2027&days=25`), and `/llms.txt` are described in
  [docs/data-api.md](docs/data-api.md).
- **Loading**: planner islands use `client:afterpaint` (`src/directives/afterpaint.ts`): the server HTML, which
  already shows the plan, paints first and the island's JavaScript loads right after. Archivo is trimmed to the
  weights and widths in use by `scripts/instance-fonts.py`, with size-matched fallbacks so the swap doesn't shift text.

## Development

Requires Node 24+ and pnpm 10.

```bash
pnpm install
pnpm dev          # generates holiday data, then starts Astro on http://localhost:4321
pnpm test         # unit tests (Vitest)
pnpm check        # astro check + Biome
pnpm build        # static site in dist/
pnpm e2e          # Playwright tests against the built site (run pnpm build first); link previews run
                  # through `wrangler pages dev dist` on port 8788
pnpm icons        # regenerate favicons and app icons from the mascot
```

Set `PUBLIC_RYBBIT_SITE_ID` (see `.env.example`) to enable analytics via the self-hosted Rybbit at
`analytics.vril.tech`. Custom events for planner use, the language switcher, outbound links, and privacy
settings are listed in [docs/analytics.md](docs/analytics.md). Canonical, hreflang, and `og:url` are always
the clean path, without `?d=` or other plan parameters. The one exception is `og:url` in a shared link's preview,
which the Pages Function sets to the shared link (Facebook and LinkedIn re-read `og:url`, and would otherwise show the
page's card); `rel=canonical` stays clean there too.

## Deployment

`.github/workflows/ci.yml` checks, tests and builds every push and pull request, then deploys `dist/` to the Cloudflare
Pages project `leavemaxing` (production on `main`, previews on branches). A weekly scheduled run rebuilds the site so
holiday data stays current and the year range rolls forward each January.

Repository settings needed:

- Secrets `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.
- Secret `RYBBIT_SITE_ID` for analytics.

`functions/_middleware.ts` redirects `www.leavemaxxing.com` to the apex domain and serves shared plan previews.
