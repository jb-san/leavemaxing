import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const hero = (page: Page) => page.locator("section[aria-label='Your plan'] p[aria-live]");

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("home page plans without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(hero(page)).toContainText("days off");
  await expect(page.locator(".day").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("a shared link restores the plan", async ({ page }) => {
  await page.goto("/de/2027/?r=BY&d=14&s=weekends");
  await expect(hero(page)).toContainText("14 leave days");
  await expect(page.getByText("Your 2027 in Bayern")).toBeVisible();
});

test("locking a day updates the plan and the link", async ({ page, isMobile }) => {
  await page.goto("/de/2027/?d=10");
  await expect(hero(page)).toContainText("10 leave days");
  if (isMobile) {
    // Phones show one month at a time; jump to July.
    for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Next month" }).click();
  }
  await page.getByRole("button", { name: /Wed 14 Jul, workday/ }).click();
  await page.getByRole("button", { name: "Take this day off" }).click();
  await expect(page).toHaveURL(/lk=/);
  await page.reload();
  await expect(page.locator('.day[data-k="locked"]')).toHaveCount(1);
});

test("calendar export downloads an .ics file", async ({ page }) => {
  await page.goto("/mt/2027/");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download .ics/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("leavemaxxing-mt-2027.ics");
});

test("saved plans show up under My plans", async ({ page }) => {
  await page.goto("/mt/2027/");
  await page.getByRole("button", { name: "Save plan" }).click();
  await page.getByLabel("Name").fill("Summer in Malta");
  await page.getByRole("dialog").getByRole("button", { name: "Save plan" }).click();
  await page.goto("/plans/");
  await expect(page.getByRole("heading", { name: "Summer in Malta" })).toBeVisible();
});

test("compare and rankings pages render", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/compare/?c=DE,MT,GB&y=2027&d=20&s=balanced");
  await expect(page.getByText("Most time off")).toBeVisible();
  const year = new Date().getFullYear();
  await page.goto(`/best/${year}/`);
  await page.getByRole("tab", { name: "25" }).click();
  await expect(page.locator("#panel-25")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const scheme of ["light", "dark"] as const) {
  test(`no serious accessibility problems (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/de/2027/");
    await expect(page.locator(".day").first()).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
}

test("works offline once visited", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "one browser is enough for the service worker");
  await page.goto("/de/2027/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Load again so the page itself goes through the service worker and is cached.
  await page.reload();
  await expect(hero(page)).toContainText("days off");
  await context.setOffline(true);
  await page.reload();
  await expect(hero(page)).toContainText("days off");
  await page.goto("/fr/2031/");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
});
