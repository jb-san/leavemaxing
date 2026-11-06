import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_DEBOUNCE_MS,
  flushAnalytics,
  pageKind,
  track,
  trackDebounced,
  usageProps,
} from "./analytics";

afterEach(() => {
  flushAnalytics();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("track", () => {
  it("does nothing when rybbit is missing or throws", () => {
    expect(() => track("country_change", { country: "DE" })).not.toThrow();
    vi.stubGlobal("window", {});
    expect(() => track("country_change", { country: "DE" })).not.toThrow();
    vi.stubGlobal("window", {
      rybbit: {
        event: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => track("country_change")).not.toThrow();
  });

  it("forwards the name and properties", () => {
    const calls: unknown[][] = [];
    vi.stubGlobal("window", {
      rybbit: { event: (...args: unknown[]) => calls.push(args) },
    });
    track(
      "region_change",
      usageProps({ country: "DE", year: 2027, locale: "en", days: 20, page: "planner" }, { region: "BY" }),
    );
    expect(calls).toEqual([
      ["region_change", { country: "DE", year: 2027, locale: "en", days: 20, page: "planner", region: "BY" }],
    ]);
  });

  it("debounces repeated number changes into the last value", () => {
    vi.useFakeTimers();
    const calls: unknown[][] = [];
    vi.stubGlobal("window", {
      rybbit: { event: (...args: unknown[]) => calls.push(args) },
    });
    trackDebounced("leave-days", "leave_days_change", { days: 21, page: "planner" });
    trackDebounced("leave-days", "leave_days_change", { days: 22, page: "planner" });
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(ANALYTICS_DEBOUNCE_MS);
    expect(calls).toEqual([["leave_days_change", { days: 22, page: "planner" }]]);
  });

  it("sends a pending event on flush and not again when the timer fires", () => {
    vi.useFakeTimers();
    const calls: unknown[][] = [];
    vi.stubGlobal("window", {
      rybbit: { event: (...args: unknown[]) => calls.push(args) },
    });
    trackDebounced("leave-days", "leave_days_change", { days: 11 });
    flushAnalytics();
    vi.advanceTimersByTime(ANALYTICS_DEBOUNCE_MS);
    expect(calls).toEqual([["leave_days_change", { days: 11 }]]);
  });
});

describe("pageKind", () => {
  it("classifies the public pages", () => {
    expect(pageKind("/")).toBe("home");
    expect(pageKind("/de-de/")).toBe("home");
    expect(pageKind("/de/2027/")).toBe("planner");
    expect(pageKind("/de/")).toBe("planner");
    expect(pageKind("/de-de/brueckentage-2027/")).toBe("planner");
    expect(pageKind("/de-de/brueckentage-2027/bayern/")).toBe("planner");
    expect(pageKind("/compare/")).toBe("compare");
    expect(pageKind("/best/2027/")).toBe("ranking");
    expect(pageKind("/de-de/best/2027/")).toBe("ranking");
    expect(pageKind("/together/")).toBe("together");
    expect(pageKind("/plans/")).toBe("plans");
    expect(pageKind("/about/")).toBe("about");
    expect(pageKind("/de-de/contact/")).toBe("contact");
    expect(pageKind("/privacy-policy/")).toBe("privacy");
    expect(pageKind("/offline")).toBe("other");
  });
});
