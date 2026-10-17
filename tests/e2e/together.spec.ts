import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function createGroup(page: Page) {
  await page.goto("/together/");
  await page.getByLabel("Trip name").fill("Lisbon 2027");
  await page.getByLabel("Your name").fill("Sam");
  await page.getByRole("button", { name: "Create group" }).click();
}

async function serious(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
}

test("create shows an invite QR", async ({ page }) => {
  await createGroup(page);
  await expect(page.getByRole("img", { name: /Scan to join Lisbon 2027/ })).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash.slice(1).split(".").length).toBeGreaterThanOrEqual(4);
  expect(new URL(page.url()).hash.slice(1).split(".").length).toBeLessThanOrEqual(5);
});

test("tapping a day blocks it and tapping again frees it", async ({ page }) => {
  await page.goto("/together/");
  const day = page.locator(".day:not([data-past])").first();
  const kind = await day.getAttribute("data-k");
  await day.click();
  await expect(day).toHaveAttribute("data-k", "blocked");
  await day.click();
  await expect(day).toHaveAttribute("data-k", kind ?? "work");
});

test("the personal link opens the group on another device", async ({ page, browser }) => {
  await createGroup(page);
  await expect(page.getByRole("img", { name: /Scan to join Lisbon 2027/ })).toBeVisible();
  const personal = page.url();
  // A fresh context has nothing stored, so the group has to come from the server.
  const other = await browser.newContext();
  const second = await other.newPage();
  await second.goto(personal);
  await expect(second.getByRole("heading", { name: "Lisbon 2027" })).toBeVisible();
  await other.close();
});

for (const scheme of ["light", "dark"] as const) {
  test(`together has no serious accessibility problems (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/together/");
    await expect(page.locator(".day").first()).toBeVisible();
    expect(await serious(page)).toEqual([]);
    await page.getByLabel("Trip name").fill("Lisbon 2027");
    await page.getByLabel("Your name").fill("Sam");
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByRole("img", { name: /Scan to join Lisbon 2027/ })).toBeVisible();
    // Let the sheet finish fading in, or axe measures half-transparent text.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    expect(await serious(page)).toEqual([]);
  });
}
