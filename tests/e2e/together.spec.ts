import AxeBuilder from "@axe-core/playwright";
import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";
import { parseFragment } from "../../src/lib/together/link";
import { LIMITS, MEMBER_COLORS, type MemberRecord } from "../../src/lib/together/protocol";
import { GroupSession } from "../../src/lib/together/session";

/** Keep test runs out of the real analytics. Every context this spec uses goes through here. */
async function blockAnalytics(context: BrowserContext): Promise<BrowserContext> {
  await context.route("**/analytics.vril.tech/**", (r) => r.abort());
  return context;
}

/** A second browser, as another device would be, with analytics blocked. */
function newContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext().then(blockAnalytics);
}

test.beforeEach(async ({ context }) => {
  await blockAnalytics(context);
});

async function createGroup(page: Page) {
  await page.goto("/together/");
  await page.getByLabel("Trip name").fill("Lisbon 2027");
  await page.getByLabel("Your name").fill("Sam");
  await page.getByRole("button", { name: "Create group" }).click();
}

/** Every axe violation, whatever its impact. */
async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
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

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The month `n` months after the current one. */
function monthFromNow(n: number) {
  const now = new Date();
  const m0 = now.getMonth() + n;
  return { year: now.getFullYear() + Math.floor(m0 / 12), month: (m0 % 12) + 1 };
}
const label = (m: { year: number; month: number }) => `${SHORT[m.month - 1]} ${m.year}`;

