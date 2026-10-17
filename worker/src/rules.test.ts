import { describe, expect, it } from "vitest";
import { type Envelope, hashSecret, LIMITS, type PutMsg } from "../../src/lib/together/protocol";
import {
  applyPut,
  applyRemove,
  emptyRoom,
  expiresAt,
  parseClientMsg,
  type Room,
  rate,
  snapshot,
} from "./rules";

const DAY = 86_400_000;

function env(kind: "group" | "member", id: string, version = 1, data = "x"): Envelope {
  return { kind, id, version, iv: "aXY", data };
}

async function groupPut(secret: string, version = 1, until?: string): Promise<PutMsg> {
  return { t: "put", env: env("group", "g", version), secret, secretHash: await hashSecret(secret), until };
}

async function memberPut(id: string, secret: string, version = 1, withHash = true): Promise<PutMsg> {
  return {
    t: "put",
    env: env("member", id, version),
    secret,
    secretHash: withHash ? await hashSecret(secret) : undefined,
  };
}

async function roomWithGroup(): Promise<Room> {
  const room = emptyRoom();
  const out = await applyPut(room, await groupPut("admin"), 1000);
  expect(out.ok).toBe(true);
  return room;
}

describe("applyPut", () => {
  it("rejects an envelope over the size limit", async () => {
    const room = emptyRoom();
    const msg = await groupPut("admin");
    msg.env.data = "x".repeat(LIMITS.envelopeChars);
    expect(await applyPut(room, msg, 0)).toEqual({ ok: false, reply: { t: "error", code: "limit" } });
  });

  it("registers the admin on the first group put", async () => {
    const room = emptyRoom();
    const out = await applyPut(room, await groupPut("admin", 1, "2027-03-31"), 5);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.broadcast).toEqual({ t: "update", env: env("group", "g", 1) });
      expect(out.dirty).toEqual(expect.arrayContaining(["group", "admin", "until", "lastWrite"]));
    }
    expect(room.adminHash).toBe(await hashSecret("admin"));
    expect(room.until).toBe("2027-03-31");
    expect(room.lastWrite).toBe(5);
  });

  it("requires a matching secretHash to register the admin", async () => {
    const room = emptyRoom();
    const missing = { ...(await groupPut("admin")), secretHash: undefined };
    const wrong = { ...(await groupPut("admin")), secretHash: await hashSecret("other") };
    for (const msg of [missing, wrong]) {
      expect(await applyPut(room, msg, 0)).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
    }
    expect(room.adminHash).toBeNull();
  });

  it("requires the admin secret for later group puts", async () => {
    const room = await roomWithGroup();
    const bad = await applyPut(room, { ...(await groupPut("nope", 2)) }, 0);
    expect(bad).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
    const good = await applyPut(room, { t: "put", env: env("group", "g", 2), secret: "admin" }, 0);
    expect(good.ok).toBe(true);
  });

  it("stores until when present and keeps it otherwise", async () => {
    const room = await roomWithGroup();
    await applyPut(room, { t: "put", env: env("group", "g", 2), secret: "admin", until: "2027-05-31" }, 0);
    expect(room.until).toBe("2027-05-31");
    await applyPut(room, { t: "put", env: env("group", "g", 3), secret: "admin" }, 0);
    expect(room.until).toBe("2027-05-31");
  });

  it("returns gone for a member put with no group", async () => {
    const out = await applyPut(emptyRoom(), await memberPut("m1", "s1"), 0);
    expect(out).toEqual({ ok: false, reply: { t: "error", code: "gone" } });
  });

  it("registers a new member with a matching secretHash", async () => {
    const room = await roomWithGroup();
    const out = await applyPut(room, await memberPut("m1", "s1"), 7);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.dirty).toEqual(expect.arrayContaining(["member:m1", "hash:m1", "lastWrite"]));
    expect(room.hashes.get("m1")).toBe(await hashSecret("s1"));
  });

  it("rejects an unknown member without a matching secretHash", async () => {
    const room = await roomWithGroup();
    const missing = await memberPut("m1", "s1", 1, false);
    const wrong = { ...(await memberPut("m1", "s1")), secretHash: await hashSecret("other") };
    for (const msg of [missing, wrong]) {
      expect(await applyPut(room, msg, 0)).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
    }
    expect(room.hashes.size).toBe(0);
  });

  it("requires the stored secret for a known member", async () => {
    const room = await roomWithGroup();
    await applyPut(room, await memberPut("m1", "s1"), 0);
    const bad = await applyPut(room, { t: "put", env: env("member", "m1", 2), secret: "other" }, 0);
    expect(bad).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
    const good = await applyPut(room, { t: "put", env: env("member", "m1", 2), secret: "s1" }, 0);
    expect(good.ok).toBe(true);
  });

  it("returns limit when the group is full", async () => {
    const room = await roomWithGroup();
    for (let i = 0; i < LIMITS.members; i++) {
      expect((await applyPut(room, await memberPut(`m${i}`, `s${i}`), 0)).ok).toBe(true);
    }
    const out = await applyPut(room, await memberPut("extra", "sx"), 0);
    expect(out).toEqual({ ok: false, reply: { t: "error", code: "limit" } });
    expect((await applyPut(room, { t: "put", env: env("member", "m0", 2), secret: "s0" }, 0)).ok).toBe(true);
  });

  it("returns stale for a version at or below the stored one", async () => {
    const room = await roomWithGroup();
    await applyPut(room, await memberPut("m1", "s1", 5), 0);
    for (const v of [5, 4]) {
      const out = await applyPut(room, { t: "put", env: env("member", "m1", v), secret: "s1" }, 0);
      expect(out).toEqual({ ok: false, reply: { t: "error", code: "stale", id: "m1", version: 5 } });
    }
    const group = await applyPut(room, { t: "put", env: env("group", "g", 1), secret: "admin" }, 0);
    expect(group).toEqual({ ok: false, reply: { t: "error", code: "stale", id: "g", version: 1 } });
  });

  it("does not reveal versions to a caller without the secret", async () => {
    const room = await roomWithGroup();
    const out = await applyPut(room, { t: "put", env: env("group", "g", 1), secret: "nope" }, 0);
    expect(out).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
  });

  it("rejects a removed id and never re-registers it", async () => {
    const room = await roomWithGroup();
    await applyPut(room, await memberPut("m1", "s1"), 0);
    await applyRemove(room, { t: "remove", memberId: "m1", secret: "admin" }, 0);
    const out = await applyPut(room, await memberPut("m1", "s1", 9), 0);
    expect(out).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
    expect(room.hashes.has("m1")).toBe(false);
  });
});

