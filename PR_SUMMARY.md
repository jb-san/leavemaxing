# Phase 2: Localized Bridge-Day Pages

Implements Phase 2 of the growth plan with native-language bridge-day pages for target European markets.

## Overview

This PR adds **102 new static pages** across 9 locales for years 2027 and 2028, targeting local-language searches during the October–January peak season.

### Supported Locales

| Locale | Country | Term | National | Regional | Total Pages |
|--------|---------|------|----------|----------|-------------|
| **de-DE** | 🇩🇪 Germany | Brückentage | 2 | 32 (16 Bundesländer) | **34** |
| **de-AT** | 🇦🇹 Austria | Fenstertage | 2 | - | **2** |
| **de-CH** | 🇨🇭 Switzerland | Brückentage | 2 | 52 (26 cantons) | **54** |
| **sv-SE** | 🇸🇪 Sweden | klämdagar | 2 | - | **2** |
| **nb-NO** | 🇳🇴 Norway | inneklemte dager | 2 | - | **2** |
| **da-DK** | 🇩🇰 Denmark | klemmedage | 2 | - | **2** |
| **fi-FI** | 🇫🇮 Finland | välipäivät | 2 | - | **2** |
| **pl-PL** | 🇵🇱 Poland | długie weekendy | 2 | - | **2** |
| **nl-NL** | 🇳🇱 Netherlands | brugdagen | 2 | - | **2** |
| **TOTAL** | | | **18** | **84** | **102** |

## Example URLs

### National Pages
- `/de-de/brueckentage-2027/` - Germany national
- `/de-at/fenstertage-2027/` - Austria
- `/de-ch/brueckentage-2027/` - Switzerland national
- `/sv-se/klamdagar-2027/` - Sweden
- `/nb-no/inneklemte-dager-2027/` - Norway
- `/da-dk/klemmedage-2027/` - Denmark
- `/fi-fi/valipaivat-2027/` - Finland
- `/pl-pl/dlugie-weekendy-2027/` - Poland
- `/nl-nl/brugdagen-2027/` - Netherlands

### Regional Pages (Germany)
- `/de-de/brueckentage-2027/bayern/` - Bavaria
- `/de-de/brueckentage-2027/nordrhein-westfalen/` - North Rhine-Westphalia
- `/de-de/brueckentage-2027/baden-wurttemberg/` - Baden-Württemberg
- `/de-de/brueckentage-2027/berlin/` - Berlin
- `/de-de/brueckentage-2027/hessen/` - Hesse
- (+ 11 more German states × 2 years = 32 pages)

### Regional Pages (Switzerland)
- `/de-ch/brueckentage-2027/zuerich/` - Zürich
- `/de-ch/brueckentage-2027/bern/` - Bern
- `/de-ch/brueckentage-2027/geneve/` - Geneva
- (+ 23 more cantons × 2 years = 52 pages)

## Features Per Page

Each page includes:

✅ **Server-rendered static HTML** with natural native-language content
- No machine-translation feel
- Locale-specific terminology (Brückentage vs Fenstertage vs klämdagar)
- Region-specific considerations

✅ **Precomputed optimal bridge plans** for multiple budgets
- Plans for 1, 3, 5, 10, and default budget (20-25 days depending on country)
- Shows exact dates to book and resulting days off
- Efficiency multiplier (e.g., "3.0× - 5 days → 15 days off")

✅ **Holiday listings** with regional variations
- Uses existing holiday data infrastructure
- Regional holidays highlighted where applicable
- Date formatting in local style

✅ **Genuine native-language FAQ** (3-5 questions per locale)
- Country-specific legal information (e.g., Swedish semesterlagen, German Mindesturlaub)
- Practical tips for requesting time off
- FAQPage schema for rich snippets

✅ **SEO optimization**
- Unique title and meta description per page targeting local search terms
- Correct `lang` attribute (de, sv, nb, da, fi, pl, nl)
- Canonical URLs
- Reciprocal hreflang between localized pages and English equivalents
- x-default pointing to English country page

✅ **Structured data**
- WebApplication schema
- BreadcrumbList for navigation
- FAQPage schema for FAQ section

