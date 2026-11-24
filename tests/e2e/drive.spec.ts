import type { Page } from "@playwright/test";
import { AFFILIATE_HOST, expect, test } from "./fixtures";

/** Travelpayouts Drive script requests the page makes (the fixture answers them with an empty script). */
function driveRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (AFFILIATE_HOST.test(request.url())) urls.push(request.url());
  });
  return urls;
}

const driveTags = (page: Page) => page.locator('head script[src^="https://tpembars.com/"]');

test.describe("Travelpayouts Drive loader", () => {
  test("waits for the visitor, then loads once on the first interaction", async ({ page }) => {
    const urls = driveRequests(page);
    await page.goto("/");
    await page.waitForLoadState("load");
    // Well inside the 6 s fallback, with no interaction: not loaded yet.
    await page.waitForTimeout(1_500);
    expect(urls).toEqual([]);
    await expect(driveTags(page)).toHaveCount(0);

    await page.mouse.wheel(0, 400);
    await expect(driveTags(page)).toHaveCount(1);
    await expect.poll(() => urls.length).toBe(1);
    expect(urls[0]).toBe("https://tpembars.com/NjA2MDk2.js?t=606096");

    // Later interactions don't add it again.
    await page.keyboard.press("Tab");
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    await expect(driveTags(page)).toHaveCount(1);
    expect(urls).toHaveLength(1);
  });

  test("loads without any interaction 6 s after load", async ({ page }) => {
    test.slow();
    const urls = driveRequests(page);
    await page.goto("/");
    await page.waitForLoadState("load");
    const loadedAt = Date.now();
    await expect.poll(() => urls.length, { timeout: 12_000 }).toBe(1);
    expect(Date.now() - loadedAt).toBeGreaterThan(5_000);
    await expect(driveTags(page)).toHaveCount(1);
    await expect(driveTags(page)).toHaveAttribute("data-cmp-ab", "2");
  });
});
