# leavemaxxing

Turn your leave days into the most time off. Pick a country and how many leave days you have, and leavemaxxing finds the
workdays that join weekends and public holidays into the longest breaks.

Live at [leavemaxxing.com](https://leavemaxxing.com). Everything runs in the browser: no accounts, no backend.

## Features

- **Exact planner** for 200+ countries and their regions, with three styles (long weekends, balanced, one big trip),
  shortest/longest break, favourite months, custom work week and leave years that start in any month.
- **Edit the plan**: tap a day to keep it as leave, block it, or mark it as a day off. The plan rebuilds around it.
- **Share**: the URL holds the whole plan; share images are drawn in the browser.
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

## Development

Requires Node 24+ and pnpm 10.

```bash
pnpm install
pnpm dev          # generates holiday data, then starts Astro on http://localhost:4321
pnpm test         # unit tests (Vitest)
pnpm check        # astro check + Biome
pnpm build        # static site in dist/
pnpm e2e          # Playwright tests against the built site (run pnpm build first)
pnpm icons        # regenerate favicons and app icons from the mascot
```

Set `PUBLIC_RYBBIT_SITE_ID` (see `.env.example`) to enable analytics via the self-hosted Rybbit at
`analytics.vril.tech`.

## Deployment

`.github/workflows/ci.yml` checks, tests and builds every push and pull request, then deploys `dist/` to the Cloudflare
Pages project `leavemaxing` (production on `main`, previews on branches). A weekly scheduled run rebuilds the site so
holiday data stays current and the year range rolls forward each January.

Repository settings needed:

- Secrets `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.
- Variable `RYBBIT_SITE_ID` for analytics.

`functions/_middleware.ts` redirects `www.leavemaxxing.com` to the apex domain.
