import { readdirSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const SITE = "https://leavemaxxing.com";
const GUIDES = new URL("../../src/content/guides/", import.meta.url).pathname;
const slugs = (folder: string) =>
  readdirSync(`${GUIDES}${folder}`)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
const ENGLISH = slugs("en");
const EVENT_KEY = "lm-events";

async function jsonLd(page: Page): Promise<Record<string, unknown>> {
  const text = await page.locator('script[type="application/ld+json"]').first().textContent();
  return JSON.parse(text ?? "{}") as Record<string, unknown>;
}

test("the hub lists every English guide with date, category and reading time", async ({ page }) => {
  await page.goto("/guides/");
  await expect(page.locator("h1")).toHaveText("Travel guides");
  const cards = page.locator("[data-guide-list] article");
  await expect(cards).toHaveCount(ENGLISH.length);
  for (const slug of ENGLISH)
    await expect(page.locator(`[data-guide-list] a[href="/guides/${slug}/"]`)).toHaveCount(1);
  await expect(cards.first().locator("time")).toHaveAttribute("datetime", /^2026-11-\d{2}$/);
  await expect(cards.first()).toContainText("min read");
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
    "href",
    "/guides/rss.xml",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/guides/`);
  await expect(page.locator('link[rel="alternate"][hreflang="sv-SE"]')).toHaveAttribute(
    "href",
    `${SITE}/sv-se/guides/`,
  );
});

test("category pages filter the guides without client code", async ({ page }) => {
  await page.goto("/guides/category/planning-tips/");
  const cards = page.locator("[data-guide-list] article");
  expect(await cards.count()).toBeGreaterThan(0);
  expect(await cards.count()).toBeLessThan(ENGLISH.length);
  const labels = await page.locator("[data-guide-list] article p a").allTextContents();
  expect(labels.length).toBe(await cards.count());
  for (const label of labels) expect(label.trim()).toBe("Planning tips");
  await expect(page.locator('[data-guide-categories] a[aria-current="page"]')).toHaveText("Planning tips");
});

test("a guide is a BlogPosting by the organisation, with breadcrumbs and no person", async ({ page }) => {
  await page.goto("/guides/midsummer-2027-sweden/");
  const data = await jsonLd(page);
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  const post = graph.find((item) => item["@type"] === "BlogPosting");
  expect(post).toMatchObject({
    headline: await page.locator("h1").textContent(),
    datePublished: "2026-11-24",
    inLanguage: "en",
    author: { "@type": "Organization", name: "leavemaxxing" },
    publisher: { "@type": "Organization", name: "leavemaxxing" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/guides/midsummer-2027-sweden/` },
    image: `${SITE}/og/guides/en/midsummer-2027-sweden.png`,
  });
  expect(graph.some((item) => item["@type"] === "BreadcrumbList")).toBe(true);
  expect(JSON.stringify(data)).not.toContain('"Person"');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
  await expect(page.locator("[data-guide]")).toContainText("By the leavemaxxing team");
  const image = await page.request.get("/og/guides/en/midsummer-2027-sweden.png");
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("translated guides point at each other with hreflang and the language switcher", async ({ page }) => {
  await page.goto("/sv-se/guides/midsommar-2027/");
  await expect(page.locator("html")).toHaveAttribute("lang", "sv-SE");
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    `${SITE}/guides/midsummer-2027-sweden/`,
  );
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
    "href",
    `${SITE}/guides/midsummer-2027-sweden/`,
  );
  await expect(page.locator('a[data-track="language_change"][data-track-to="en"]')).toHaveAttribute(
    "href",
    "/guides/midsummer-2027-sweden/",
  );
  await page.goto("/guides/midsummer-2027-sweden/");
  await expect(page.locator('link[rel="alternate"][hreflang="sv-SE"]')).toHaveAttribute(
    "href",
    `${SITE}/sv-se/guides/midsommar-2027/`,
  );
});

test("guide partner links: Kiwi.com carries the marker, disabled partners stay plain", async ({ page }) => {
  await page.goto("/guides/midsummer-2027-sweden/");
  await expect(page.locator("[data-guide-disclosure]")).toHaveText(
    "Partner links: we may earn a commission at no extra cost to you.",
  );
  const flights = page.locator('a[data-track="affiliate_click"][data-track-partner="kiwi"]');
  expect(await flights.count()).toBeGreaterThan(0);
  for (const href of await flights.evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  )) {
    expect(href).toMatch(/^https:\/\/c111\.travelpayouts\.com\/click\?shmarker=811075&promo_id=3791&/);
    expect(decodeURIComponent(href)).toContain("https://www.kiwi.com/deep?from=STO");
  }
  const stays = page.locator('a[data-track="affiliate_click"][data-track-partner="booking"]');
  await expect(stays).toHaveCount(1);
  await expect(stays).toHaveAttribute(
    "href",
    /^https:\/\/www\.booking\.com\/searchresults\.html\?ss=Leksand&/,
  );
  for (const link of await page.locator('a[data-track="affiliate_click"]').all()) {
    await expect(link).toHaveAttribute("rel", "sponsored nofollow noopener");
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await expect(page.locator('a[href^="flights:"], a[href^="stays:"], a[href^="things:"]')).toHaveCount(0);
});

