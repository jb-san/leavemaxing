import { describe, expect, it } from "vitest";
import {
  forgetGroup,
  type ListableStorage,
  listMemberships,
  loadCache,
  loadMembership,
  type Membership,
  saveCache,
  saveMembership,
} from "./store";

function memoryStorage(): ListableStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

const m = (id: string, name: string, updatedAt?: number): Membership => ({
  groupId: id,
  key: "k",
  memberId: "m",
  secret: "s",
  groupName: name,
  ...(updatedAt === undefined
    ? {}
    : { summary: { from: "2027-06-01", to: "2027-06-30", members: 2, agreed: 1, updatedAt } }),
});

describe("listMemberships", () => {
  it("lists valid memberships newest summary first, then those without one by name", () => {
    const s = memoryStorage();
    for (const x of [m("a", "Zed"), m("b", "Old", 1), m("c", "Alpha"), m("d", "New", 9)])
      saveMembership(x, s);
    expect(listMemberships(s).map((x) => x.groupId)).toEqual(["d", "b", "c", "a"]);
  });

  it("skips malformed entries and other keys", () => {
    const s = memoryStorage();
    saveMembership(m("a", "Ok", 1), s);
    s.setItem("lm:together:v1:bad", "{nope");
    s.setItem("lm:together:v1:wrong", JSON.stringify(m("other", "Mismatch")));
    s.setItem("lm:together:v1:partial", JSON.stringify({ groupId: "partial" }));
    s.setItem("lm:together:cache:v1:a", "[]");
    s.setItem("unrelated", "x");
    expect(listMemberships(s).map((x) => x.groupId)).toEqual(["a"]);
  });

  it("drops a malformed summary but keeps the membership", () => {
    const s = memoryStorage();
    s.setItem("lm:together:v1:a", JSON.stringify({ ...m("a", "A"), summary: { from: 1 } }));
    const [got] = listMemberships(s);
    expect(got?.groupId).toBe("a");
    expect(got?.summary).toBeUndefined();
  });

  it("returns an empty list when storage throws or is missing", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    expect(listMemberships({ getItem: boom, setItem: boom, removeItem: boom, key: boom, length: 1 })).toEqual(
      [],
    );
    expect(listMemberships(null)).toEqual([]);
  });
});

describe("forgetGroup", () => {
  it("removes the membership and the cache, and only for that group", () => {
    const s = memoryStorage();
    saveMembership(m("a", "A"), s);
    saveMembership(m("b", "B"), s);
    saveCache("a", [], s);
    saveCache("b", [], s);
    forgetGroup("a", s);
    expect(loadMembership("a", s)).toBeNull();
    expect(s.data.has("lm:together:cache:v1:a")).toBe(false);
    expect(loadMembership("b", s)?.groupName).toBe("B");
    expect(s.data.has("lm:together:cache:v1:b")).toBe(true);
    expect(loadCache("a", s)).toEqual([]);
  });

  it("tolerates storage that throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    expect(() => forgetGroup("a", { getItem: boom, setItem: boom, removeItem: boom })).not.toThrow();
  });
});
