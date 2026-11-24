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

- `requestIdleCallback` after `window` `load` (a `setTimeout` where `requestIdleCallback` is missing);
- the first `scroll`, `pointerdown` or `keydown` (passive listeners, removed after it fires);
- 3.5 s after `window` `load`.

The idle and timeout paths mean it loads with no interaction, which the Travelpayouts verifier needs. The inline tag
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

**Partner id.** `606096` is our Travelpayouts partner (marker) id. It appears in the URL twice: `NjA2MDk2` is `606096`
in base64, and `?t=606096`.

**How to remove it.** Delete the Travelpayouts `<script is:inline>` block in `src/layouts/Base.astro`, the
"Affiliate links" section and Travelpayouts sentence under "Cookies" in `src/pages/privacy-policy.astro`, and
`AFFILIATE_HOST` and its route in `tests/e2e/fixtures.ts`. Then remove the site in the Travelpayouts dashboard.

## "Plan this break" links

Every upcoming break in the planner (home, `/xx/yyyy/` country pages, localized bridge-day pages, and the
client planner after any change) shows a row:

> Your 9-day break, May 1 – 9 · **Stays** · **Flights** · **Things to do**

with a one-line disclosure under the "Your breaks" heading. The row is part of `BreaksList.tsx`, so it is
server-rendered in the static HTML wherever the planner is, and re-rendered by the same component on the
client. Breaks that have already started get no row. Strings are `planner.trip*` in `src/i18n` (all 19
locales).

All configuration lives in [`src/lib/affiliate.ts`](../src/lib/affiliate.ts). Its functions are pure and
covered by `src/lib/affiliate.test.ts`.

### Enabling affiliate tracking

1. Join the programs in Travelpayouts (Booking.com, Kiwi.com, GetYourGuide).
2. Set the marker at build time, for example in Cloudflare Pages env vars or `.env`:

   ```sh
   PUBLIC_TP_MARKER=123456
   ```

   It is read from `import.meta.env.PUBLIC_TP_MARKER`; the fallback is `''`.
3. Fill in the program IDs in `TP_PROGRAMS` (the `p` parameter, shown in the Travelpayouts link generator).
   **TODO:** none are confirmed yet, so all three are empty.

A link is wrapped only when **both** the marker and that partner's program ID are set. Otherwise it is
the plain partner URL, which still works, just without commission. So the site is safe to deploy with
any combination.

TODOs left in `affiliate.ts`:

- Program IDs for `booking`, `kiwi`, `getyourguide`.
- `trs` (project ID) and `campaign_id` params on tp.media links. Not added until confirmed.
- Kiwi.com: Travelpayouts documents Kiwi deep links via a `custom_url` template rather than the
  generic form. Check that a tp.media link with the Kiwi program ID tracks before filling it in.

### Link formats

Dates are `YYYY-MM-DD`, built from the break's day numbers with UTC calendar parts (`isoDay`), so no
time zone can shift them.

| Button | Partner | URL |
| --- | --- | --- |
| Stays | Booking.com | `https://www.booking.com/searchresults.html?ss={city}&checkin={first}&checkout={checkout}&group_adults=2&no_rooms=1&group_children=0` |
| Flights | Kiwi.com | `https://www.kiwi.com/en/search/results/{from-slug}/anywhere/{first}/{last}` |
| Things to do | GetYourGuide | `https://www.getyourguide.com/s/?q={city}&date_from={first}&date_to={last}` |

With a marker and program ID:

```
https://tp.media/r?marker={marker}&p={programId}&u={encodeURIComponent(partnerUrl)}
```

**Check-out choice:** a break runs from its first to its last day off, and you'd travel home on the last
day off, so hotel check-out and the return flight are the **last day off** (a 9-day break is 8 nights).
A one-day break would be zero nights, so it checks out the next day. Activities use the first and last
day off as their range.

Kiwi.com is used for flights because it supports `anywhere` as a destination. Aviasales needs a
destination airport.

### Destinations

`DESTINATIONS` maps a country code to:

- `city`: where Stays and Things to do search (English name, free text on both partners). Usually the
  capital, sometimes the most visited city (ES: Barcelona, PL: Kraków, HR: Split).
- `from`: the Kiwi.com city slug flights leave from (the capital or main hub). Omit it to hide Flights,
  as for UA (closed airspace), MT and CY.

Regions (for example German states) use their country's entry. Countries not in the map use the
country's English name for Stays and Things to do, which both partners can search, and get no Flights
button. Without any name at all, the row is not shown.

To add a country, add one line to `DESTINATIONS`. Check the Kiwi slug by searching on kiwi.com and
copying the origin part of the results URL.

### Links and analytics

Links have `target="_blank"` and `rel="sponsored nofollow noopener"`. Clicks send `affiliate_click`
(`partner`, `kind`, `country`, `days` = break length, plus `page`, `locale`) through the delegated
`data-track` listener in `src/lib/analytics.ts`; they don't also send `outbound_click`. Nothing is
loaded from partner hosts until someone clicks. See [analytics.md](analytics.md).

The privacy policy has an "Affiliate links" section describing this.
