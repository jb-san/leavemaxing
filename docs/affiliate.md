# Affiliate

The site has two independent Travelpayouts pieces:

1. **Travelpayouts Drive**, a script on every page that turns matching outbound travel links into affiliate links.
2. **"Plan this break" links**, a row of partner links under each suggested break, built in our own code.

## Travelpayouts Drive script

**What it is.** Travelpayouts Drive is a small third-party script from Travelpayouts (the affiliate network) served
from `tpembars.com`. Once on a page, it turns matching outbound travel links (flights, hotels, car hire, etc.) into
affiliate links, so bookings made through them are attributed to our account.

**Why we load it.** Travelpayouts only unlocks the Drive dashboard once its verifier finds the script on the site, and
the script is what auto-affiliates links without us rewriting each one by hand.

**How it loads.** Travelpayouts' snippet injects the script straight away. We wrap it so it stays off the first paint:
a small inline loader adds `<script async data-cmp-ab="2" src="https://tpembars.com/NjA2MDk2.js?t=606096">` to
`document.head` **once**, on the first of:

- the first `scroll`, `pointerdown`, `keydown` or `touchstart` (passive listeners, removed after it fires);
- 6 s after `window` `load`.

The script pulls in a ~200 KB chunk whose parse and run is a long task on phones (about 300 ms of scripting in
Lighthouse mobile), so it waits for the visitor or for the page to be well past start-up rather than for the first
idle moment. The timeout path means it loads with no interaction, which the Travelpayouts verifier needs. The inline tag
keeps the snippet's `data-cfasync="false"`, `data-no-defer="1"`, `data-noptimize="1"`, `data-wpfc-render="false"` and
`data-cmp-ab="2"` attributes so optimisers such as Cloudflare Rocket Loader leave it alone. It was left without the
snippet's non-standard `nowprocket` and `seraph-accel-crit` attributes (WordPress plugin hints, not valid HTML).

**Where the code lives.**

- `src/layouts/Base.astro`, near the top of `<head>` (`<script is:inline …>`). Every page uses this layout, all
  locales, legal pages and 404 included.
- `src/pages/privacy-policy.astro`, "Affiliate links" and "Cookies" sections.
- `tests/e2e/fixtures.ts`, `AFFILIATE_HOST`: e2e tests answer `tpembars.com` script requests with an empty script so
  they never reach Travelpayouts.

The site sets no Content-Security-Policy (`public/_headers`, `functions/_middleware.ts`), so nothing needs to allow
`tpembars.com`. If a CSP is added, allow `https://tpembars.com` in `script-src` (and `connect-src`) and the inline loader.

**Project id.** `606096` is our Travelpayouts project id (`trs`). It appears in the script URL twice: `NjA2MDk2` is
`606096` in base64, and `?t=606096`. Our marker (partner id) is `811075`; see the next section.

**How to remove it.** Delete the Travelpayouts `<script is:inline>` block in `src/layouts/Base.astro`, the
Travelpayouts script paragraph in "Affiliate links" and the script's mention under "Cookies" in
`src/pages/privacy-policy.astro` (keep the rest, which covers the break links), and `AFFILIATE_HOST` and its
route in `tests/e2e/fixtures.ts`. Then remove the site in the Travelpayouts dashboard. The "Plan this break"
links don't depend on the script.

## "Plan this break" links

Every upcoming break in the planner (home, `/xx/yyyy/` country pages, localized bridge-day pages, and the
client planner after any change) shows a row:

> Your 9-day break, 1–9 May · **Flights** · Stays · Things to do · Car rental

with a one-line disclosure under the "Your breaks" heading. Flights is first and filled lime; the rest use
the soft pill style. The row is part of `BreaksList.tsx`, so it is server-rendered in the static HTML
wherever the planner is, and re-rendered by the same component on the client. Breaks that have already
started get no row. Strings are `planner.trip*` in `src/i18n` (all 19 locales).

Only the next `FULL_TRIP_ROWS` (5, in `src/lib/affiliate.ts`) bookable breaks get the full row. Later breaks get a
single **Plan this break** pill (`planner.tripPlan`) to the row's first link, Flights when the break has one, with the
same `affiliate_click` tracking. A year has 15 or more breaks, and full rows on all of them made the list a noticeable
part of the page's first layout and hydration on phones.

All configuration lives in [`src/lib/affiliate.ts`](../src/lib/affiliate.ts). Its functions are pure and
covered by `src/lib/affiliate.test.ts`.

### IDs

| Setting | Value | Where |
| --- | --- | --- |
| Marker (partner id) | `811075` | `TP_MARKER`. `PUBLIC_TP_MARKER` at build time overrides it; set it to an empty string to send only plain links |
| Project (`trs`) | `606096` | `TP_TRS`, used on tp.media links |
| Kiwi.com custom-link promo | `3791` | `KIWI_PROMO_ID` |

### Partners

Each partner has an `enabled` flag in `PARTNERS`. Flip it to `false` and that partner's links become
plain URLs (the button stays). Flip it to `true` when a program is approved.

| Button | Partner | Program status (24 Nov 2026) | `enabled` | Tracking |
| --- | --- | --- | --- | --- |
| Flights | Kiwi.com | Connected | `true` | Travelpayouts custom link (`c111.travelpayouts.com`) |
| Flights (alternative) | Aviasales | Connected | `true` | `?marker=811075` on the search URL |
| Stays | Booking.com | Pending approval | `false` | Plain link |
| Things to do | GetYourGuide | Locked | `false` | Plain link |
| Car rental | Economybookings | Connected | `true` | Plain link until a program ID is set (see below) |

