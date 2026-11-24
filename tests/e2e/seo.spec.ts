import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures";

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
  {
    path: "/de-de/brueckentage-2027/bayern/",
    title: "Brückentage 2027 Bayern: alle Termine und Feiertage",
  },
  {
    path: "/de-at/fenstertage-2027/",
    title: "Fenstertage 2027: alle Fenstertage in Österreich",
  },
  {
    path: "/nl-nl/brugdagen-2027/",
    title: "Brugdagen 2027: vrije dagen en feestdagen in Nederland",
  },
];

const landings = [
  {
    path: "/de-de/brueckentage-2027/bayern/",
    h1: "Brückentage 2027 Bayern: alle Termine und Feiertage",
    lang: "de-DE",
  },
  { path: "/de-de/brueckentage-2027/thueringen/", h1: "Brückentage 2027 Thüringen", lang: "de-DE" },
  { path: "/de-de/brueckentage-2027/hansestadt-bremen/", h1: "Brückentage 2027 Bremen", lang: "de-DE" },
  { path: "/de-at/fenstertage-2027/", h1: "Fenstertage 2027: alle Fenstertage in Österreich", lang: "de-AT" },
  {
    path: "/nl-nl/brugdagen-2027/",
    h1: "Brugdagen 2027: vrije dagen en feestdagen in Nederland",
    lang: "nl-NL",
  },
  { path: "/sv-se/klamdagar-2027/", h1: "Klämdagar 2027: alla klämdagar i Sverige", lang: "sv-SE" },
];

const FLAG = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

test("2027 landing pages carry their H1, clean canonical and hreflang, computed tables, and a sitemap entry", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop", "the built files are the same for both browsers");
  const sitemap = readFileSync(join(process.cwd(), "dist", "sitemap-0.xml"), "utf8");
  for (const item of landings) {
    const url = `https://leavemaxxing.com${item.path}`;
    expect(sitemap, item.path).toContain(`<loc>${url}</loc>`);
    await page.goto(`${item.path}?d=7`);
    await expect(page.locator("h1")).toContainText(item.h1);
    // The H1 is the title, with no flag.
    await expect(page.locator("h1")).toHaveText(await page.title());
    expect(await page.locator("h1").innerText()).not.toMatch(FLAG);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url);
    await expect(page.locator(`link[rel="alternate"][hreflang="${item.lang}"]`)).toHaveAttribute("href", url);
    await expect(page.locator("[data-bridge-table] tbody tr").first()).toBeVisible();
  }

  await page.goto("/de-de/brueckentage-2027/");
  const states = await page
    .locator("[data-state-table] a")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  expect(new Set(states.filter((href) => /^\/de-de\/brueckentage-2027\/[a-z-]+\/$/.test(href))).size).toBe(
    16,
  );

  await page.goto("/de-de/brueckentage-2027/bayern/");
  await expect(page.locator("[data-state-intro]")).toContainText("Fronleichnam");
  await expect(page.locator("[data-state-table] a[href='/de-de/brueckentage-2027/']")).toBeVisible();

  await page.goto("/nl-nl/brugdagen-2027/");
  for (const region of ["noord", "midden", "zuid"]) {
    await expect(page.locator(`[data-nl-region="${region}"]`)).toContainText("Zomervakantie");
  }

  await page.goto("/sv-se/klamdagar-2027/");
  await expect(page.locator("[data-month]")).toHaveCount(12);
  await expect(page.locator("#maj")).toHaveText("Klämdagar maj 2027");
});

const answers = [
  "/de-de/brueckentage-2027/",
  "/de-de/brueckentage-2027/bayern/",
  "/de-at/fenstertage-2027/",
  "/nl-nl/brugdagen-2027/",
  "/sv-se/klamdagar-2027/",
];

test("bridge-day pages answer first, in the server HTML, with the FAQ's numbers and date", async () => {
  test.skip(test.info().project.name !== "desktop", "the built files are the same for both browsers");
  for (const path of answers) {
    const html = readFileSync(join(process.cwd(), "dist", path, "index.html"), "utf8");
    const h1 = html.indexOf("<h1");
    const answerAt = html.indexOf("data-answer");
    const planner = html.search(/<astro-island[^>]*component-url="[^"]*Planner/);
    expect(h1, path).toBeGreaterThan(0);
    expect(answerAt, path).toBeGreaterThan(h1);
    expect(planner, path).toBeGreaterThan(answerAt);
    expect(html.match(/data-answer/g), path).toHaveLength(1);
    const answer = (/<p[^>]*data-answer[^>]*>([^<]*)<\/p>/.exec(html)?.[1] ?? "").replace(/&#39;/g, "'");
    const json = JSON.parse(
      /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1] ?? "{}",
    ) as {
      "@graph": Array<Record<string, unknown>>;
    };
    const faq = json["@graph"].find((node) => node["@type"] === "FAQPage") as {
      mainEntity: Array<{ acceptedAnswer: { text: string } }>;
    };
    const answers = faq.mainEntity.map((q) => q.acceptedAnswer.text).join(" ");
    const numbers = answer.match(/\d+(?:[.,]\d+)?/g) ?? [];
    expect(numbers.length, path).toBeGreaterThanOrEqual(4);
    for (const n of numbers) expect(answers, `${path}: ${n}`).toContain(n);
    const webPage = json["@graph"].find((node) => node["@type"] === "WebPage") as { dateModified: string };
    expect(html, path).toContain(`<time datetime="${webPage.dateModified}">`);
  }
});

