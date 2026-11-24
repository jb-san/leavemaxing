import { describe, expect, it } from "vitest";
import { escapeAttribute, parseShareRequest, shareImagePath, shareManifestPath } from "./shareMeta";

const at = (path: string) => parseShareRequest(new URL(path, "https://leavemaxxing.com"));

describe("shared plan links", () => {
  it("recognises country and localized plan pages with leave days", () => {
    expect(at("/se/2027/?d=25")).toEqual({
      manifest: "/og/s/se/2027.json",
      days: 25,
      shareUrl: "https://leavemaxxing.com/se/2027/?d=25",
    });
    expect(at("/de-de/brueckentage-2027/?d=030")).toEqual({
      manifest: "/og/s/de-de/2027.json",
      days: 30,
      shareUrl: "https://leavemaxxing.com/de-de/brueckentage-2027/?d=30",
    });
  });

  it("drops tracking parameters from the published link", () => {
    expect(at("/se/2027/?utm_source=share&d=10&fbclid=x")?.shareUrl).toBe(
      "https://leavemaxxing.com/se/2027/?d=10",
    );
  });

  it("leaves other links alone", () => {
    expect(at("/se/2027/")).toBeNull();
    expect(at("/se/2027/?d=abc")).toBeNull();
    expect(at("/se/?d=10")).toBeNull();
    expect(at("/")).toBeNull();
    expect(at("/de-de/brueckentage-2027/bayern/?d=10")).toBeNull();
    expect(at("/og/s/se/2027.json?d=10")).toBeNull();
  });

  it("leaves links with other plan settings alone, since the card would show other numbers", () => {
    for (const extra of ["s=long", "r=BY", "lk=3", "min=4", "ww=1111100"]) {
      expect(at(`/de/2027/?d=20&${extra}`), extra).toBeNull();
    }
  });

  it("reads deep links that name the same plan", () => {
    expect(at("/se/2027/?days=25")?.shareUrl).toBe("https://leavemaxxing.com/se/2027/?d=25");
    expect(at("/se/2027/?country=SE&year=2027&days=25")?.days).toBe(25);
    expect(at("/se/2027/?days=25&d=30")?.days).toBe(30);
    expect(at("/de-de/brueckentage-2027/?year=2027&days=30")?.days).toBe(30);
  });

  it("leaves deep links for other settings, countries or years alone", () => {
    for (const extra of ["style=long", "region=BY", "months=7", "country=AT", "year=2028"]) {
      expect(at(`/de/2027/?days=20&${extra}`), extra).toBeNull();
    }
    expect(at("/de-de/brueckentage-2027/?country=DE&days=20")).toBeNull();
  });

  it("builds asset paths and escapes attribute values", () => {
    expect(shareManifestPath("uk-ua", 2028)).toBe("/og/s/uk-ua/2028.json");
    expect(shareImagePath("se", 2027, 5)).toBe("/og/s/se/2027/5.png");
    expect(escapeAttribute(`"a" & <b>`)).toBe("&quot;a&quot; &amp; &lt;b&gt;");
  });
});
