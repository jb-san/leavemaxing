/**
 * Manual AdSense units. Slot ids come from AdSense → Ads → By ad unit.
 * Leave a value empty until that unit exists. An empty or non-numeric id
 * renders nothing, so dev builds and e2e stay free of empty boxes.
 *
 * The loader script in `src/layouts/Base.astro` is the only adsbygoogle.js
 * tag. Do not add another one.
 */

export const ADSENSE_CLIENT = "ca-pub-1457689618305369";

/**
 * Numeric `data-ad-slot` ids. Names match the units to create in AdSense.
 * See docs/ads.md.
 */
export const adSlots = {
  /** In-content display unit directly under the plan on home and country pages. */
  plannerBelowResults: "",
  /** In-content display unit after the first major section on long-form pages. */
  seoAfterFirstSection: "",
  /** In-content display unit before the FAQ, or before the footer when there is no FAQ. */
  seoBeforeFaq: "",
  /** Desktop sticky display unit in the existing content rail at ≥1280px. */
  desktopSidebar: "",
} as const;

export type AdPlacement = keyof typeof adSlots;

/** Space reserved while a unit loads, so a filled ad does not shift the page. */
export const adMinHeight: Record<AdPlacement, number> = {
  plannerBelowResults: 280,
  seoAfterFirstSection: 280,
  seoBeforeFaq: 280,
  desktopSidebar: 600,
};

/**
 * EEA + UK + Switzerland. Consent defaults to denied here and granted elsewhere.
 * ISO 3166-1 alpha-2, which is what Consent Mode's `region` expects (`GB`, not `UK`).
 */
export const CONSENT_DENIED_REGIONS = [
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
] as const;

export interface AdsEnv {
  prod: boolean;
  dev: boolean;
  mode: string;
  /** `PUBLIC_ADS_ENABLED`. `true` forces units on, `false` forces them off. */
  flag?: string;
}

export function readAdsEnv(): AdsEnv {
  return {
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
    flag: import.meta.env.PUBLIC_ADS_ENABLED as string | undefined,
  };
}

/**
 * Production builds render units. Dev and Vitest do not, unless
 * `PUBLIC_ADS_ENABLED=true`. Playwright previews the production build;
 * empty slot ids still render nothing there.
 */
export function adsEnabled(env: AdsEnv = readAdsEnv()): boolean {
  const flag = env.flag?.trim();
  if (flag === "true") return true;
  if (flag === "false") return false;
  if (env.dev || env.mode === "test") return false;
  return env.prod;
}

/** AdSense slot ids are numeric. Anything else is treated as unset. */
export function isSlotId(value: string | undefined | null): boolean {
  return typeof value === "string" && /^\d+$/.test(value.trim());
}

export function slotId(placement: AdPlacement): string {
  return adSlots[placement].trim();
}

export function shouldRenderAd(value: string | undefined | null, enabled: boolean): boolean {
  return enabled && isSlotId(value);
}

export function shouldRenderPlacement(placement: AdPlacement, env?: AdsEnv): boolean {
  return shouldRenderAd(adSlots[placement], adsEnabled(env));
}

/**
 * Consent Mode v2 defaults. Inline this before the AdSense loader.
 * Regional denied (with `wait_for_update`) is first so EEA, UK, and Switzerland
 * match it. The second default grants consent everywhere else.
 * Funding Choices, loaded by the existing AdSense tag, updates these after a choice.
 */
export function consentModeScript(): string {
  const region = JSON.stringify([...CONSENT_DENIED_REGIONS]);
  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500,
  region: ${region}
});
gtag('consent', 'default', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted'
});
gtag('set', 'ads_data_redaction', true);`;
}
