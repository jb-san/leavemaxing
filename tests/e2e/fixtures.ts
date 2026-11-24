import { test as base, expect } from "@playwright/test";

/** Google ad, consent-message and ad-measurement hosts. The site no longer loads any of them. */
export const AD_HOST =
  /^https?:\/\/(?:[^/]+\.)?(?:googlesyndication\.com|doubleclick\.net|googleadservices\.com|adtrafficquality\.google|fundingchoicesmessages\.google\.com)(?:\/|$)/;

export const test = base.extend({
  context: async ({ context }, use) => {
    // Abort and record any ad request, then fail the test if one was made.
    const adRequests: string[] = [];
    await context.route(AD_HOST, (route) => {
      adRequests.push(route.request().url());
      return route.abort();
    });
    await use(context);
    expect(adRequests, "no requests to Google ad hosts").toEqual([]);
  },
});

export { expect };
