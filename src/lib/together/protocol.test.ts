import { describe, expect, it } from "vitest";
import { dayNum } from "../dates";
import {
  b64url,
  envKey,
  fromB64url,
  hashSecret,
  isEnvelope,
  isGroupRecord,
  MEMBER_COLORS,
  parseWindowKey,
  randomId,
  sanitizeMember,
} from "./protocol";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const member = {
  name: "Ana",
  color: "#e11d48",
  country: "PT",
  region: null,
  workWeek: [true, true, true, true, true, false, false],
  customOff: [20000],
  blocked: [20001],
  allowance: 25,
  proposals: ["2027-04-03..2027-04-11"],
  votes: { "2027-04-03..2027-04-11": "yes" },
};

describe("base64url", () => {
  it("round-trips bytes without padding", () => {
    const bytes = new Uint8Array([251, 255, 254, 0, 1]);
    const text = b64url(bytes);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(fromB64url(text)).toEqual(bytes);
  });

  it("throws on invalid input", () => {
    expect(() => fromB64url("a+b/")).toThrow();
    expect(() => fromB64url("a")).toThrow();
  });

  it("makes random ids of the expected length", () => {
    expect(randomId(10)).toHaveLength(14);
    expect(randomId(6)).toHaveLength(8);
    expect(randomId(16)).toHaveLength(22);
    expect(randomId(6)).not.toBe(randomId(6));
  });
});

describe("hashSecret", () => {
  it("is base64url SHA-256 of the utf8 text", async () => {
    expect(await hashSecret("a")).toBe("ypeBEsobvcr6wjGzmiPcTaeG7_gUfE5yuYB3ha_uSLs");
  });
});

describe("envKey", () => {
  it("names the group and members", () => {
    expect(envKey("group", "x")).toBe("group");
    expect(envKey("member", "abc")).toBe("member:abc");
  });
});

