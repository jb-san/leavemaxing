# leavemaxxing: Astro rewrite design

Date: 2026-10-17 · Status: approved (user asked to proceed directly to implementation)

## Goal

Rebuild leavemaxxing.com as a static Astro site with React islands, TypeScript and
Tailwind, with a playful-modern redesign and a set of features that need no server
and no accounts. The core job is unchanged: pick a country and a leave budget, get
the plan that turns it into the most time off.

## Constraints

- Static output only, hosted on Cloudflare Pages (`dist/`), project `leavemaxing`.
  `functions/_middleware.ts` (www → apex redirect) stays.
- No backend, no accounts. Everything personal stays in the browser.
- Analytics: Rybbit, self-hosted at `https://analytics.vril.tech` (site id via
  `PUBLIC_RYBBIT_SITE_ID`).
- Trailing-slash URLs (existing SEO fix). Keep `/about/` and `/privacy-policy/`.
- Mobile and desktop, light and dark mode (system default + manual toggle).

## Visual direction

Approved preview: https://claude.ai/artifact/7kM4GtmpZrcvjSPR1a4tm1

- Sage background, white rounded cards (28px radius), one navy hero card per view.
- Lime primary `#8BD12F`, sun yellow `#FFC83D` for holidays, red for blocked days,
  violet as a compare colour. Dark mode: navy `#10141B` base, cards `#1A202B`.
- Calendar cells: date number above a status circle. Leave = lime + check, locked =
  lime + lock, holiday = sun + sun glyph, weekend = soft grey, blocked = red + cross,
  workday = ring. Breaks are a soft capsule behind consecutive off-day circles.
- Type: Bricolage Grotesque (display), Plus Jakarta Sans (body), self-hosted.
- Logo: "Happy Calendar": navy calendar page with lime binder tabs, sun-yellow eyes
  and a lime smile. Also the mascot; its mood follows the plan multiplier.
- Motion: spring "pop" on changed days, small confetti on a new best score; all
  disabled under `prefers-reduced-motion`.

## Holiday data

- Source: `date-holidays` (207 countries, regions), CC-BY-3.0 data → attribution in
  footer and About page.
- Generated at build time by `scripts/build-data.ts` into `public/data/{cc}/{year}.json`
  for years `currentYear-1 … currentYear+5`, plus a hidden `+6` year so a plan in the
  last visible year can run into the next January.
- Each file: `{ country, year, regions: {code: name}, holidays: [{date, name, regions|null}] }`
  where `regions: null` means nationwide. Only `type === "public"` holidays.
- `src/data/countries.ts` (generated): country list with names, flags, regions.
- `src/lib/weekends.ts`: hand-maintained table of non-Sat/Sun weekends.
- Weekly scheduled CI rebuild keeps data fresh and rolls the year window.

## Planning engine (`src/lib/planner/`)

Pure TypeScript, no DOM. Days are integer day numbers (days since 1970-01-01, UTC),
never `Date` objects in the core, so time zones can't shift weekdays.

Inputs (`PlanInput`): holidays (resolved for region), leave-year start month, year,
budget, work week (7 booleans, Monday first), custom days off, locked days, blocked
days, style, min/max break length, preferred months, today.

Day kinds over the scan window (Dec of previous year → Jan after the leave year ends):
`free` (weekend/holiday/custom), `work`, `locked` (counts against budget, is off),
`blocked` (cannot take). Leave may only be placed on `work` days inside the leave
year and on or after `today`.

Algorithm: exact dynamic programming over days with state
`(leaveUsed, currentRunLength (capped), runHasLeave)`. A break's score is added when
its run ends. Score per run = `g_style(len)` + preferred-month bonus per leave day,
and runs containing leave that violate min/max break get a large penalty. Runs
without leave score `g(len)` too, so unchanged weekends are a constant and drop out.

Styles:
- `weekends`: peak value for 3–5 day breaks, diminishing after.
- `balanced` (default): peak for 5–10 day breaks.
- `long`: convex, favours one big break.

Output (`Plan`): leave days, breaks `{start, end, length, leaveUsed, holidays}`,
stats `{leaveUsed, daysOff, multiplier, longest, nextBreak}`, and warnings (e.g.
budget exceeds available workdays). Runs in a Web Worker with main-thread fallback.

## Pages

| Path | Content |
|---|---|
| `/` | Home + planner (country guessed from language/time zone, no redirect) |
| `/{cc}/` | Country page: current-year planner + holiday list |
| `/{cc}/{year}/` | Holidays + pre-rendered default plan in HTML, then interactive planner |
| `/compare/` | Up to 4 countries/regions with the same settings |
| `/best/{year}/` | Build-time ranking for budgets 10/15/20/25/30 |
| `/plans/` | Saved plans (localStorage) |
| `/about/`, `/privacy-policy/`, 404 | Content pages |

Regions are a URL parameter, not pages (file-count limit).

## State

URL is the source of truth: path = country/year, query = `r` region, `d` days, `s`
style, `min`/`max` break, `m` preferred months, `ys` leave-year start, `ww` work week,
`lk`/`bk`/`co` locked/blocked/custom days as compact ranges. Opening precedence:
URL → last-used (localStorage) → detected defaults. `history.replaceState` on change.

Saved plans: `localStorage["lm:plans:v1"]`, versioned, corrupt data ignored.

## Features

1. Static country/year pages with build-time data.
2. Shareable URL state.
3. Day editing popover / bottom sheet: keep as leave, can't take, day off anyway, clear.
4. Regions.
5. Planning styles, min/max break, preferred months.
6. `.ics` export (one all-day event per break, optional per leave day) and Google
   Calendar links.
7. Share card drawn on canvas (1080×1350 and 1200×630), Web Share with download fallback.
8. Saved plans.
9. Custom days off and custom work week.
10. Compare countries; build-time `/best/` rankings.
11. PWA via `@vite-pwa/astro` (precache shell, runtime-cache data/pages), next-break
    countdown on home.
12. Leave year with any start month; breaks across New Year.

## Error handling

Data fetch fails → keep previous plan, show retry. Invalid URL params → ignored,
defaults used, small notice. Budget > available workdays → use what fits + warning.
No worker → main thread. Offline + unvisited country → friendly offline state.

## Accessibility

Calendar days are buttons with full labels; arrow-key grid navigation; status is
icon + colour; contrast checked in both themes; no theme flash (inline script).

## Tooling

Astro 7, React 19, TypeScript strict, Tailwind v4 (`@tailwindcss/vite`), pnpm,
Biome, Vitest (engine + utilities), Playwright smoke tests with axe. OG images via
satori + resvg at build time. GitHub Actions: PR → check/test/build/preview deploy;
`main` → production; weekly cron rebuild.

## Milestones

- M1 Foundation: scaffold, tokens/themes, logo/favicons, data pipeline, engine,
  planner UI, live recalculation, URL state, country/year pages + SEO, Rybbit, CI.
- M2 Make it yours: day editing, work week, custom days, saved plans, `.ics`.
- M3 Share & play: share card, mascot moods, confetti, OG images, countdown.
- M4 Explore: compare, `/best/` rankings.
- M5 Offline: PWA.