test("the month range picker picks a range by keyboard", async ({ page }) => {
  await page.goto("/together/");
  const field = page.getByRole("button", { name: /^When / });
  await expect(field).toHaveText(`${label(monthFromNow(0))} – ${label(monthFromNow(5))}`);
  await field.click();
  const picker = page.getByRole("dialog", { name: "Trip months" });
  await expect(picker).toBeVisible();
  // Focus starts on the first month of the range, which is this month.
  await expect(picker.getByRole("button", { pressed: true }).first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(picker).toBeHidden();
  await expect(field).toHaveText(`${label(monthFromNow(1))} – ${label(monthFromNow(3))}`);
});

test("the month range picker caps the range and restarts before the start", async ({ page }) => {
  await page.goto("/together/");
  const field = page.getByRole("button", { name: /^When / });
  const before = await field.textContent();
  await field.click();
  const picker = page.getByRole("dialog", { name: "Trip months" });
  await expect(picker.getByRole("button", { pressed: true }).first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  // Twelve months on from the start would make thirteen in all.
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(picker).toBeVisible();
  // Eleven months on is the last that can be picked.
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(":focus")).not.toHaveAttribute("aria-disabled", "true");
  // Tapping a month before the start starts again from there.
  const now = monthFromNow(0);
  const nowName = `${new Date(now.year, now.month - 1).toLocaleString("en-GB", { month: "long" })} ${now.year}`;
  // The grid is showing next year, where the focus went.
  await picker.getByRole("button", { name: "Previous year" }).click();
  await picker.getByRole("button", { name: nowName }).click();
  await expect(picker.getByText("Now tap the last month")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(field).toHaveText(before ?? "");
  await expect(field).toBeFocused();
});

test("the personal link opens the group on another device", async ({ page, browser }) => {
  await createGroup(page);
  await expect(page.getByRole("img", { name: /Scan to join Lisbon 2027/ })).toBeVisible();
  const personal = page.url();
  // A fresh context has nothing stored, so the group has to come from the server.
  const other = await newContext(browser);
  const second = await other.newPage();
  await second.goto(personal);
  await expect(second.getByRole("heading", { name: "Lisbon 2027" })).toBeVisible();
  await other.close();
});

for (const scheme of ["light", "dark"] as const) {
  test(`together has no serious accessibility problems (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/together/");
    await expect(page.getByLabel("Trip name")).toBeVisible();
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

test("join via invite", async ({ page, browser }) => {
  await createGroup(page);
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("img", { name: /Scan to join/ })).toBeVisible();
  const invite = await sheet.getByLabel("Link").inputValue();
  expect(invite).toContain("/together/#");

  const other = await newContext(browser);
  const second = await other.newPage();
  await second.goto(invite);
  await expect(second.getByRole("heading", { name: "Sam invited you to Lisbon 2027" })).toBeVisible();
  expect(await serious(second)).toEqual([]);
  await second.getByLabel("Your name").fill("Alex");
  await second.getByRole("button", { name: "Join group" }).click();
  await expect(second.getByRole("heading", { name: "Lisbon 2027" })).toBeVisible();
  // The address is now Alex's own link, not the invite.
  await expect.poll(() => second.url()).not.toBe(invite);
  expect(new URL(second.url()).hash.slice(1).split(".").length).toBeGreaterThanOrEqual(4);

  for (const p of [page, second]) {
    await p.keyboard.press("Escape");
    const members = p.getByRole("list", { name: "Members" });
    await expect(members.getByRole("listitem").filter({ hasText: "Sam" })).toBeVisible();
    await expect(members.getByRole("listitem").filter({ hasText: "Alex" })).toBeVisible();
  }
  await other.close();
});

test("broken link", async ({ page }) => {
  await page.goto("/together/#abc");
  await expect(page.getByText("This link is incomplete. Ask for the invite again.")).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

/** Sam creates the group and Alex joins it from a second browser. Each waits until they see the other. */
async function twoMembers(page: Page, browser: Browser, scheme: "light" | "dark" = "light") {
  await createGroup(page);
  const invite = await page.getByRole("dialog").getByLabel("Link").inputValue();
  await page.keyboard.press("Escape");
  const other = await newContext(browser);
  const second = await other.newPage();
  await second.emulateMedia({ colorScheme: scheme });
  await second.goto(invite);
  await second.getByLabel("Your name").fill("Alex");
  await second.getByRole("button", { name: "Join group" }).click();
  for (const p of [page, second]) {
    await expect(p.getByRole("list", { name: "Members" }).getByRole("listitem")).toHaveCount(2);
  }
  return { other, second };
}

test("both vote and agree", async ({ page, browser }) => {
  const { other, second } = await twoMembers(page, browser, "dark");
  const suggested = page.getByRole("region", { name: "Suggested dates" });

  // Tapping your vote again clears it; arrow keys move and pick.
  const otherDates = (await suggested.getByRole("article").nth(1).getByRole("heading").textContent()) ?? "";
  const row = suggested.getByRole("article", { name: otherDates, exact: true });
  const radio = (name: RegExp) => row.getByRole("radio", { name });
  await radio(/^Maybe/).click();
  await expect(radio(/^Maybe/)).toHaveAttribute("aria-checked", "true");
  await radio(/^Maybe/).click();
  await expect(row.getByRole("radio", { checked: true })).toHaveCount(0);
  await radio(/^Works/).focus();
  await page.keyboard.press("ArrowRight");
  await expect(radio(/^Maybe/)).toBeFocused();
  await expect(radio(/^Maybe/)).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(radio(/^Can't/)).toBeFocused();
  await expect(radio(/^Can't/)).toHaveAttribute("aria-checked", "true");
  await radio(/^Can't/).click();
  await expect(row.getByRole("radio", { checked: true })).toHaveCount(0);

  const first = suggested.getByRole("article").first();
  const dates = (await first.getByRole("heading").textContent()) ?? "";
  expect(dates).not.toBe("");
  await first.getByRole("radio", { name: /^Works/ }).click();
  await expect(first.getByRole("radio", { name: /^Works/ })).toHaveAttribute("aria-checked", "true");

  const theirs = second
    .getByRole("region", { name: "Suggested dates" })
    .getByRole("article", { name: dates, exact: true });
  await expect(theirs.getByRole("radio", { name: /^Works/ })).toContainText("1");
  await theirs.getByRole("radio", { name: /^Works/ }).click();

  for (const p of [page, second]) {
    await expect(p.getByRole("region", { name: "Works for everyone" })).toContainText(dates);
    // Agreed dates move out of the suggestions rather than showing twice.
    await expect(
      p.getByRole("region", { name: "Suggested dates" }).getByRole("article", { name: dates, exact: true }),
    ).toHaveCount(0);
  }
  for (const p of [page, second]) {
    await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    expect(await violations(p)).toEqual([]);
  }
  await other.close();
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

test("a day marked in the shared calendar shows for the others", async ({ page, browser, isMobile }) => {
  const { other, second } = await twoMembers(page, browser);
  const next = monthFromNow(1);
  const weekday = WEEKDAYS[new Date(Date.UTC(next.year, next.month - 1, 15)).getUTCDay()];
  const day = `${weekday} 15 ${SHORT[next.month - 1]}`;

  // Phones show one month at a time, starting with this one.
  if (isMobile) await page.getByRole("button", { name: "Next month" }).click();
  const mine = page.getByRole("button", { name: new RegExp(`^${day},`) });
  await expect(mine).toHaveAttribute("aria-pressed", "false");
  // Tapping a day opens its menu. A weekday offers "Can't do this day", a weekend "Not free".
  await mine.click();
  const menu = page.getByRole("dialog", { name: new RegExp(`^${day} ${next.year}$`) });
  await menu.getByRole("button", { name: /^(Can't do this day|Not free)/ }).click();
  await expect(menu).toBeHidden();
  await expect(mine).toBeFocused();
  await expect(mine).toHaveAttribute("aria-pressed", "true");
  await expect(mine).toHaveAccessibleName(new RegExp(`^${day}, you can't\\.`));

  if (isMobile) await second.getByRole("button", { name: "Next month" }).click();
  const theirs = second.getByRole("button", { name: new RegExp(`^${day},`) });
  await expect(theirs).toHaveAccessibleName(/\. Sam can't\.$/);
  // Sam has the first member colour.
  await expect(theirs.locator(".dot")).toHaveCSS("background-color", "rgb(225, 29, 72)");
  await other.close();
});

test("settings keep a name typed just before closing, and the admin can remove a member", async ({
  page,
  browser,
}) => {
  // Sam's timers only run when the test says, so typing never settles on its own.
  await page.clock.install();
  const { other, second } = await twoMembers(page, browser);
  await page.clock.pauseAt(Date.now() + 1000);
  await page.getByRole("button", { name: /Edit$/ }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  await sheet.getByLabel("Your name").fill("Samantha");
  // Closing the sheet sends the name before the 400 ms pause after typing is up.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await page.clock.runFor(350);
  await expect(sheet.getByLabel("Your name")).toHaveCount(0);
  await expect(second.getByRole("list", { name: "Members" })).toContainText("Samantha");

  await page.getByRole("button", { name: /Edit$/ }).click();
  await sheet.getByRole("button", { name: "Remove Alex" }).click();
  await expect(sheet.getByText("Remove Alex?")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Cancel" })).toBeFocused();
  await sheet.getByRole("button", { name: "Confirm" }).click();
  await expect(second.getByText("You were removed from this group.")).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Members" })).toBeFocused();
  await expect(sheet.getByRole("button", { name: "Remove Alex" })).toHaveCount(0);
  await other.close();
});

test("a full group shows the full screen instead of the join form", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "the server side is the same on every screen");
  await createGroup(page);
  const invite = await page.getByRole("dialog").getByLabel("Link").inputValue();
  const link = parseFragment(new URL(invite).hash);
  // Fill the group from Node: one session per member, like that many browsers.
  const sessions = Array.from(
    { length: LIMITS.members - 1 },
    () => new GroupSession(link, { storage: null }),
  );
  const member = (i: number): MemberRecord => ({
    name: `Friend ${i}`,
    color: MEMBER_COLORS[i % MEMBER_COLORS.length] as string,
    country: "PT",
    region: null,
    workWeek: [true, true, true, true, true, false, false],
    customOff: [],
    blocked: [],
    allowance: 5,
    proposals: [],
    votes: {},
  });
  await Promise.all(
    sessions.map(async (s, i) => {
      await expect.poll(() => s.state.loaded).toBe(true);
      await s.join(member(i));
    }),
  );
  await expect(page.getByRole("list", { name: "Members" })).toContainText(`Friend ${LIMITS.members - 2}`);

  const other = await newContext(browser);
  const late = await other.newPage();
  const events: string[] = [];
  await late.exposeFunction("recordEvent", (name: string) => events.push(name));
  await late.addInitScript(() => {
    (window as unknown as { rybbit: unknown }).rybbit = {
      event: (name: string) => (window as unknown as { recordEvent: (n: string) => void }).recordEvent(name),
    };
  });
  await late.goto(invite);
  await expect(late.getByText("This group is full (20 people).")).toBeVisible();
  await expect(late.getByRole("button", { name: "Join group" })).toHaveCount(0);
  expect(events).toEqual([]);
  for (const s of sessions) s.close();
  await other.close();
});

/** "Sun 8 Nov": how a day's accessible name starts. */
function dayName(m: { year: number; month: number }, day: number) {
  return `${WEEKDAYS[new Date(Date.UTC(m.year, m.month - 1, day)).getUTCDay()]} ${day} ${SHORT[m.month - 1]}`;
}

/** Opens "Propose dates" and taps the first and last day of a range in the given month. */
async function pickRange(
  p: Page,
  isMobile: boolean,
  m: { year: number; month: number },
  a: number,
  b: number,
) {
  await p.getByRole("button", { name: "Propose dates" }).click();
  const sheet = p.getByRole("dialog", { name: "Propose dates" });
  await expect(sheet).toBeVisible();
  // Phones show one month at a time, starting with this one.
  if (isMobile && m.month !== monthFromNow(0).month)
    await sheet.getByRole("button", { name: "Next month" }).click();
  await sheet.getByRole("button", { name: new RegExp(`^${dayName(m, a)},`) }).click();
  await sheet.getByRole("button", { name: new RegExp(`^${dayName(m, b)},`) }).click();
  return sheet;
}

test("propose and add to plan", async ({ page, browser, isMobile }) => {
  const { other, second } = await twoMembers(page, browser);
  const next = monthFromNow(1);
  const dates = `8–12 ${SHORT[next.month - 1]}`;

  // Alex proposes the 8th to the 12th of next month.
  const sheet = await pickRange(second, isMobile, next, 12, 8);
  const summary = sheet.getByText(/^5 days, costs you \d+ leave$/);
  await expect(summary).toBeVisible();
  const cost = Number(/costs you (\d+)/.exec((await summary.textContent()) ?? "")?.[1]);
  await second.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  expect(await violations(second)).toEqual([]);
  await sheet.getByRole("button", { name: "Propose dates" }).click();
  await expect(sheet).toBeHidden();
  await expect(second.getByRole("button", { name: "Propose dates" })).toBeFocused();

  // Sam sees it under "Proposed", with Alex's initial.
  const row = page
    .getByRole("region", { name: "Proposed" })
    .getByRole("article", { name: dates, exact: true });
  await expect(row.getByRole("list", { name: "Proposed by" })).toHaveText("AAlex");
  await expect(row.getByRole("button", { name: "Withdraw" })).toHaveCount(0);

  // The shared calendar outlines the proposed days and says who proposed them.
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Proposed");
  if (isMobile) await page.getByRole("button", { name: "Next month" }).click();
  const inside = page.getByRole("button", { name: new RegExp(`^${dayName(next, 10)},`) });
  await expect(inside).toHaveAccessibleName(
    new RegExp(` Proposed by Alex\\. In ${dates}: you haven't voted, Alex hasn't voted\\.$`),
  );
  await expect(inside).toHaveAttribute("data-pr", "");
  await expect(page.getByRole("button", { name: new RegExp(`^${dayName(next, 13)},`) })).not.toHaveAttribute(
    "data-pr",
  );

  await row.getByRole("radio", { name: /^Works/ }).click();
  const theirs = second
    .getByRole("region", { name: "Proposed" })
    .getByRole("article", { name: dates, exact: true });
  await theirs.getByRole("radio", { name: /^Works/ }).click();

  const agreed = page
    .getByRole("region", { name: "Works for everyone" })
    .getByRole("article", { name: dates });
  await expect(agreed).toBeVisible();
  // Only agreed dates go into a plan.
  await expect(row.getByRole("button", { name: "Add to my plan" })).toHaveCount(0);
  await agreed.getByRole("button", { name: "Add to my plan" }).click();

  await expect(page).toHaveURL(/\/[a-z]{2}\/\d{4}\/\?(.*&)?lk=/);
  // Every working day of the trip is a leave day in the plan.
  await expect(page.locator('.day[data-k="locked"]')).toHaveCount(cost);
  for (let day = 8; day <= 12; day++) {
    const cell = page.getByRole("button", { name: new RegExp(`^${dayName(next, day)},`) });
    await expect(cell).toHaveAttribute("data-k", /^(locked|weekend|holiday|custom)$/);
  }
  await other.close();
});

test("withdrawing takes back only your proposal", async ({ page, browser, isMobile }) => {
  const { other, second } = await twoMembers(page, browser);
  const next = monthFromNow(1);
  const dates = `15–19 ${SHORT[next.month - 1]}`;

  for (const p of [page, second]) {
    const sheet = await pickRange(p, isMobile, next, 15, 19);
    await sheet.getByRole("button", { name: "Propose dates" }).click();
    await expect(sheet).toBeHidden();
  }
  const row = (p: Page) =>
    p.getByRole("region", { name: "Proposed" }).getByRole("article", { name: dates, exact: true });
  await expect(row(page).getByRole("list", { name: "Proposed by" })).toHaveText("SSam (you)AAlex");

  await row(second).getByRole("button", { name: "Withdraw" }).click();
  await expect(row(page).getByRole("list", { name: "Proposed by" })).toHaveText("SSam (you)");
  await expect(row(second).getByRole("button", { name: "Withdraw" })).toHaveCount(0);

  await row(page).getByRole("button", { name: "Withdraw" }).click();
  for (const p of [page, second]) await expect(p.getByRole("region", { name: "Proposed" })).toHaveCount(0);
  await other.close();
});

/** The first day of a month, from the `from`th on, that is a workday for you: its button and name. */
async function workday(p: Page, m: { year: number; month: number }, from: number) {
  for (let day = from; day <= 28; day++) {
    const name = dayName(m, day);
    const button = p.getByRole("button", { name: new RegExp(`^${name},`) }).first();
    if ((await button.getAttribute("aria-label"))?.startsWith(`${name}, workday.`))
      return { button, name, day };
  }
  throw new Error("no workday");
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("a day off anyway is yours alone", async ({ page, browser, isMobile }) => {
  const { other, second } = await twoMembers(page, browser);
  const next = monthFromNow(1);
  if (isMobile) await page.getByRole("button", { name: "Next month" }).click();
  const { button: mine, name } = await workday(page, next, 8);
  await expect(page.getByRole("list", { name: "Legend" })).not.toContainText("Day off");
  await mine.click();
  const menu = page.getByRole("dialog", { name: `${name} ${next.year}` });
  await expect(menu.getByRole("button", { name: /^Propose dates from here/ })).toBeVisible();
  await menu.getByRole("button", { name: /^Day off anyway/ }).click();
  await expect(menu).toBeHidden();
  await expect(mine).toBeFocused();
  await expect(mine).toHaveAccessibleName(new RegExp(`^${name}, your day off\\.`));
  await expect(mine).toHaveAttribute("data-k", "custom");
  await expect(mine).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Day off");

  // Alex sees nothing they can't do there.
  if (isMobile) await second.getByRole("button", { name: "Next month" }).click();
  const theirs = second.getByRole("button", { name: new RegExp(`^${name},`) });
  await expect(theirs).toHaveAccessibleName(new RegExp(`^${name}, workday\\.`));
  await expect(theirs).not.toHaveAccessibleName(/Sam can't/);

  // Marking it as a day Sam can't do replaces the day off.
  await mine.click();
  await menu.getByRole("button", { name: /^Remove day off/ }).click();
  await expect(mine).toHaveAttribute("data-k", "work");
  await mine.click();
  await menu.getByRole("button", { name: /^Can't do this day/ }).click();
  await expect(mine).toHaveAttribute("data-k", "blocked");
  await expect(theirs).toHaveAccessibleName(/ Sam can't\./);
  await other.close();
});

test("a can't vote hatches the dates for everyone", async ({ page, browser }) => {
  const { other, second } = await twoMembers(page, browser);
  const suggested = second.getByRole("region", { name: "Suggested dates" });
  const rows = suggested.getByRole("article");
  await expect(rows.first()).toBeVisible();
  await expect(page.locator('.day[data-tone="vetoed"]')).toHaveCount(0);
  // Alex can't do any of the suggested dates, so every banded day is vetoed.
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const radio = rows.nth(i).getByRole("radio", { name: /^Can't/ });
    await radio.click();
    await expect(radio).toHaveAttribute("aria-checked", "true");
  }
  const vetoed = page.locator('.day[data-tone="vetoed"]');
  await expect(vetoed.first()).toBeAttached();
  await expect(page.locator('.day[data-tone="open"]')).toHaveCount(0);
  await expect(vetoed.first()).toHaveAttribute("data-br", "vetoed");
  await expect(vetoed.first()).toHaveAccessibleName(/ In [^:]+: you haven't voted, Alex can't\./);
  // Each window's first day carries the votes, Alex's a cross.
  await expect(page.locator('.day .cl [data-vote="no"]')).toHaveCount(count);
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Someone can't");
  await other.close();
});

test("vote from a day's menu", async ({ page, browser }) => {
  const { other } = await twoMembers(page, browser);
  const suggested = page.getByRole("region", { name: "Suggested dates" });
  const dates = (await suggested.getByRole("article").first().getByRole("heading").textContent()) ?? "";
  expect(dates).not.toBe("");
  const day = page.getByRole("button", { name: new RegExp(` In ${escapeRe(dates)}: `) }).first();
  await day.click();
  const menu = page.getByRole("dialog");
  const section = menu.getByRole("region", { name: dates, exact: true });
  await expect(section.getByRole("list", { name: "Everyone's votes" })).toContainText(
    "Sam (you):No vote yet",
  );
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  expect(await violations(page)).toEqual([]);

  await section.getByRole("radio", { name: /^Works/ }).click();
  await expect(section.getByRole("radio", { name: /^Works/ })).toHaveAttribute("aria-checked", "true");
  await expect(section.getByRole("list", { name: "Everyone's votes" })).toContainText("Sam (you):Works");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(day).toBeFocused();
  const row = suggested.getByRole("article", { name: dates, exact: true });
  await expect(row.getByRole("radio", { name: /^Works/ })).toHaveAttribute("aria-checked", "true");
  await expect(day).toHaveAccessibleName(
    new RegExp(` In ${escapeRe(dates)}: you work, Alex hasn't voted\\.`),
  );
  await other.close();
});

test("propose dates from a day", async ({ page, browser, isMobile }) => {
  const { other } = await twoMembers(page, browser);
  const next = monthFromNow(1);
  if (isMobile) await page.getByRole("button", { name: "Next month" }).click();
  const start = page.getByRole("button", { name: new RegExp(`^${dayName(next, 8)},`) });
  await start.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Propose dates from here/ })
    .click();
  const sheet = page.getByRole("dialog", { name: "Propose dates" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Now tap the last day.")).toBeVisible();
  await expect(sheet.getByRole("button", { name: new RegExp(`^${dayName(next, 8)},`) })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Two days are shorter than any trip.
  await sheet.getByRole("button", { name: new RegExp(`^${dayName(next, 9)},`) }).click();
  await expect(sheet.getByText("Pick at least 3 days.")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Propose dates" })).toBeDisabled();
  // A third tap starts again.
  await sheet.getByRole("button", { name: new RegExp(`^${dayName(next, 8)},`) }).click();
  await sheet.getByRole("button", { name: new RegExp(`^${dayName(next, 12)},`) }).click();
  await expect(sheet.getByText(/^5 days, costs you \d+ leave$/)).toBeVisible();
  await sheet.getByRole("button", { name: "Propose dates" }).click();
  await expect(sheet).toBeHidden();
  await expect(start).toBeFocused();
  await expect(start).toHaveAttribute("data-pr", "");
  await expect(start).toHaveAttribute("data-tone", "open");
  await other.close();
});