describe("applyRemove", () => {
  it("needs the admin secret", async () => {
    const room = await roomWithGroup();
    await applyPut(room, await memberPut("m1", "s1"), 0);
    const out = await applyRemove(room, { t: "remove", memberId: "m1", secret: "s1" }, 0);
    expect(out).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
    expect(room.envs.has("member:m1")).toBe(true);
  });

  it("fails when no admin is registered", async () => {
    const out = await applyRemove(emptyRoom(), { t: "remove", memberId: "m1", secret: "admin" }, 0);
    expect(out).toEqual({ ok: false, reply: { t: "error", code: "auth" } });
  });

  it("deletes the envelope and hash, adds a tombstone and broadcasts", async () => {
    const room = await roomWithGroup();
    await applyPut(room, await memberPut("m1", "s1"), 0);
    const out = await applyRemove(room, { t: "remove", memberId: "m1", secret: "admin" }, 9);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.broadcast).toEqual({ t: "removed", memberId: "m1" });
      expect(out.dirty).toEqual(expect.arrayContaining(["member:m1", "hash:m1", "tomb:m1", "lastWrite"]));
    }
    expect(room.envs.has("member:m1")).toBe(false);
    expect(room.hashes.has("m1")).toBe(false);
    expect(room.removed.has("m1")).toBe(true);
  });
});

describe("snapshot", () => {
  it("lists envelopes and removed ids", async () => {
    const room = await roomWithGroup();
    await applyPut(room, await memberPut("m1", "s1"), 0);
    await applyPut(room, await memberPut("m2", "s2"), 0);
    await applyRemove(room, { t: "remove", memberId: "m2", secret: "admin" }, 0);
    const snap = snapshot(room);
    expect(snap.t).toBe("snapshot");
    if (snap.t === "snapshot") {
      expect(snap.envs.map((e) => e.id).sort()).toEqual(["g", "m1"]);
      expect(snap.removed).toEqual(["m2"]);
    }
  });
});

describe("expiresAt", () => {
  it("is null for an empty room", () => {
    expect(expiresAt(emptyRoom())).toBeNull();
  });

  it("uses lastWrite plus 180 days when until is null", async () => {
    const room = await roomWithGroup();
    room.lastWrite = 1_000_000;
    expect(expiresAt(room)).toBe(1_000_000 + 180 * DAY);
  });

  it("uses until plus 60 days when that comes first", async () => {
    const room = await roomWithGroup();
    room.lastWrite = Date.UTC(2027, 0, 1);
    room.until = "2027-03-31";
    expect(expiresAt(room)).toBe(Date.UTC(2027, 2, 31) + 60 * DAY);
  });

  it("uses lastWrite plus 180 days when that comes first", async () => {
    const room = await roomWithGroup();
    room.lastWrite = Date.UTC(2027, 0, 1);
    room.until = "2030-01-01";
    expect(expiresAt(room)).toBe(Date.UTC(2027, 0, 1) + 180 * DAY);
  });
});

describe("rate", () => {
  it("refuses the 31st message inside the window", () => {
    let state = null as ReturnType<typeof rate>["state"] | null;
    for (let i = 0; i < LIMITS.rateMessages; i++) {
      const r = rate(state, 1000 + i);
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(rate(state, 5000).ok).toBe(false);
  });

  it("resets after the window", () => {
    let state = null as ReturnType<typeof rate>["state"] | null;
    for (let i = 0; i < LIMITS.rateMessages + 1; i++) state = rate(state, 0).state;
    const r = rate(state, LIMITS.rateWindowMs);
    expect(r.ok).toBe(true);
    expect(r.state).toEqual({ start: LIMITS.rateWindowMs, count: 1 });
  });
});

describe("parseClientMsg", () => {
  it("parses valid put and remove messages", () => {
    const put = { t: "put", env: env("member", "m1"), secret: "s" };
    expect(parseClientMsg(JSON.stringify(put))).toEqual(put);
    const remove = { t: "remove", memberId: "m1", secret: "s" };
    expect(parseClientMsg(JSON.stringify(remove))).toEqual(remove);
  });

  it("returns null for bad input", () => {
    expect(parseClientMsg("{nope")).toBeNull();
    expect(parseClientMsg("null")).toBeNull();
    expect(parseClientMsg(JSON.stringify({ t: "hello" }))).toBeNull();
    expect(parseClientMsg(JSON.stringify({ t: "put", env: { kind: "x" }, secret: "s" }))).toBeNull();
    expect(parseClientMsg(JSON.stringify({ t: "put", env: env("group", "g") }))).toBeNull();
    expect(parseClientMsg(JSON.stringify({ t: "remove", memberId: 3, secret: "s" }))).toBeNull();
  });
});
