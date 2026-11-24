import type { APIRequestContext, Page } from "@playwright/test";
import { getCopy } from "../../src/i18n";
import { expect, test } from "./fixtures";

/**
 * Link previews for shared plans. Crawlers don't run JavaScript, so these read the HTML the Pages
 * Function (functions/_middleware.ts) serves, from `wrangler pages dev` on port 8788.
 */
const PAGES = "http://localhost:8788";

async function meta(request: APIRequestContext, path: string) {
  const res = await request.get(`${PAGES}${path}`, { headers: { "User-Agent": "facebookexternalhit/1.1" } });
  expect(res.ok()).toBe(true);
  const html = await res.text();
  const tag = (attr: string, name: string) =>
    new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html)?.[1] ?? null;
  return {
    canonical: /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? null,
    title: tag("property", "og:title"),
    image: tag("property", "og:image"),
    alt: tag("property", "og:image:alt"),
    url: tag("property", "og:url"),
    twitterImage: tag("name", "twitter:image"),
  };
}

/** Width and height from a PNG's IHDR chunk. */
async function pngSize(request: APIRequestContext, url: string): Promise<[number, number]> {
  const res = await request.get(url);
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-type"]).toBe("image/png");
  const png = await res.body();
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

async function sharedLink(page: Page, shareLabel: string): Promise<string> {
  await page.getByRole("button", { name: shareLabel, exact: true }).click();
  const field = page.locator("#share-url");
  await expect(field).toHaveValue(/\?d=\d+/);
  const url = new URL(await field.inputValue());
  return `${url.pathname}${url.search}`;
}

test.describe("shared plan previews", () => {
  test.skip(({ isMobile }) => isMobile, "server responses are the same for every device");

  test("a shared link carries a card with its numbers, and the page stays canonical", async ({ request }) => {
    const card = await meta(request, "/se/2027/?d=25");
    expect(card.title).toMatch(/^\d+ leave days → \d+ days off · Sweden 2027$/);
    expect(card.image).toBe(`${PAGES}/og/s/se/2027/25.png`);
    expect(card.twitterImage).toBe(card.image);
    expect(card.alt).toMatch(/^\d+ leave days → \d+ days off, Sweden 2027$/);
    expect(card.url).toBe(`${PAGES}/se/2027/?d=25`);
    expect(card.canonical).toBe("https://leavemaxxing.com/se/2027/");
    expect(await pngSize(request, card.image ?? "")).toEqual([1200, 630]);
  });

  test("localized pages get cards in their language", async ({ request }) => {
    const card = await meta(request, "/de-de/brueckentage-2027/?d=30");
    expect(card.title).toMatch(/^\d+ Urlaubstage → \d+ freie Tage · Deutschland 2027$/);
    expect(card.image).toBe(`${PAGES}/og/s/de-de/2027/30.png`);
    expect(card.canonical).toBe("https://leavemaxxing.com/de-de/brueckentage-2027/");
    expect(await pngSize(request, card.image ?? "")).toEqual([1200, 630]);
  });

  test("links a card can't describe keep the page's own preview", async ({ request }) => {
    const plain = await meta(request, "/se/2027/");
    for (const path of ["/se/2027/?d=25&s=long", "/se/2027/?d=7", "/zw/2027/?d=10"]) {
      const other = await meta(request, path);
      expect(other.image, path).toBe(path.startsWith("/se/") ? plain.image : other.image);
      expect(other.image, path).not.toContain("/og/s/");
      expect(other.url, path).not.toMatch(/\?/);
      expect(other.alt, path).toBeNull();
    }
  });

  test("the share dialog's link unfurls with the card for that plan", async ({ page, request }) => {
    await page.goto("/se/2027/");
    const english = await sharedLink(page, getCopy("en").planner.share);
    expect(english).toBe("/se/2027/?d=20");
    expect((await meta(request, english)).image).toBe(`${PAGES}/og/s/se/2027/20.png`);

    // A German page shares the German page. (The planner carries the last plan's leave days over.)
    await page.goto("/de-de/brueckentage-2027/");
    const german = await sharedLink(page, getCopy("de-DE").planner.share);
    const days = /^\/de-de\/brueckentage-2027\/\?d=(\d+)$/.exec(german)?.[1];
    expect(days, german).toBeDefined();
    const card = await meta(request, german);
    expect(card.image).toBe(`${PAGES}/og/s/de-de/2027/${days}.png`);
    expect(card.title).toContain(" Urlaubstage → ");
  });
});
