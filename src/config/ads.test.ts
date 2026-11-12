import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type AdPlacement,
  type AdsEnv,
  adSlots,
  adsEnabled,
  CONSENT_DENIED_REGIONS,
  consentModeScript,
  isSlotId,
  shouldRenderAd,
  shouldRenderPlacement,
} from "./ads";

const dev: AdsEnv = { prod: false, dev: true, mode: "development" };
const prod: AdsEnv = { prod: true, dev: false, mode: "production" };

describe("ad slots", () => {
  it("ships with empty placeholders so nothing renders", () => {
    for (const [placement, id] of Object.entries(adSlots)) {
      expect(id, placement).toBe("");
      expect(shouldRenderPlacement(placement as AdPlacement, prod)).toBe(false);
    }
  });

  it("renders nothing for an empty or non-numeric slot id", () => {
    expect(isSlotId("")).toBe(false);
    expect(isSlotId("   ")).toBe(false);
    expect(isSlotId("TODO")).toBe(false);
    expect(isSlotId("1234567890")).toBe(true);
    expect(shouldRenderAd("", true)).toBe(false);
    expect(shouldRenderAd("   ", true)).toBe(false);
    expect(shouldRenderAd(undefined, true)).toBe(false);
    expect(shouldRenderAd("slot-id", true)).toBe(false);
    expect(shouldRenderAd(" 1234567890 ", true)).toBe(true);
    expect(shouldRenderAd("1234567890", false)).toBe(false);
  });

  it("stays off in dev and test builds unless the env flag is set", () => {
    expect(adsEnabled(dev)).toBe(false);
    expect(adsEnabled({ prod: false, dev: true, mode: "test" })).toBe(false);
    expect(adsEnabled({ prod: true, dev: false, mode: "test" })).toBe(false);
    expect(adsEnabled(prod)).toBe(true);
    expect(adsEnabled({ ...dev, flag: "true" })).toBe(true);
    expect(adsEnabled({ ...prod, flag: "false" })).toBe(false);
    expect(adsEnabled({ ...prod, flag: "  " })).toBe(true);
  });
});

describe("consent mode", () => {
  const script = consentModeScript();
  const deniedAt = script.indexOf("ad_storage: 'denied'");
  const grantedAt = script.indexOf("ad_storage: 'granted'");

  it("denies EEA, UK, and Switzerland before granting everywhere else", () => {
    expect(deniedAt).toBeGreaterThan(-1);
    expect(grantedAt).toBeGreaterThan(deniedAt);
    expect(script).toContain("ad_user_data: 'denied'");
    expect(script).toContain("ad_personalization: 'denied'");
    expect(script).toContain("analytics_storage: 'denied'");
    expect(script).toContain("ad_user_data: 'granted'");
    expect(script).toContain("ad_personalization: 'granted'");
    expect(script).toContain("analytics_storage: 'granted'");
    expect(script.indexOf("wait_for_update: 500")).toBeLessThan(grantedAt);
    expect(script.slice(grantedAt)).not.toContain("wait_for_update");
    expect(script.slice(grantedAt)).not.toContain("region:");
  });

  it("covers the EEA, the UK, and Switzerland", () => {
    const eu = [
      "AT",
      "BE",
      "BG",
      "HR",
      "CY",
      "CZ",
      "DK",
      "EE",
      "FI",
      "FR",
      "DE",
      "GR",
      "HU",
      "IE",
      "IT",
      "LV",
      "LT",
      "LU",
      "MT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SK",
      "SI",
      "ES",
      "SE",
    ];
    expect(new Set(CONSENT_DENIED_REGIONS)).toEqual(new Set([...eu, "IS", "LI", "NO", "GB", "CH"]));
    expect(CONSENT_DENIED_REGIONS).toHaveLength(eu.length + 5);
    for (const code of CONSENT_DENIED_REGIONS) expect(script).toContain(`"${code}"`);
  });
});

describe("ad placement boundaries", () => {
  const root = new URL("../..", import.meta.url);

  function source(path: string): string {
    return readFileSync(new URL(path, root), "utf8");
  }

  it("emits consent defaults before the single AdSense loader", () => {
    const base = source("src/layouts/Base.astro");
    const consent = base.indexOf("consentModeScript()");
    const loader = base.indexOf("adsbygoogle.js");
    expect(consent).toBeGreaterThan(-1);
    expect(loader).toBeGreaterThan(consent);
    expect(base.match(/adsbygoogle\.js/g)).toHaveLength(1);
  });

  it("keeps the planner, dialogs, and excluded pages free of ad slots", () => {
    const clean = [
      "src/components/planner/Planner.tsx",
      "src/components/planner/Dialogs.tsx",
      "src/pages/privacy-policy.astro",
      "src/pages/404.astro",
      "src/pages/about.astro",
      "src/pages/contact.astro",
      "src/pages/compare.astro",
      "src/pages/together.astro",
      "src/pages/plans.astro",
      "src/pages/offline.astro",
      "src/pages/[locale]/about.astro",
      "src/pages/[locale]/contact.astro",
    ];
    for (const file of clean) {
      expect(source(file), file).not.toContain("AdSlot");
      expect(source(file), file).not.toContain("adsbygoogle");
    }
  });
});
