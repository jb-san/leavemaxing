import { type BrowserContext, test as base, expect } from "@playwright/test";

/** AdSense, its ad hosts, and the consent message it loads. Stubbed so e2e stays offline from Google. */
const AD_HOST =
  /^https?:\/\/(?:[^/]+\.)?(?:googlesyndication\.com|doubleclick\.net|adtrafficquality\.google|fundingchoicesmessages\.google\.com)(?:\/|$)/;

export async function blockAdHosts(context: BrowserContext): Promise<void> {
  await context.route(AD_HOST, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: "",
    }),
  );
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await blockAdHosts(context);
    await use(context);
  },
});

export { expect };