How a link is made affiliate (`affiliateUrl`), for an enabled partner with a non-empty marker:

1. If `PARTNERS[partner].program` is set: `https://tp.media/r?marker=811075&trs=606096&p={program}&u={encodeURIComponent(url)}`.
2. Otherwise the partner's own documented format: Kiwi.com's custom link, or Aviasales' `marker` parameter.
3. Otherwise the plain URL.

**Program IDs (TODO).** All `program` values are empty. Travelpayouts doesn't publish the tp.media `p` values
in its help centre; `p=4114` shows up only in third-party code, and Aviasales' program page id is a
different number. Confirm each in the dashboard (Links > Create link: the long generated link shows `p=`)
before filling one in. Economybookings in particular has no programmatic format: Travelpayouts' article
says links must go through the dashboard generator, so its links stay plain until its program ID is set.
The Drive script may still convert plain links to connected programs on the page.

### Link formats

Example: Sweden, break 31 Dec 2026 – 10 Jan 2027 (11 days).

| Button | Format | Example (SE) |
| --- | --- | --- |
| Flights (Kiwi.com) | `https://c111.travelpayouts.com/click?shmarker={marker}&promo_id=3791&source_type=customlink&type=click&custom_url={encoded kiwi url}`, wrapping `https://www.kiwi.com/deep?from={origin}&to=anywhere&departure={first}&return={last}` | `…custom_url=https%3A%2F%2Fwww.kiwi.com%2Fdeep%3Ffrom%3DSTO%26to%3Danywhere%26departure%3D2026-12-31%26return%3D2027-01-10` |
| Flights (Aviasales) | `https://www.aviasales.com/search/{ORIGIN}{DDMM}{DEST}{DDMM}1?marker={marker}` (1 adult) | `https://www.aviasales.com/search/STO3112BCN10011?marker=811075` |
| Stays (Booking.com) | `https://www.booking.com/searchresults.html?ss={city}&checkin={first}&checkout={checkout}&group_adults=2&no_rooms=1&group_children=0` | `…?ss=Stockholm&checkin=2026-12-31&checkout=2027-01-10&…` |
| Things to do (GetYourGuide) | `https://www.getyourguide.com/s/?q={city}&date_from={first}&date_to={last}` | `…?q=Stockholm&date_from=2026-12-31&date_to=2027-01-10` |
| Car rental (Economybookings) | `https://www.economybookings.com/en?idpick={city}` (no documented date parameters) | `https://www.economybookings.com/en?idpick=Stockholm` |

Sources: Travelpayouts help centre articles "Kiwi.com affiliate links" (360010109719), "Aviasales affiliate
links" (5711895629714) and "Links from Economybookings" (360007365071). The site returns 403 to scripts,
but the public Zendesk API serves the same text:
`https://support.travelpayouts.com/api/v2/help_center/en-us/articles/{id}.json`.

**Dates.** `YYYY-MM-DD` (and `DDMM` for Aviasales), built from the break's day numbers with UTC calendar
parts (`isoDay`, `ddmm`), so no time zone can shift them. A break runs from its first to its last day
off, and you'd travel home on the last day off, so hotel check-out and the return flight are the **last
day off** (a 9-day break is 8 nights). A one-day break checks out the next day.

**Flights choice.** `FLIGHTS_PARTNER = "kiwi"`: Kiwi.com searches from the country's origin to `anywhere`
with full dates, which suits "I have these days off, where can I go?", and its tracking format is
documented. Set it to `"aviasales"` to search the country's popular destination instead. Aviasales dates
carry no year (it picks the next matching date). Airlines sell about 330 days ahead, so breaks more than
`FLIGHT_WINDOW_DAYS` (330) days away get no Flights button with either partner.

Only Kiwi.com `/deep` links are credited by Travelpayouts; other Kiwi.com pages are not.

### Destinations

`DESTINATIONS` maps a country code to:

- `city`: where Stays, Things to do and Car rental search (English name). Usually the capital, sometimes
  the most visited city (ES: Barcelona, PL: Kraków, HR: Split).
- `air`: IATA city codes `[origin, destination]`. The origin is the capital or main hub (SE: `STO`,
  US: `NYC`); Kiwi.com flies from it to anywhere. The destination is a popular trip from there (SE:
  `BCN`), used by Aviasales. Omit `air` to hide Flights, as for UA (closed airspace).

Regions (for example German states) use their country's entry. Countries not in the map use the
country's English name for Stays and Things to do, which both partners can search, and get no Flights or
Car rental button. Without any name at all, the row is not shown.

### Links and analytics

Links have `target="_blank"` and `rel="sponsored nofollow noopener"`. Clicks send `affiliate_click`
(`partner`, `kind`, `country`, `days` = break length, plus `page`, `locale`) through the delegated
`data-track` listener in `src/lib/analytics.ts`; they don't also send `outbound_click`. Nothing is
loaded from partner hosts until someone clicks. See [analytics.md](analytics.md).

The privacy policy's "Affiliate links" section covers both these links and the Drive script.

## Travel guides

Partner searches inside the travel guides (`/guides/`) use the same helpers: `guideLink` in `src/lib/affiliate.ts`
builds each link with `affiliateUrl`, so the marker, the Kiwi.com custom-link format and the `enabled` flags above
apply unchanged (Booking.com and GetYourGuide links stay plain). Guide links always use Kiwi.com for flights. They
carry the same `rel`, `target` and `affiliate_click` attributes as the row, and guides with partner links show the
same disclosure line. How to write them is in [guides.md](guides.md).
