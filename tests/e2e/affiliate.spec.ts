import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const EVENT_KEY = "lm-events";
const PARTNER_HOST =
  /^https?:\/\/(?:[^/]+\.)?(?:booking\.com|kiwi\.com|aviasales\.com|getyourguide\.com|economybookings\.com|travelpayouts\.com|tp\.media)(?:\/|$)/;
const KIWI_SE = "https://www.kiwi.com/deep?from=STO&to=anywhere&departure=2026-12-31&return=2027-01-10";
const TRIP_LINK = 'a[data-track="affiliate_click"]';

interface RecordedEvent {
  name: string;
  properties: Record<string, string | number> | null;
}

/** Fail the test if a partner host is ever requested: the row is links only. */
async function guardPartners(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route(PARTNER_HOST, (route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
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

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;

/**
 * Every dated link carries its break: check-in to check-out, inclusive, is the break's length.
 * Flights come first in each row. Car rental has no dates.
 */
async function expectConsistentRow(links: Locator): Promise<void> {
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "sponsored nofollow noopener");
    const href = (await link.getAttribute("href")) ?? "";
    const length = Number(await link.getAttribute("data-track-days"));
    if ((await link.getAttribute("data-track-kind")) === "flights") {
      expect(await link.evaluate((a) => a.parentElement?.querySelector("a[data-track]") === a)).toBe(true);
    }
    let url = new URL(href);
    if (url.host === "c111.travelpayouts.com") {
      expect(url.searchParams.get("shmarker"), href).toBe("811075");
      url = new URL(url.searchParams.get("custom_url") ?? "");
    }
    let from: string | null = null;
    let to: string | null = null;
    if (url.host === "www.booking.com") {
      from = url.searchParams.get("checkin");
      to = url.searchParams.get("checkout");
    } else if (url.host === "www.getyourguide.com") {
      from = url.searchParams.get("date_from");
      to = url.searchParams.get("date_to");
    } else if (url.host === "www.kiwi.com") {
      expect(url.pathname, href).toBe("/deep");
      expect(url.searchParams.get("to"), href).toBe("anywhere");
      from = url.searchParams.get("departure");
      to = url.searchParams.get("return");
    } else if (url.host === "www.economybookings.com") {
      expect(url.searchParams.get("idpick"), href).toBeTruthy();
      continue;
    } else {
      throw new Error(`unexpected partner link ${href}`);
    }
    expect(from, href).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to, href).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(days(from as string, to as string), href).toBe(length);
  }
}

test.beforeEach(async ({ page }) => {
  // Before every 2027 break and the home page's year-end breaks, however late the suite runs.
  await page.clock.setFixedTime(new Date("2026-11-02T10:00:00"));
});

test.describe("home", () => {
  test.use({ timezoneId: "America/New_York" });

  test("break cards offer partner links with the break's dates", async ({ page }) => {
    const hits = await guardPartners(page);
    await page.goto("/");
    await expect(page.locator(".day").first()).toBeVisible();
    const breaks = page.locator("section[aria-labelledby='breaks-title']");
    await expect(
      breaks.getByText("Partner links: we may earn a commission at no extra cost to you."),
    ).toBeVisible();
    await expect(breaks.getByText(/^Your \d+-day break, /).first()).toBeVisible();
    await expect(breaks.getByRole("link", { name: "Stays" }).first()).toBeVisible();
    await expect(breaks.getByRole("link", { name: "Flights" }).first()).toBeVisible();
    await expect(breaks.getByRole("link", { name: "Things to do" }).first()).toBeVisible();
    await expect(breaks.getByRole("link", { name: "Car rental" }).first()).toBeVisible();
    await expectConsistentRow(breaks.locator(TRIP_LINK));
    expect(hits).toEqual([]);
  });
});

test("the /se/2027/ plan links each break with its dates, server-rendered", async ({ page }) => {
  const hits = await guardPartners(page);
  const html = await (await page.request.get("/se/2027/")).text();
  expect(html).toContain('rel="sponsored nofollow noopener"');
  expect(html).toContain("Partner links: we may earn a commission at no extra cost to you.");
  expect(html).toContain("checkin=2026-12-31&amp;checkout=2027-01-10");
  expect(html).toContain(encodeURIComponent(KIWI_SE));

  await page.goto("/se/2027/");
  await expect(page.locator(".day").first()).toBeVisible();
  const row = page.locator("li", { hasText: "Your 11-day break, 31 Dec – 10 Jan" });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("link", { name: "Stays" })).toHaveAttribute(
    "href",
    "https://www.booking.com/searchresults.html?ss=Stockholm&checkin=2026-12-31&checkout=2027-01-10&group_adults=2&no_rooms=1&group_children=0",
  );
  // Flights first and emphasized, then Stays, Things to do, Car rental.
  await expect(row.locator(TRIP_LINK)).toHaveText(["Flights", "Stays", "Things to do", "Car rental"]);
  await expect(row.locator(TRIP_LINK).first()).toHaveClass(/bg-lime/);
  await expect(row.getByRole("link", { name: "Flights" })).toHaveAttribute(
    "href",
    `https://c111.travelpayouts.com/click?shmarker=811075&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent(KIWI_SE)}`,
  );
  await expect(row.getByRole("link", { name: "Car rental" })).toHaveAttribute(
    "href",
    "https://www.economybookings.com/en?idpick=Stockholm",
  );
  await expect(row.getByRole("link", { name: "Things to do" })).toHaveAttribute(
    "href",
    "https://www.getyourguide.com/s/?q=Stockholm&date_from=2026-12-31&date_to=2027-01-10",
  );
  await expectConsistentRow(page.locator(TRIP_LINK));
  expect(hits).toEqual([]);
});

test("the localized Swedish page translates the row", async ({ page }) => {
  await page.goto("/sv-se/klamdagar-2027/");
  const breaks = page.locator("section[aria-labelledby='breaks-title']");
  await expect(
    breaks.getByText("Partnerlänkar: vi kan få provision, utan extra kostnad för dig."),
  ).toBeVisible();
  await expect(breaks.getByRole("link", { name: "Boende" }).first()).toBeVisible();
  await expect(breaks.getByText(/^Din ledighet på \d+ dagar, /).first()).toBeVisible();
});

test("a partner click sends affiliate_click and not outbound_click", async ({ page }) => {
  const hits = await guardPartners(page);
  await installRybbit(page);
  await page.goto("/se/2027/");
  await expect(page.locator(".day").first()).toBeVisible();
  const flights = page
    .locator("li", { hasText: "Your 11-day break, 31 Dec – 10 Jan" })
    .getByRole("link", { name: "Flights" });
  // Keep the test on the site: the link must not open a partner page.
  await flights.evaluate((link) => link.addEventListener("click", (event) => event.preventDefault()));
  await flights.click();

  await expect.poll(async () => (await events(page)).map((event) => event.name)).toContain("affiliate_click");
  const recorded = await events(page);
  expect(recorded.find((event) => event.name === "affiliate_click")?.properties).toEqual({
    partner: "kiwi",
    kind: "flights",
    country: "SE",
    days: 11,
    page: "planner",
    locale: "en",
  });
  expect(recorded.map((event) => event.name)).not.toContain("outbound_click");
  expect(hits).toEqual([]);
});

test("a partner click without rybbit does not throw", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://analytics.vril.tech/**", (route) => route.abort());
  await guardPartners(page);
  await page.goto("/se/2027/");
  const link = page.locator(TRIP_LINK).first();
  await link.evaluate((node) => node.addEventListener("click", (event) => event.preventDefault()));
  await link.click();
  expect(errors).toEqual([]);
});