test("a guide partner click sends affiliate_click, like the planner row", async ({ page }) => {
  await page.route(/^https?:\/\/(?:[^/]+\.)?(?:kiwi\.com|travelpayouts\.com)\//, (route) => route.abort());
  await page.addInitScript((key) => {
    const record = (name: string, properties?: Record<string, string | number>) => {
      const list = JSON.parse(sessionStorage.getItem(key) || "[]");
      list.push({ name, properties: properties ?? null });
      sessionStorage.setItem(key, JSON.stringify(list));
    };
    (window as unknown as { rybbit: { event: typeof record } }).rybbit = { event: record };
  }, EVENT_KEY);
  await page.goto("/guides/ascension-day-2027-bridge-day-trips/");
  const link = page.locator('a[data-track="affiliate_click"][data-track-partner="kiwi"]').first();
  await link.evaluate((node) => node.addEventListener("click", (event) => event.preventDefault()));
  await link.click();
  const read = () =>
    page.evaluate(
      (key) =>
        JSON.parse(sessionStorage.getItem(key) || "[]") as Array<{ name: string; properties: unknown }>,
      EVENT_KEY,
    );
  await expect.poll(async () => (await read()).map((event) => event.name)).toContain("affiliate_click");
  const events = await read();
  expect(events.find((event) => event.name === "affiliate_click")?.properties).toEqual({
    page: "guides",
    locale: "en",
    partner: "kiwi",
    kind: "flights",
    country: "SE",
    days: 4,
  });
  expect(events.map((event) => event.name)).not.toContain("outbound_click");
});

test("the RSS feeds are valid XML and list every guide in their language", async ({ page, request }) => {
  await page.goto("/guides/");
  for (const [path, folder] of [
    ["/guides/rss.xml", "en"],
    ["/sv-se/guides/rss.xml", "sv-se"],
    ["/de-de/guides/rss.xml", "de-de"],
  ] as const) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const xml = await response.text();
    const result = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, "application/xml");
      return {
        error: doc.getElementsByTagName("parsererror").length,
        links: [...doc.querySelectorAll("item > link")].map((node) => node.textContent),
      };
    }, xml);
    expect(result.error, path).toBe(0);
    const prefix = folder === "en" ? "/guides/" : `/${folder}/guides/`;
    expect(result.links.sort(), path).toEqual(
      slugs(folder)
        .map((slug) => `${SITE}${prefix}${slug}/`)
        .sort(),
    );
  }
});

test("the sitemap lists the hubs, categories and every guide", async ({ request }) => {
  const xml = await (await request.get("/sitemap-0.xml")).text();
  for (const path of ["/guides/", "/sv-se/guides/", "/de-de/guides/", "/guides/category/destinations/"]) {
    expect(xml, path).toContain(`<loc>${SITE}${path}</loc>`);
  }
  for (const folder of ["en", "sv-se", "de-de"]) {
    const prefix = folder === "en" ? "/guides/" : `/${folder}/guides/`;
    for (const slug of slugs(folder)) expect(xml, slug).toContain(`<loc>${SITE}${prefix}${slug}/</loc>`);
  }
});

test("every internal link in a guide resolves", async ({ page, request }) => {
  const checked = new Set<string>();
  const pages = [
    ...ENGLISH.map((slug) => `/guides/${slug}/`),
    ...slugs("sv-se").map((slug) => `/sv-se/guides/${slug}/`),
    ...slugs("de-de").map((slug) => `/de-de/guides/${slug}/`),
  ];
  for (const path of pages) {
    await page.goto(path);
    const hrefs = await page
      .locator("[data-guide] a[href^='/'], section a[href^='/']")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    for (const href of hrefs) {
      if (checked.has(href)) continue;
      checked.add(href);
      const response = await request.get(href);
      expect(response.status(), `${path} → ${href}`).toBe(200);
    }
  }
  expect(checked.size).toBeGreaterThan(10);
});

test("navigation links each language to its guides", async ({ page }) => {
  for (const [path, hub] of [
    ["/", "/guides/"],
    ["/sv-se/", "/sv-se/guides/"],
    ["/de-de/", "/de-de/guides/"],
    ["/fr-fr/", "/guides/"],
  ] as const) {
    await page.goto(path);
    expect(await page.locator(`header a[href="${hub}"]`).count(), path).toBeGreaterThan(0);
    await expect(page.locator(`footer a[href="${hub}"]`), path).toHaveCount(1);
  }
});

test("Swedish and German planner pages link their guides", async ({ page }) => {
  for (const [path, prefix] of [
    ["/se/2027/", "/guides/"],
    ["/de/2027/", "/guides/"],
    ["/sv-se/klamdagar-2027/", "/sv-se/guides/"],
    ["/de-de/brueckentage-2027/", "/de-de/guides/"],
    ["/de-de/brueckentage-2027/bayern/", "/de-de/guides/"],
  ] as const) {
    await page.goto(path);
    const links = page.locator(`[data-planner-guides] li a[href^="${prefix}"]`);
    expect(await links.count(), path).toBeGreaterThan(0);
  }
  await page.goto("/fr/2027/");
  await expect(page.locator("[data-planner-guides]")).toHaveCount(0);
});