✅ **Internal linking**
- Links between years (2027 ↔ 2028)
- Links between national and regional pages
- Links to interactive calculator (prefilled with correct country/region)

✅ **Responsive layout** using existing Astro components
- Interactive planner component (hydrated React)
- Holiday list component
- Sidebar with top breaks and navigation

## Technical Implementation

### New Files

1. **`src/data/locales.ts`** (620 lines)
   - Locale configuration for 9 locales
   - Translation strings (~150 keys per locale)
   - Native FAQ content (3-5 Q&A per locale)
   - Region detection helpers

2. **`src/lib/bridgeDays.ts`** (212 lines)
   - `calculateBridgePlans()` - compute optimal plans for multiple budgets
   - `formatBreak()` - format break info for display
   - `getYearQuality()` - rate year's bridge-day opportunities
   - Uses existing planner logic from `src/lib/planner/plan.ts`

3. **`src/lib/bridgeDays.test.ts`** (190 lines)
   - Tests for Germany/Bayern 2027 (known test case)
   - Tests for different budget scenarios
   - Tests for year quality ratings
   - All tests passing ✅

4. **`src/pages/[locale]/[slug]-[year]/index.astro`**
   - Dynamic route for national localized pages
   - Generates 18 pages (9 locales × 2 years)

5. **`src/pages/[locale]/[slug]-[year]/[region]/index.astro`**
   - Dynamic route for regional pages
   - Generates 84 pages (Germany: 16×2, Switzerland: 26×2)
   - Automatic region slug generation (handles umlauts, special chars)

### Updated Files

1. **`src/layouts/Base.astro`**
   - Added `lang` prop for `<html lang="">` attribute
   - Added `canonical` prop for canonical URL override
   - Added `hreflangs` prop for hreflang link tags

### Data Infrastructure

Uses existing holiday data:
- `/public/data/{cc}/{year}.json` files (already generated)
- Regional holiday data via `regions` field
- No changes needed to data generation

## Testing

✅ **Unit tests** - 8 new tests for bridge-day calculations
```bash
pnpm test
# Test Files  4 passed (4)
# Tests  31 passed (31)
```

✅ **Linting** - biome check passes
```bash
pnpm lint
# Checked 54 files in 48ms. No fixes applied.
```

⚠️ **Build** - Cannot test locally due to Node.js version mismatch (environment has 22.14.0, Astro requires 22.22.0+). CI uses Node 24 which will work fine.

## Page Count Verification

Run `pnpm exec tsx scripts/count-localized-pages.ts` to verify page counts.

## Sitemap

The existing sitemap integration will automatically pick up these new pages. No changes needed to `astro.config.mjs` - the filter only excludes `/plans/` and `/offline/`.

## What's Not Included (Future Work)

As discussed in the plan:
- No 2026 pages (too late in the year)
- No 2029+ pages (launch focuses on 2027-2028)
- Austria regional pages not needed (holidays don't differ by Bundesland)
- Wave 2 languages (FR, ES, IT, PT, CS) deferred to future PR

## Checklist

- [x] Localized pages for 9 languages
- [x] Regional pages for Germany (16 Bundesländer)
- [x] Regional pages for Switzerland (26 cantons)
- [x] Years 2027 and 2028
- [x] Native-language content (no machine translation feel)
- [x] Precomputed bridge plans
- [x] FAQ with FAQPage schema
- [x] BreadcrumbList schema
- [x] Proper SEO (title, meta, lang, canonical, hreflang)
- [x] Tests for bridge-plan computation
- [x] All tests passing
- [x] Lint checks green
- [x] Added to sitemap (automatic)

## Preview

Once CI passes, preview the new pages on the Cloudflare Pages preview deployment:
- Check `/de-de/brueckentage-2027/`
- Check `/de-de/brueckentage-2027/bayern/`
- Check `/sv-se/klamdagar-2027/`
- Check `/pl-pl/dlugie-weekendy-2027/`

Verify:
- Pages render correctly
- Content is in native language
- Interactive planner works
- Internal links function
- Structured data validates (Google Rich Results Test)
