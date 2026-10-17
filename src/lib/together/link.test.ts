import { describe, expect, it } from "vitest";
import { formatInvite, formatPersonal, newGroup, newMember, parseFragment } from "./link";

const g = "A".repeat(14);
const k = "B".repeat(22);
const m = "C".repeat(8);
const s = "D".repeat(22);
const a = "E".repeat(22);

describe("links", () => {
  it("round-trips an invite", () => {
    const url = formatInvite("https://leavemaxxing.com", { groupId: g, key: k });
    expect(url).toBe(`https://leavemaxxing.com/together/#${g}.${k}`);
    expect(parseFragment(new URL(url).hash)).toEqual({ groupId: g, key: k });
  });

  it("round-trips a personal link with and without admin", () => {
    const plain = { groupId: g, key: k, memberId: m, secret: s };
    const url = formatPersonal("https://x.test", plain);
    expect(url).toBe(`https://x.test/together/#${g}.${k}.${m}.${s}`);
    expect(parseFragment(new URL(url).hash)).toEqual(plain);

    const admin = { ...plain, admin: a };
    expect(parseFragment(new URL(formatPersonal("https://x.test", admin)).hash)).toEqual(admin);
  });

  it("survives chat app mangling", () => {
    const invite = { groupId: g, key: k };
    expect(parseFragment(`#${g}.${k}.`)).toEqual(invite);
    expect(parseFragment(`#${g}.${k})`)).toEqual(invite);
    expect(parseFragment(`#${g}.${k}  \n`)).toEqual(invite);
    expect(parseFragment(`#${g}.${k}%29`)).toEqual(invite);
    expect(parseFragment(`#${g}%2E${k}`)).toEqual(invite);
    expect(parseFragment(`${g}.${k}`)).toEqual(invite);
  });

  it("rejects wrong sizes and part counts", () => {
    expect(parseFragment(`#${g.slice(1)}.${k}`)).toBeNull();
    expect(parseFragment(`#${g}.${k}x`)).toBeNull();
    expect(parseFragment(`#${g}.${k}.${m.slice(1)}.${s}`)).toBeNull();
    expect(parseFragment(`#${g}.${k}.${m}.${s}x`)).toBeNull();
    expect(parseFragment(`#${g}.${k}.${m}.${s}.${a}x`)).toBeNull();
    expect(parseFragment(`#${g}.${k}.${m}`)).toBeNull();
    expect(parseFragment(`#${g}.${k}.${m}.${s}.${a}.${a}`)).toBeNull();
    expect(parseFragment("")).toBeNull();
    expect(parseFragment("#%E0%A4%A")).toBeNull();
  });

  it("generates ids that parse", () => {
    const group = newGroup();
    const me = newMember();
    const url = formatPersonal("https://x.test", { ...group, ...me });
    expect(parseFragment(new URL(url).hash)).toEqual({ ...group, ...me });
  });
});
