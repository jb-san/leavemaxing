import { describe, expect, it } from "vitest";
import { importKey, nextVersion, open, seal } from "./crypto";
import { randomId } from "./protocol";

const record = { name: "Ana", blocked: [1, 2, 3] };

describe("seal and open", () => {
  it("round-trips a record", async () => {
    const key = await importKey(randomId(16));
    const env = await seal(key, "member", "abc", 4, record);
    expect(env).toMatchObject({ kind: "member", id: "abc", version: 4 });
    expect(await open(key, env)).toEqual(record);
  });

  it("uses a fresh iv each time", async () => {
    const key = await importKey(randomId(16));
    const a = await seal(key, "group", "g", 1, record);
    const b = await seal(key, "group", "g", 1, record);
    expect(a.iv).not.toBe(b.iv);
  });

  it("rejects tampering with data, id, kind or version", async () => {
    const key = await importKey(randomId(16));
    const env = await seal(key, "member", "abc", 4, record);
    const flipped = env.data.startsWith("A") ? `B${env.data.slice(1)}` : `A${env.data.slice(1)}`;
    expect(await open(key, { ...env, data: flipped })).toBeNull();
    expect(await open(key, { ...env, id: "abd" })).toBeNull();
    expect(await open(key, { ...env, kind: "group" })).toBeNull();
    expect(await open(key, { ...env, version: 5 })).toBeNull();
  });

  it("returns null for the wrong key or garbage", async () => {
    const env = await seal(await importKey(randomId(16)), "group", "g", 1, record);
    expect(await open(await importKey(randomId(16)), env)).toBeNull();
    expect(await open(await importKey(randomId(16)), { ...env, iv: "!", data: "!" })).toBeNull();
  });
});

describe("nextVersion", () => {
  it("is the larger of previous + 1 and the clock", () => {
    expect(nextVersion(5, 3)).toBe(6);
    expect(nextVersion(5, 1000)).toBe(1000);
  });
});
