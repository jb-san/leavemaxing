# Ads

Manual AdSense units for leavemaxxing. The publisher id is `ca-pub-1457689618305369`.

The loader is already in `src/layouts/Base.astro`. It is the only
`adsbygoogle.js` tag on the page. `public/ads.txt` is already published.
Do not add a second loader, a third-party consent banner, or a homemade banner.

## When a unit renders

Slot ids live in `src/config/ads.ts`. Each value is the numeric `data-ad-slot`
id from AdSense. Leave it empty until that unit exists.

- An empty or non-numeric id renders nothing: no box, no label, no push.
- Production builds (`astro build`) render a unit once its id is set.
- `astro dev` and Vitest do not, unless `PUBLIC_ADS_ENABLED=true`.
- `PUBLIC_ADS_ENABLED=false` suppresses units even in a production build.

Playwright runs against the production build. Empty ids keep those runs, including
axe, free of ad iframes. After you paste real ids, the e2e check that no unit
precedes the plan results still applies. The "no `ins.adsbygoogle` at all" check
will then need to follow the filled ids.

## Placements

`src/components/AdSlot.astro` renders one responsive display unit
(`data-ad-format="auto"`, `data-full-width-responsive="true"`) with a short
localized "Advertisement" label. The label is `chrome.advertisement` in each
locale catalog.

Each unit reserves a min-height while it loads (280px in content, 600px in the
sidebar) so a filled ad does not shift the page. If AdSense marks the unit
`data-ad-status="unfilled"`, the slot and its label collapse.

Units below the fold are requested from `src/lib/ads.ts` when they near the
viewport (`IntersectionObserver`, then `(adsbygoogle = window.adsbygoogle || []).push({})`).
The sidebar unit is not requested below 1280px, so a hidden slot is never asked to fill.

The plan, its controls, and the results stay above any unit. Nothing is inserted
in the planner, in the share or calendar dialogs, or on `/privacy-policy/`,
`/404/`, about, contact, compare, together, plans, or offline.

In-content units keep at least 4rem below the planner and 3rem around long-form
sections, so they are not flush with Share, calendar, or other controls. On
viewports below 1024px, planner-page units also keep a right inset so they stay
clear of the fixed settings button.

| Placement | Config key | Pages | Recommended unit |
| --- | --- | --- | --- |
| Directly under the plan | `plannerBelowResults` | `/`, `/{locale}/`, `/{cc}/`, `/{cc}/{year}/` | Display, responsive, in-article. About 336×280 or fluid. |
| After the first content section | `seoAfterFirstSection` | Bridge-day pages (`/de-de/brueckentage-2027/`, `/sv-se/klamdagar-2027/`, other locales, and their region pages). Sits after the best-plans section and before the holiday list. | Display, responsive, in-article. |
| Before the FAQ or footer | `seoBeforeFaq` | Those same bridge-day pages, before the FAQ. English `/{cc}/{year}/` pages that have a FAQ (2027 and 2028), before Common questions. `/best/{year}/` and `/{locale}/best/{year}/`, after the ranking table and before the footer. | Display, responsive, in-article. |
| Desktop sidebar | `desktopSidebar` | The existing 340px rail on `/{cc}/{year}/` and on bridge-day pages (national and regional). Sticky, and only from 1280px up. | Display, responsive, in a 300px-wide rail. 300×600 or 300×250. |

Long-form pages use at most two in-content units. `/best/` uses only
`seoBeforeFaq`: the ranking opens with tab buttons, so there is no unit between
the hero and those tabs.

The sidebar does not narrow the planner. The planner stays full width. The rail
is the content column that already sits beside the holiday list and FAQ, and it
starts below the planner. Below 1280px that unit is `display: none` and is not
requested. Home, country index, and ranking pages have no spare rail, so they
do not get this unit.

### Mobile anchor

There is no custom sticky or anchor implementation. On phones, use AdSense Auto
ads' anchor format, configured in the AdSense UI (see the checklist). Do not
add a fixed mobile slot in this repo.

Preview the anchor against the planner's round settings button (bottom-right
below 1024px) and against the share dialog. If the anchor covers either one,
turn that anchor placement off in the Auto ads preview.

## Consent

`src/layouts/Base.astro` inlines Consent Mode v2 defaults **before** the AdSense
loader:

- EEA, UK (`GB`), and Switzerland (`CH`): `ad_storage`, `ad_user_data`,
  `ad_personalization`, and `analytics_storage` are `denied`, with
  `wait_for_update: 500`.
- Everywhere else, those four are `granted` (no wait).
- `ads_data_redaction` is set so a denied state redacts ad click identifiers.

The regional default is first, which is the match Consent Mode uses.

The CMP is Google's own Privacy & messaging / Funding Choices message, loaded
by the existing AdSense tag once you publish it. Do not add another CMP.

`<html lang>` is the locale of the page (`en`, `de-DE`, `sv-SE`, `uk-UA`, …)
so Google's message can follow the language. The footer "Privacy settings"
control already calls `googlefc.showRevocationMessage`.

Rybbit is cookieless and is unchanged. `outbound_click` still fires for links
that leave the site. Ad units are not those links.

## Owner checklist

Do this in the AdSense UI for publisher `ca-pub-1457689618305369`. This repo
does not change DNS or Cloudflare.

1. **Sites.** Ads → Sites → add `leavemaxxing.com` if it is not there. Verify
   with the existing `ads.txt` line
   `google.com, pub-1457689618305369, DIRECT, f08c47fec0942fa0`, or by the
   loader that is already on every page. Do not add a second loader snippet.
2. **Display units.** Ads → By ad unit → Display ads. Create one responsive
   display unit per row in the table above, using that placement name. Copy
   only the numeric `data-ad-slot` value into the matching key in
   `src/config/ads.ts`. Leave a key empty to keep that placement off. Deploy
   after the ids are saved.
3. **Auto ads.** Ads → Auto ads → `leavemaxxing.com` → Ad formats.
   - Anchor ads: on (this is the mobile format).
   - In-page ads: off (manual units already cover the article).
   - Side rail: off (the desktop rail is manual, and an automatic rail would
     sit beside the planner).
   - Vignettes: off.
   - Page exclusions: `/privacy-policy/`, `/404`, `/about/`, `/contact/`, and
     the localized about and contact paths. Also exclude `/compare/`,
     `/together/`, `/plans/`, and `/offline/` so the anchor does not cover
     those tools. Share and calendar dialogs are part of planner pages; the
     anchor must not cover them (see the preview note above).
4. **Privacy & messaging.** Privacy & messaging → European regulations →
   create a message for `leavemaxxing.com`. Choose Google's GDPR / TCF message
   (Funding Choices). Turn Consent Mode on for that message. Publish it.
   A US state regulations message is optional.
   Do not add a second tag and do not install a different CMP. The defaults in
   this repo run before the existing AdSense tag; the published message updates
   them after the visitor chooses.
5. **Check a locale.** Open a German and a Swedish page. The consent message
   should follow `html lang` (`de-DE`, `sv-SE`). Privacy settings in the footer
   should reopen it.

Until step 2 is done, the site shows the loader and the consent defaults, and
no ad boxes.
