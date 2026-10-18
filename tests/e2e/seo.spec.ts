import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/sv-se/klamdagar-2027/",
    title: "Klämdagar 2027: alla klämdagar i Sverige och hur du får längst ledighet",
  },
  {
    path: "/de-de/brueckentage-2027/",
    title: "Brückentage 2027: alle Brückentage in Deutschland",
  },
  {
    path: "/se/2027/",
    title: "Bridge days 2027 in Sweden: longest time off",
  },
  {
    path: "/de-de/brueckentage-2028/",
    title: "Brückentage 2028: alle Brückentage in Deutschland",
  },
];

for (const item of pages) {
  test(`${item.path} publishes computed FAQ data that matches the page`, async ({ page }) => {
    await page.goto(item.path);
    await expect(page).toHaveTitle(item.title);
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    const json = JSON.parse(raw ?? "{}") as {
      "@graph": Array<Record<string, unknown>>;
    };
    const faq = json["@graph"].find((node) => node["@type"] === "FAQPage") as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(faq.mainEntity.length).toBeLessThanOrEqual(5);
    const visible = await page.locator("[data-seasonal-faq]").innerText();
    for (const question of faq.mainEntity) {
      expect(visible).toContain(question.name);
      expect(visible).toContain(question.acceptedAnswer.text);
    }
    const webPage = json["@graph"].find((node) => node["@type"] === "WebPage") as { dateModified: string };
    await expect(page.locator("time")).toHaveAttribute("datetime", webPage.dateModified);
    const crumbs = json["@graph"].find((node) => node["@type"] === "BreadcrumbList") as {
      itemListElement: Array<{ position: number; name: string }>;
    };
    expect(crumbs.itemListElement.map((crumb) => crumb.position)).toEqual(
      crumbs.itemListElement.map((_, index) => index + 1),
    );
    const trail = await page.getByRole("navigation", { name: "Breadcrumb" }).innerText();
    for (const crumb of crumbs.itemListElement) expect(trail).toContain(crumb.name);
  });
}

test("home and country pages link both bridge years", async ({ page }) => {
  await page.goto("/sv-se/");
  await expect(page.getByRole("link", { name: "Klämdagar 2027" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Klämdagar 2028" }).first()).toBeVisible();

  await page.goto("/se/");
  await expect(page.getByRole("link", { name: "Bridge days 2027 in Sweden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bridge days 2028 in Sweden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Klämdagar 2027" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Klämdagar 2028" })).toBeVisible();

  await page.goto("/sv-se/best/2027/");
  await expect(page).toHaveTitle(/Klämdagar 2027/);
  await expect(page.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole("link", { name: "Klämdagar 2027" })).toBeVisible();
});
