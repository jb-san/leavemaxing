# Affiliate

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
