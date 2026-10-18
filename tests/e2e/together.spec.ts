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
  await mine.click();
  await expect(mine).toHaveAttribute("aria-pressed", "true");
  await expect(mine).toHaveAccessibleName(new RegExp(`^${day}, you can't\\.$`));

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
