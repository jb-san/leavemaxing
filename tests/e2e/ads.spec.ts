import { expect, test } from "./fixtures";

const plannerPages = [
  { path: "/", plan: "Your plan" },
  { path: "/de/2027/", plan: "Your plan" },
  { path: "/se/2027/", plan: "Your plan" },
  { path: "/de-de/", plan: "Dein Plan" },
  { path: "/sv-se/", plan: "Din plan" },
  { path: "/de-de/brueckentage-2027/", plan: "Dein Plan" },
  { path: "/sv-se/klamdagar-2027/", plan: "Din plan" },
];

test("consent defaults are emitted before the AdSense loader", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "the built HTML is the same for both browsers");
  const html = await (await page.request.get("/de-de/")).text();
  const consent = html.indexOf("gtag('consent', 'default'");
  const loader = html.indexOf(
    "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1457689618305369",
  );
  expect(consent).toBeGreaterThan(-1);
  expect(loader).toBeGreaterThan(consent);
  const before = html.slice(consent, loader);
  expect(before).toContain("ad_storage: 'denied'");
  expect(before).toContain("ad_user_data: 'denied'");
  expect(before).toContain("ad_personalization: 'denied'");
  expect(before).toContain("analytics_storage: 'denied'");
  expect(before).toContain("wait_for_update: 500");
  expect(before).toContain('"GB"');
  expect(before).toContain('"CH"');
  expect(html.match(/adsbygoogle\.js/g)).toHaveLength(1);
  expect(html).not.toContain("&quot;ad_storage");
});

test("empty slot ids render no ad markup", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "the built HTML is the same for both browsers");
  const paths = [
    "/",
    "/de/2027/",
    "/de-de/",
    "/de-de/brueckentage-2027/",
    "/sv-se/klamdagar-2027/",
    "/best/2027/",
    "/de-de/best/2027/",
    "/privacy-policy/",
    "/404/",
    "/about/",
    "/compare/",
  ];
  for (const path of paths) {
    const html = await (await page.request.get(path)).text();
    expect(html, path).not.toContain('class="adsbygoogle"');
    expect(html, path).not.toContain("data-ad-slot");
    expect(html, path).not.toContain("data-ad-placement");
  }
});

test("no ad markup renders above or inside the planner results", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "document order does not depend on the viewport");
  for (const item of plannerPages) {
    await page.goto(item.path);
    const plan = page.locator(`section[aria-label="${item.plan}"]`);
    await expect(plan).toBeVisible();
    const above = await page.evaluate((label) => {
      const results = document.querySelector(`section[aria-label="${label}"]`);
      if (!results) return ["missing plan"];
      const preceding = Node.DOCUMENT_POSITION_PRECEDING;
      const inside = Node.DOCUMENT_POSITION_CONTAINED_BY;
      return [...document.querySelectorAll("ins.adsbygoogle, [data-ad-placement], [data-ad-slot]")]
        .filter((ad) => {
          const position = results.compareDocumentPosition(ad);
          return (position & preceding) !== 0 || (position & inside) !== 0;
        })
        .map((ad) => ad.getAttribute("data-ad-placement") || ad.className);
    }, item.plan);
    expect(above, item.path).toEqual([]);
  }
});

test("share and calendar dialogs contain no ad markup", async ({ page }) => {
  await page.goto("/de/2027/");
  await expect(async () => {
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Share your plan" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const share = page.getByRole("dialog", { name: "Share your plan" });
  await expect(share.locator("ins.adsbygoogle, [data-ad-placement]")).toHaveCount(0);

  await page.goto("/de/2027/");
  await page.getByRole("button", { name: "Add to calendar", exact: true }).click();
  const calendar = page.getByRole("dialog", { name: "Add to your calendar" });
  await expect(calendar).toBeVisible();
  await expect(calendar.locator("ins.adsbygoogle, [data-ad-placement]")).toHaveCount(0);
});

test("html lang matches the page locale", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "lang is in the document element");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/de-de/");
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
  await page.goto("/de-de/brueckentage-2027/");
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
  await page.goto("/sv-se/klamdagar-2027/");
  await expect(page.locator("html")).toHaveAttribute("lang", "sv-SE");
  await page.goto("/uk-ua/dovhi-vykhidni-2027/");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk-UA");
});
