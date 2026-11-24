import { describe, expect, it } from "vitest";
import { locales } from "~/data/locales";
import { serverPlan } from "~/data/server";
import { defaultSettings } from "~/lib/settings";
import { parseShareRequest, SHARE_BUDGETS } from "~/lib/shareMeta";
import { shareCardFor, shareManifest, shareTargets } from "./shareCards";

const targets = shareTargets();
const find = (key: string, year: number) => {
  const target = targets.find((t) => t.key === key && t.year === year);
  if (!target) throw new Error(`no target ${key}/${year}`);
  return target;
};

describe("share cards", () => {
  it("covers every localized bridge-day page, with the locale's default budget", () => {
    for (const locale of Object.values(locales)) {
      const target = find(locale.code.toLowerCase(), 2027);
      expect(target.path).toBe(`/${locale.code.toLowerCase()}/${locale.slug}-2027/`);
      expect(target.budgets).toContain(locale.defaultBudget);
      for (const d of SHARE_BUDGETS) expect(target.budgets).toContain(d);
    }
  });

  it("keeps the build to a reasonable number of images", () => {
    const images = targets.reduce((n, t) => n + t.budgets.length, 0);
    expect(images).toBeLessThan(1200);
  });

  it("states the plan that the shared link opens", () => {
    const target = find("se", 2027);
    const data = shareCardFor(target, 25);
    const { plan } = serverPlan({ ...defaultSettings("SE", 2027), budget: 25 });
    expect(data?.card).toEqual({
      image: "/og/s/se/2027/25.png",
      title: `${plan.stats.leaveUsed} leave days → ${plan.stats.daysOff} days off · Sweden 2027`,
      description: expect.stringContaining(`That's ${plan.stats.multiplier.toFixed(1)} days off`),
      alt: `${plan.stats.leaveUsed} leave days → ${plan.stats.daysOff} days off, Sweden 2027`,
    });
  });

  it("speaks the page's language", () => {
    const de = shareCardFor(find("de-de", 2027), 30)?.card.title ?? "";
    expect(de).toMatch(/^\d+ Urlaubstage → \d+ freie Tage · Deutschland 2027$/);
    const pl = shareCardFor(find("pl-pl", 2027), 5)?.card.title ?? "";
    expect(pl).toMatch(/dni urlopu|dzień urlopu/);
    expect(pl).toContain("Polska 2027");
    const uk = shareCardFor(find("uk-ua", 2027), 25)?.card.title ?? "";
    expect(uk).toContain("Україна 2027");
  });

  it("has a manifest the middleware can match to the link", () => {
    const target = find("fr-fr", 2028);
    const manifest = shareManifest(target);
    const share = parseShareRequest(new URL(`https://leavemaxxing.com${target.path}?d=25`));
    expect(share?.manifest).toBe(`/og/s/fr-fr/2028.json`);
    expect(manifest.path).toBe(target.path);
    expect(manifest.cards[String(share?.days)]?.image).toBe("/og/s/fr-fr/2028/25.png");
  });
});
