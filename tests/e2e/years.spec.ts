import type { Page } from "@playwright/test";
import { locales } from "../../src/data/locales";
import { expect, test } from "./fixtures";

const hero = (page: Page) => page.locator("section[aria-label='Your plan'] p[aria-live]");

function plannerWindow(now = new Date()): number[] {
  const year = now.getFullYear();
  return [year, year + 1, year + 2];
}

function yearsIn(labels: string[]): number[] {
  return labels.map((label) => {
    const match = /\d{4}/.exec(label);
    if (!match) throw new Error(`No year in "${label}"`);
    return Number(match[0]);
  });
}

function assertPlannerWindow(labels: string[], expected = plannerWindow()): void {
  const years = yearsIn(labels);
  const current = new Date().getFullYear();
  for (const year of years) {
    expect(year).toBeGreaterThanOrEqual(current);
    expect(year).toBeLessThanOrEqual(current + 2);
  }
  expect(years).toEqual(expected);
}

/** Year radios, opening the phone settings sheet when the desktop panel is hidden. */
async function plannerYearLabels(page: Page): Promise<string[]> {
  const group = page.locator("[role='radiogroup'][aria-labelledby$='year-label']");
  if ((await group.filter({ visible: true }).count()) === 0) {
    await page.locator("button[class*='lg:hidden']").first().click();
  }
  const radios = group.filter({ visible: true }).getByRole("radio");
  await expect(radios).toHaveCount(plannerWindow().length);
  return radios.allTextContents();
}

test("planner year choices are this year and the next two", async ({ page }) => {
  test.setTimeout(180_000);
  const now = new Date();
  const localeDefault = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();

  await page.goto("/");
  assertPlannerWindow(await plannerYearLabels(page));
  await expect(
    page.getByRole("radio", { name: String(now.getFullYear()), exact: true }).first(),
  ).toHaveAttribute("aria-checked", "true");

  for (const code of Object.keys(locales)) {
    await page.goto(`/${code.toLowerCase()}/`);
    assertPlannerWindow(await plannerYearLabels(page));
    const checked = page
      .locator("[role='radiogroup'][aria-labelledby$='year-label']")
      .filter({ visible: true })
      .getByRole("radio", { checked: true });
    await expect(checked).toHaveText(String(localeDefault));
  }
});

test("compare, country, and ranking year choices skip past years", async ({ page }) => {
  const expected = plannerWindow();
  const current = new Date().getFullYear();

  await page.goto("/compare/");
  const compareYears = yearsIn(
    await page.getByRole("radiogroup", { name: "Year" }).getByRole("radio").allTextContents(),
  );
  expect(compareYears).toEqual(expected);
  await expect(page.getByRole("radio", { name: String(current + 1), exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.goto("/se/");
  assertPlannerWindow(await plannerYearLabels(page));
  const another = page.locator("section", {
    has: page.getByRole("heading", { name: "Plan another year in Sweden" }),
  });
  expect(yearsIn(await another.getByRole("link").allTextContents()).sort((a, b) => a - b)).toEqual(expected);

  await page.goto(`/best/${current}/`);
  await expect(page.locator("#ranking")).toBeVisible();
  const see = yearsIn(await page.locator("a.chip").allTextContents());
  expect(see).toEqual([current + 1]);

  await page.goto(`/best/${current + 1}/`);
  const back = yearsIn(await page.locator("a.chip").allTextContents());
  expect(back).toEqual([current]);

  await page.goto("/de-de/best/2027/");
  await expect(page.locator("#ranking")).toBeVisible();
  const localized = yearsIn(await page.locator("a.chip").allTextContents());
  for (const year of localized) {
    expect(year).toBeGreaterThanOrEqual(current);
    expect(year).toBeLessThanOrEqual(current + 2);
  }
});

test("a past year page and a shared past year still load", async ({ page }) => {
  const expected = plannerWindow();
  const response = await page.goto("/se/2025/?d=12");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("2025");
  await expect(hero(page)).toContainText("12 leave days");
  assertPlannerWindow(await plannerYearLabels(page));
  const other = page.locator("section", { has: page.getByRole("heading", { name: "Other years" }) });
  expect(yearsIn(await other.getByRole("link").allTextContents())).toEqual(expected);

  await page.goto("/compare/?c=SE,DE&y=2025&d=20&s=balanced");
  await expect(page.getByText("Most time off")).toBeVisible();
  expect(
    yearsIn(await page.getByRole("radiogroup", { name: "Year" }).getByRole("radio").allTextContents()),
  ).toEqual(expected);
});

test("a saved plan for a past year opens on a year the picker offers", async ({ page }) => {
  const current = new Date().getFullYear();
  await page.addInitScript(
    (saved) => {
      localStorage.setItem("lm:last:v1", JSON.stringify(saved));
    },
    {
      country: "SE",
      region: null,
      year: 2025,
      yearStart: 1,
      budget: 18,
      style: "balanced",
      minBreak: 3,
      maxBreak: null,
      months: [],
      workWeek: [true, true, true, true, true, false, false],
      locked: [],
      blocked: [],
      customOff: [],
    },
  );
  await page.goto("/");
  await expect(page.getByText(`Your ${current} in Sweden`)).toBeVisible();
  assertPlannerWindow(await plannerYearLabels(page));
  await expect(page.getByRole("radio", { name: String(current), exact: true }).first()).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
