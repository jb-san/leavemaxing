import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Keep test runs out of the real analytics.
test.beforeEach(async ({ context }) => {
  await context.route("**/analytics.vril.tech/**", (r) => r.abort());
});

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

test("the skip link doesn't reset the create form", async ({ page, isMobile }) => {
  test.skip(isMobile, "the skip link is for keyboards");
  await page.goto("/together/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.getByLabel("Trip name").fill("Lisbon 2027");
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByLabel("Trip name")).toHaveValue("Lisbon 2027");
});

test("a hash that isn't a group link shows the create form", async ({ page }) => {
  await page.goto("/together/#main");
  await expect(page.getByLabel("Trip name")).toBeVisible();
});

test("closing the invite returns focus to the Invite button", async ({ page }) => {
  await createGroup(page);
  await expect(page.getByRole("img", { name: /Scan to join Lisbon 2027/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Invite", exact: true })).toBeFocused();
});

test("links and QR codes are hidden from session replay", async ({ page }) => {
  await createGroup(page);
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("img", { name: /Scan to join/ }).locator("xpath=..")).toHaveClass(
    /\brr-block\b/,
  );
  await expect(sheet.getByLabel("Link")).toHaveClass(/\brr-block\b/);
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