test("pages point at their JSON data, which matches the page", async ({ page, request }) => {
  await page.goto("/sv-se/klamdagar-2027/");
  const link = page.locator('link[rel="alternate"][type="application/json"]');
  await expect(link).toHaveAttribute("href", "/data/best/se/2027.json");
  const data = (await (await request.get("/data/best/se/2027.json")).json()) as {
    country: string;
    year: number;
    region: null;
    generatedAt: string;
    recommendedPlan: { leaveDays: number; daysOff: number };
    bestBreaks: unknown[];
  };
  expect(data).toMatchObject({ country: "SE", year: 2027, region: null });
  expect(data.bestBreaks.length).toBeGreaterThan(0);
  await expect(page.locator("[data-answer]")).toContainText(
    `${data.recommendedPlan.leaveDays} semesterdagar blir det ${data.recommendedPlan.daysOff} lediga dagar`,
  );
  await expect(page.locator("time")).toHaveAttribute("datetime", data.generatedAt);
  await page.goto("/de/2027/");
  await expect(page.locator('link[rel="alternate"][type="application/json"]')).toHaveAttribute(
    "href",
    "/data/best/de/2027.json",
  );
  const index = (await (await request.get("/data/best/index.json")).json()) as {
    files: Array<{ country: string; year: number; url: string }>;
  };
  expect(index.files).toContainEqual({
    country: "SE",
    year: 2027,
    url: "https://leavemaxxing.com/data/best/se/2027.json",
  });
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toMatch(/^# leavemaxxing/);
  expect(llms).toContain("https://leavemaxxing.com/sv-se/klamdagar-2027/");
  expect(llms).toContain("/data/best/index.json");
});

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
  // The ranking targets "best countries", so it doesn't compete with /sv-se/klamdagar-2027/.
  await expect(page).toHaveTitle(/^Bästa länderna för ledighet 2027/);
  await expect(page.locator("h1")).toHaveText(await page.title());
  await expect(page.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole("link", { name: "Klämdagar 2027" })).toBeVisible();
});

const ADSENSE =
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1457689618305369" crossorigin="anonymous"></script>';

test("every page carries the AdSense tag, and ads.txt is published", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "the built files are the same for both browsers");
  const root = join(process.cwd(), "dist");
  expect(readFileSync(join(root, "index.html"), "utf8")).toContain(ADSENSE);
  expect(readFileSync(join(root, "de-de/index.html"), "utf8")).toContain(ADSENSE);
  expect(readFileSync(join(root, "privacy-policy/index.html"), "utf8")).toContain(ADSENSE);
  await page.goto("/de-de/");
  const script = page.locator(
    'script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1457689618305369"]',
  );
  await expect(script).toHaveCount(1);
  await expect(script).toHaveJSProperty("async", true);
  await expect(script).toHaveAttribute("crossorigin", "anonymous");
  const ads = await page.request.get("/ads.txt");
  expect(ads.ok()).toBe(true);
  expect((await ads.text()).trim()).toBe("google.com, pub-1457689618305369, DIRECT, f08c47fec0942fa0");
});

test("canonical, hreflang, and og:url drop plan query strings", async ({ page }) => {
  await page.goto("/de-de/brueckentage-2027/?d=10");
  const canonical = "https://leavemaxxing.com/de-de/brueckentage-2027/";
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
  const alternates = await page
    .locator('link[rel="alternate"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  expect(alternates.length).toBeGreaterThan(0);
  for (const href of alternates) expect(href).not.toMatch(/[?#]/);

  await page.goto("/compare/?c=DE&y=2027&d=15");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://leavemaxxing.com/compare/",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://leavemaxxing.com/compare/",
  );
});

test("ranking and compare links do not publish indexable plan queries", async ({ page }) => {
  await page.goto("/best/2027/");
  const english = await page
    .locator("#ranking a")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  expect(english.length).toBeGreaterThan(0);
  for (const href of english) expect(href).not.toMatch(/[?#]/);

  await page.goto("/de-de/best/2027/");
  const german = await page
    .locator("#ranking a")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  expect(german.length).toBeGreaterThan(0);
  for (const href of german) expect(href).not.toMatch(/[?#]/);
  expect(german).toContain("/de-de/brueckentage-2027/");

  await page.goto("/best/2027/");
  await page.getByRole("tab", { name: "10" }).click();
  await page.locator("#panel-10").getByRole("link", { name: "Germany" }).click();
  await expect(page).toHaveURL(/\/de\/2027\/\?d=10$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://leavemaxxing.com/de/2027/",
  );

  await page.goto("/compare/?c=DE,MT&y=2027&d=15&s=weekends");
  const openGermany = page.getByRole("link", { name: "Open Germany" });
  await expect(openGermany).toBeVisible();
  expect(await openGermany.getAttribute("href")).toBe("/de/2027/");
  await openGermany.click();
  await expect(page).toHaveURL(/\/de\/2027\/\?/);
  const opened = new URL(page.url());
  expect(opened.pathname).toBe("/de/2027/");
  expect(opened.searchParams.get("d")).toBe("15");
  expect(opened.searchParams.get("s")).toBe("weekends");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://leavemaxxing.com/de/2027/",
  );
});

test("privacy settings queues Google's consent message without leaving the page", async ({ page }) => {
  await page.goto("/de-de/");
  await page.getByRole("button", { name: "Datenschutzeinstellungen" }).click();
  await expect(page).toHaveURL(/\/de-de\/$/);
  const queued = await page.evaluate(() => {
    const g = (
      window as unknown as {
        googlefc?: { callbackQueue?: unknown[]; showRevocationMessage?: unknown };
      }
    ).googlefc;
    return g?.callbackQueue?.length === 1 && g.callbackQueue[0] === g.showRevocationMessage;
  });
  expect(queued).toBe(true);
});