describe("MEMBER_COLORS", () => {
  it("has 8 distinct colours readable on both card backgrounds", () => {
    expect(MEMBER_COLORS).toHaveLength(8);
    expect(new Set(MEMBER_COLORS).size).toBe(8);
    for (const c of MEMBER_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(c, "#ffffff")).toBeGreaterThanOrEqual(3);
      expect(contrast(c, "#1e293b")).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("parseWindowKey", () => {
  it("parses to day numbers", () => {
    expect(parseWindowKey("2027-04-03..2027-04-11")).toEqual({
      start: dayNum(2027, 4, 3),
      end: dayNum(2027, 4, 11),
    });
  });

  it("rejects malformed and reversed keys", () => {
    expect(parseWindowKey("2027-04-11..2027-04-03")).toBeNull();
    expect(parseWindowKey("nope")).toBeNull();
    expect(parseWindowKey("2027-02-30..2027-03-02")).toBeNull();
  });

  it("accepts only trip lengths of 3 to 21 days", () => {
    expect(parseWindowKey("2027-04-01..2027-04-02")).toBeNull();
    expect(parseWindowKey("2027-04-01..2027-04-01")).toBeNull();
    expect(parseWindowKey("2027-04-01..2027-04-03")).not.toBeNull();
    expect(parseWindowKey("2027-04-01..2027-04-21")).not.toBeNull();
    expect(parseWindowKey("2027-04-01..2027-04-22")).toBeNull();
  });
});

describe("isEnvelope", () => {
  const env = { kind: "member", id: "abc", version: 3, iv: "x", data: "y" };
  it("accepts well-formed envelopes only", () => {
    expect(isEnvelope(env)).toBe(true);
    expect(isEnvelope({ ...env, kind: "other" })).toBe(false);
    expect(isEnvelope({ ...env, version: 1.5 })).toBe(false);
    expect(isEnvelope({ ...env, version: -1 })).toBe(false);
    expect(isEnvelope({ ...env, version: Number.MAX_SAFE_INTEGER + 1 })).toBe(false);
    expect(isEnvelope({ ...env, version: 0 })).toBe(true);
    expect(isEnvelope({ ...env, version: Number.MAX_SAFE_INTEGER })).toBe(true);
    expect(isEnvelope({ ...env, data: 1 })).toBe(false);
    expect(isEnvelope(null)).toBe(false);
  });
});

describe("isGroupRecord", () => {
  const group = {
    name: "Lisbon",
    months: [{ year: 2027, month: 4 }],
    minLength: 3,
    maxLength: 9,
    createdBy: "abc",
  };
  it("accepts well-formed groups only", () => {
    expect(isGroupRecord(group)).toBe(true);
    expect(isGroupRecord({ ...group, months: [{ year: 2027, month: 13 }] })).toBe(false);
    expect(isGroupRecord({ ...group, minLength: 2 })).toBe(false);
    expect(isGroupRecord({ ...group, maxLength: 22 })).toBe(false);
    expect(isGroupRecord({ ...group, minLength: 9, maxLength: 3 })).toBe(false);
    expect(isGroupRecord({ ...group, name: 5 })).toBe(false);
    expect(isGroupRecord({ ...group, name: "   " })).toBe(false);
    expect(isGroupRecord({ ...group, name: "x".repeat(61) })).toBe(false);
    expect(isGroupRecord({ ...group, name: "x".repeat(60) })).toBe(true);
    expect(isGroupRecord({ ...group, months: [] })).toBe(false);
    const many = (n: number) => Array.from({ length: n }, () => ({ year: 2027, month: 4 }));
    expect(isGroupRecord({ ...group, months: many(24) })).toBe(true);
    expect(isGroupRecord({ ...group, months: many(25) })).toBe(false);
    expect(isGroupRecord({ ...group, months: [{ year: 1999, month: 4 }] })).toBe(false);
    expect(isGroupRecord({ ...group, months: [{ year: 2101, month: 4 }] })).toBe(false);
    expect(isGroupRecord({ ...group, months: [{ year: 2027, month: 0 }] })).toBe(false);
  });
});

describe("sanitizeMember", () => {
  it("keeps a valid record", () => {
    expect(sanitizeMember(member)).toEqual(member);
  });

  it("drops bad votes, proposals and days", () => {
    const out = sanitizeMember({
      ...member,
      customOff: [20000, 1.5, "x"],
      blocked: [20001, Number.NaN],
      proposals: ["2027-04-03..2027-04-11", "2027-04-11..2027-04-03", 7],
      votes: {
        "2027-04-03..2027-04-11": "yes",
        "2027-04-11..2027-04-03": "yes",
        "2027-05-01..2027-05-05": "perhaps",
        junk: "no",
      },
    });
    expect(out?.customOff).toEqual([20000]);
    expect(out?.blocked).toEqual([20001]);
    expect(out?.proposals).toEqual(["2027-04-03..2027-04-11"]);
    expect(out?.votes).toEqual({ "2027-04-03..2027-04-11": "yes" });
  });

  it("drops proposals and votes outside the 3 to 21 day trip length", () => {
    const out = sanitizeMember({
      ...member,
      proposals: ["2027-04-03..2027-04-04", "2027-04-01..2027-04-22", "2027-04-01..2027-04-21"],
      votes: { "2027-04-03..2027-04-04": "yes", "2027-04-01..2027-04-03": "no" },
    });
    expect(out?.proposals).toEqual(["2027-04-01..2027-04-21"]);
    expect(out?.votes).toEqual({ "2027-04-01..2027-04-03": "no" });
  });

  it("returns null for invalid core fields", () => {
    expect(sanitizeMember({ ...member, country: "PRT" })).toBeNull();
    expect(sanitizeMember({ ...member, country: 4 })).toBeNull();
    expect(sanitizeMember({ ...member, workWeek: [true, false] })).toBeNull();
    expect(sanitizeMember({ ...member, workWeek: Array(7).fill(1) })).toBeNull();
    expect(sanitizeMember({ ...member, name: 3 })).toBeNull();
    expect(sanitizeMember(null)).toBeNull();
  });

  it("falls back to a palette colour for anything else", () => {
    const fallback = MEMBER_COLORS[0];
    expect(sanitizeMember({ ...member, color: "url(https://x)" })?.color).toBe(fallback);
    expect(sanitizeMember({ ...member, color: "red;" })?.color).toBe(fallback);
    expect(sanitizeMember({ ...member, color: 5 })?.color).toBe(fallback);
    expect(sanitizeMember({ ...member, color: "#0D9488" })?.color).toBe("#0d9488");
  });

  it("clamps allowance and cuts the name", () => {
    expect(sanitizeMember({ ...member, allowance: 500 })?.allowance).toBe(80);
    expect(sanitizeMember({ ...member, allowance: -4 })?.allowance).toBe(0);
    expect(sanitizeMember({ ...member, name: "x".repeat(60) })?.name).toHaveLength(40);
  });
});
