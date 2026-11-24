import { test as base, expect } from "@playwright/test";

/** Google ad, consent-message and ad-measurement hosts. The site no longer loads any of them. */
export const AD_HOST =
  /^https?:\/\/(?:[^/]+\.)?(?:googlesyndication\.com|doubleclick\.net|googleadservices\.com|adtrafficquality\.google|fundingchoicesmessages\.google\.com)(?:\/|$)/;

/** Travelpayouts Drive, loaded on every page after load. Blocked quietly in tests. */
export const AFFILIATE_HOST = /^https?:\/\/(?:[^/]+\.)?tpembars\.com(?:\/|$)/;

export const test = base.extend({
  context: async ({ context }, use) => {
    // Abort and record any ad request, then fail the test if one was made.
    const adRequests: string[] = [];
    await context.route(AD_HOST, (route) => {
      adRequests.push(route.request().url());
      return route.abort();
    });
    // The Travelpayouts Drive script (docs/affiliate.md) is expected; keep it out of tests. An empty reply rather than
    // an abort, which Chrome logs as a console error (planner.spec.ts fails on those).
    await context.route(AFFILIATE_HOST, (route) =>
      route.request().resourceType() === "script"
        ? route.fulfill({ status: 200, contentType: "text/javascript", body: "" })
        : route.abort(),
    );
    await use(context);
    expect(adRequests, "no requests to Google ad hosts").toEqual([]);
  },
});

export { expect };
