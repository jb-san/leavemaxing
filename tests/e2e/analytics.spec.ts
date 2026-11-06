import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const EVENT_KEY = "lm-events";

interface RecordedEvent {
  name: string;
  properties: Record<string, string | number> | null;
}

async function installRybbit(page: Page): Promise<void> {
  await page.route("https://analytics.vril.tech/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* rybbit stub */" }),
  );
  await page.addInitScript((key) => {
    const record = (name: string, properties?: Record<string, string | number>) => {
      const list = JSON.parse(sessionStorage.getItem(key) || "[]") as RecordedEvent[];
      list.push({ name, properties: properties ?? null });
      sessionStorage.setItem(key, JSON.stringify(list));
    };
    (window as unknown as { rybbit: { event: typeof record } }).rybbit = { event: record };
  }, EVENT_KEY);
}

async function events(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key) || "[]") as RecordedEvent[],
    EVENT_KEY,
  );
}

async function showSettings(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) await page.getByRole("button", { name: "Plan settings" }).click();
}

test("loading a shared plan does not emit planner events", async ({ page }) => {
  await installRybbit(page);
  await page.goto("/de/2027/?d=10&r=BY");
  await expect(page.getByText("Your 2027 in Bayern")).toBeVisible();
  expect(await events(page)).toEqual([]);
});

test("planner actions reach rybbit", async ({ page, isMobile }) => {
  await installRybbit(page);
  await page.goto("/de/2027/");
  await expect(page.locator(".day").first()).toBeVisible();
  expect(await events(page)).toEqual([]);

  await showSettings(page, isMobile);
  await page.locator("select[aria-label='Region']:visible").selectOption({ label: "Bayern" });
  await page.getByRole("radio", { name: "Long weekends" }).click();
  await page.getByRole("button", { name: "More leave days" }).click();
  if (isMobile) await page.getByRole("button", { name: "Close" }).click();

  await expect
    .poll(async () => (await events(page)).map((event) => event.name))
    .toEqual(expect.arrayContaining(["region_change", "planner_setting", "leave_days_change"]));
  const recorded = await events(page);
  expect(recorded.filter((event) => event.name === "leave_days_change")).toEqual([
    expect.objectContaining({
      properties: expect.objectContaining({
        country: "DE",
        year: 2027,
        locale: "en",
        days: 21,
        page: "planner",
      }),
    }),
  ]);
  expect(recorded.find((event) => event.name === "region_change")?.properties).toMatchObject({
    country: "DE",
    region: "BY",
    page: "planner",
  });
  expect(recorded.find((event) => event.name === "planner_setting")?.properties).toMatchObject({
    setting: "style",
    value: "weekends",
  });

  await page.locator('.day[data-k="leave"]').first().click();
  await expect
    .poll(async () => (await events(page)).some((event) => event.name === "break_select"))
    .toBe(true);
  await page.getByRole("button", { name: "Keep as leave" }).click();
  await expect.poll(async () => (await events(page)).some((event) => event.name === "day_edit")).toBe(true);
  expect((await events(page)).find((event) => event.name === "day_edit")?.properties).toMatchObject({
    action: "lock",
  });
  expect(
    JSON.stringify((await events(page)).find((event) => event.name === "day_edit")?.properties),
  ).not.toMatch(/20\d\d-\d\d-\d\d/);

  const gcal = page.locator('a[href*="calendar.google.com"]').first();
  await gcal.evaluate((link) => link.addEventListener("click", (event) => event.preventDefault()));
  await gcal.click();

  await page.getByRole("button", { name: "Add to calendar" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download \.ics/ }).click(),
  ]);
  await download.cancel();

  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Privacy settings" }).click();
  const github = page.locator('a[href="https://github.com/jb-san"]');
  await github.evaluate((link) => link.addEventListener("click", (event) => event.preventDefault()));
  await github.click();

  await page.locator("summary").filter({ hasText: /^EN$/ }).click();
  await page.locator("a[data-track-to='de-DE']").click();
  await expect(page).toHaveURL(/\/de-de\//);

  const names = (await events(page)).map((event) => event.name);
  for (const name of [
    "share_open",
    "share_copy",
    "calendar_export",
    "privacy_settings",
    "outbound_click",
    "language_change",
  ]) {
    expect(names).toContain(name);
  }
  const all = await events(page);
  expect(
    all.find((event) => event.name === "calendar_export" && event.properties?.format === "ics"),
  ).toBeTruthy();
  expect(
    all.find((event) => event.name === "calendar_export" && event.properties?.format === "google"),
  ).toBeTruthy();
  expect(all.find((event) => event.name === "outbound_click")?.properties).toMatchObject({
    host: "github.com",
  });
  expect(all.find((event) => event.name === "language_change")?.properties).toMatchObject({
    locale: "en",
    to: "de-DE",
    page: "planner",
  });
  expect(all.find((event) => event.name === "privacy_settings")?.properties).toMatchObject({
    page: "planner",
    locale: "en",
  });
});

test("changing the plan does not throw when rybbit is blocked", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://analytics.vril.tech/**", (route) => route.abort());
  await page.goto("/de/2027/");
  await expect(page.locator(".day").first()).toBeVisible();
  await showSettings(page, isMobile);
  await page.locator("select[aria-label='Region']:visible").selectOption({ label: "Bayern" });
  await page.getByRole("button", { name: "More leave days" }).click();
  await expect(page.locator("select[aria-label='Region']:visible")).toHaveValue("BY");
  expect(errors).toEqual([]);
});
