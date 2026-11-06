import { describe, expect, it } from "vitest";
import { planLink } from "./planLink";

describe("planLink", () => {
  it("keeps the href free of search params and returns the query separately", () => {
    expect(planLink("/de-de/brueckentage-2027/", "d=10")).toEqual({
      href: "/de-de/brueckentage-2027/",
      query: "d=10",
    });
    expect(planLink("/de/2027/?d=15", "?d=15&s=weekends")).toEqual({
      href: "/de/2027/",
      query: "d=15&s=weekends",
    });
    expect(planLink("/de/2027/", "")).toEqual({ href: "/de/2027/" });
  });
});
