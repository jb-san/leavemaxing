import { describe, expect, it } from "vitest";
import { cleanUrl } from "./canonical";

describe("cleanUrl", () => {
  it("drops query strings and hashes from absolute and relative URLs", () => {
    expect(cleanUrl("https://leavemaxxing.com/de-de/brueckentage-2027/?d=10")).toBe(
      "https://leavemaxxing.com/de-de/brueckentage-2027/",
    );
    expect(cleanUrl("https://leavemaxxing.com/de/2027/?d=15&s=weekends#plan")).toBe(
      "https://leavemaxxing.com/de/2027/",
    );
    expect(cleanUrl("/de-de/brueckentage-2027/?d=10")).toBe(
      "https://leavemaxxing.com/de-de/brueckentage-2027/",
    );
    expect(cleanUrl("/compare/?c=DE&d=15")).toBe("https://leavemaxxing.com/compare/");
    expect(cleanUrl("/")).toBe("https://leavemaxxing.com/");
  });
});
