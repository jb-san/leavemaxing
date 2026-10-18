import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPut,
  applyRemove,
  emptyRoom,
  parseClientMsg,
  type Room,
  snapshot,
} from "../../../worker/src/rules";
import { type InviteLink, newGroup, type PersonalLink } from "./link";
import {
  type ClientMsg,
  type GroupRecord,
  MEMBER_COLORS,
  type MemberRecord,
  randomId,
  type ServerMsg,
} from "./protocol";
import { BACKOFF_MS, GroupSession, type SessionDeps, type SocketLike, socketUrl } from "./session";
import { loadCache, loadMembership, type StorageLike, saveMembership } from "./store";

const GROUP: GroupRecord = {
  name: "Lisbon 2027",
  months: [{ year: 2027, month: 6 }],
  minLength: 3,
  maxLength: 7,
  createdBy: "",
};

function member(name: string): MemberRecord {
  return {
    name,
    color: MEMBER_COLORS[0] as string,
    country: "PT",
    region: null,
    workWeek: [true, true, true, true, true, false, false],
    customOff: [],
    blocked: [],
    allowance: 5,
    proposals: [],
    votes: {},
  };
}

function memoryStorage(): StorageLike & { data: Map<string, string> } {
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
  };
}

function manualTimers() {
  const queue: { id: number; fn: () => void; ms: number }[] = [];
  let next = 0;
  return {
    queue,
    timers: {
      set: (fn: () => void, ms: number) => {
        next++;
        queue.push({ id: next, fn, ms });
        return next as unknown as ReturnType<typeof setTimeout>;
      },
      clear: (id: ReturnType<typeof setTimeout>) => {
        const i = queue.findIndex((t) => t.id === (id as unknown as number));
        if (i >= 0) queue.splice(i, 1);
      },
    },
    runNext(): number | undefined {
      const t = queue.shift();
      t?.fn();
      return t?.ms;
    },
  };
}

const later = (fn: () => void) => setTimeout(fn, 0);

class FakeSocket implements SocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: ClientMsg[] = [];

  constructor(private server: FakeServer) {
    later(() => server.accept(this));
  }

  send(data: string): void {
    if (this.readyState !== 1) throw new Error("not open");
    this.sent.push(JSON.parse(data) as ClientMsg);
    this.server.receive(this, data);
  }

  close(): void {
    this.server.drop(this);
  }
}

/** Plays the Durable Object using the real room rules. */
class FakeServer {
  room: Room = emptyRoom();
  up = true;
  sockets = new Set<FakeSocket>();
  all: FakeSocket[] = [];
  /** Answers instead of the room when it returns a message. */
  intercept: ((msg: ClientMsg) => ServerMsg | null) | null = null;
  private paused: [FakeSocket, string][] | null = null;
  private chain = Promise.resolve();

  connect(): FakeSocket {
    const s = new FakeSocket(this);
    this.all.push(s);
    return s;
  }

  accept(s: FakeSocket): void {
    if (s.readyState !== 0) return;
    if (!this.up) {
      s.readyState = 3;
      s.onclose?.();
      return;
    }
    s.readyState = 1;
    this.sockets.add(s);
    s.onopen?.();
    this.deliver(s, snapshot(this.room));
  }

  deliver(s: FakeSocket, msg: ServerMsg): void {
    later(() => {
      if (s.readyState === 1) s.onmessage?.({ data: JSON.stringify(msg) });
    });
  }

  drop(s: FakeSocket): void {
    if (s.readyState === 3) return;
    s.readyState = 3;
    this.sockets.delete(s);
    later(() => s.onclose?.());
  }

  pause(): void {
    this.paused = [];
  }

  resume(): void {
    const held = this.paused ?? [];
    this.paused = null;
    for (const [s, data] of held) this.receive(s, data);
  }

  receive(s: FakeSocket, data: string): void {
    if (this.paused) {
      this.paused.push([s, data]);
      return;
    }
    this.chain = this.chain.then(async () => {
      const msg = parseClientMsg(data);
      if (!msg) return this.deliver(s, { t: "error", code: "bad" });
      const forced = this.intercept?.(msg);
      if (forced) return this.deliver(s, forced);
      const out =
        msg.t === "put" ? await applyPut(this.room, msg, Date.now()) : await applyRemove(this.room, msg, 0);
      if (!out.ok) return this.deliver(s, out.reply);
      for (const socket of this.sockets) this.deliver(socket, out.broadcast);
    });
  }

  session(link: InviteLink | PersonalLink | null, deps: SessionDeps = {}): GroupSession {
    const s = new GroupSession(link, { socket: () => this.connect(), storage: memoryStorage(), ...deps });
    open.push(s);
    return s;
  }
}

const open: GroupSession[] = [];
afterEach(() => {
  for (const s of open.splice(0)) s.close();
  vi.restoreAllMocks();
});

const until = (fn: () => void) => vi.waitFor(fn, { timeout: 3000, interval: 5 });

async function createAndJoin(server: FakeServer) {
  const link = newGroup();
  const a = server.session(link);
  await a.create(GROUP, member("Sam"));
  await until(() => expect(server.room.envs.size).toBe(2));
  const b = server.session({ groupId: link.groupId, key: link.key });
  await until(() => expect(b.state.group).not.toBeNull());
  await b.join(member("Alex"));
  await until(() => {
    expect(a.state.members.size).toBe(2);
    expect(b.state.members.size).toBe(2);
  });
  return { link, a, b };
}

const puts = (s: FakeSocket[]) => s.flatMap((x) => x.sent).filter((m) => m.t === "put");

describe("GroupSession", () => {
  it("creates a group and lets a second person join", async () => {
    const server = new FakeServer();
    const { a, b } = await createAndJoin(server);
    for (const s of [a, b]) {
      expect(s.state.group).toEqual({ ...GROUP, createdBy: a.state.me });
      expect([...s.state.members.values()].map((m) => m.name).sort()).toEqual(["Alex", "Sam"]);
      expect(s.state.status).toBe("online");
      expect(s.state.loaded).toBe(true);
      expect(s.state.error).toBeNull();
    }
    expect(a.state.isAdmin).toBe(true);
    expect(b.state.isAdmin).toBe(false);
    expect(server.room.until).toBe("2027-06-30");
    const first = server.all[0]?.sent ?? [];
    expect(first.map((m) => (m.t === "put" ? m.env.kind : m.t))).toEqual(["group", "member"]);
  });

  it("shows one person's edit to the other", async () => {
    const server = new FakeServer();
    const { a, b } = await createAndJoin(server);
    await b.updateMe({ allowance: 9 });
    expect(b.state.members.get(b.state.me as string)?.allowance).toBe(9);
    await until(() => expect(a.state.members.get(b.state.me as string)?.allowance).toBe(9));
  });

  it("lets the admin rename the group and sends a fresh until", async () => {
    const server = new FakeServer();
    const { a, b } = await createAndJoin(server);
    await a.updateGroup({ name: "Porto", months: [{ year: 2027, month: 8 }] });
    await until(() => expect(b.state.group?.name).toBe("Porto"));
    expect(server.room.until).toBe("2027-08-31");
    await expect(b.updateGroup({ name: "Mine" })).rejects.toThrow();
  });

  it("queues an edit while closed and delivers it on reopen", async () => {
    const server = new FakeServer();
    const { link, a, b } = await createAndJoin(server);
    const t = manualTimers();
    const personal = b.personalLink() as PersonalLink;
    const c = server.session(personal, { timers: t.timers });
    await until(() => expect(c.state.members.has(personal.memberId)).toBe(true));

    const first = server.all.at(-1) as FakeSocket;
    server.up = false;
    server.drop(first);
    await until(() => expect(c.state.status).toBe("connecting"));
    await c.updateMe({ name: "Offline edit" });
    expect(c.state.members.get(personal.memberId)?.name).toBe("Offline edit");

    expect(t.runNext()).toBe(BACKOFF_MS[0]);
    await until(() => expect(c.state.status).toBe("offline"));
    expect(server.all.at(-1)).not.toBe(first);
    expect(puts(server.all.slice(-2))).toEqual([]);
    server.up = true;
    expect(t.runNext()).toBe(BACKOFF_MS[1]);
    await until(() => expect(a.state.members.get(personal.memberId)?.name).toBe("Offline edit"));
    expect(c.state.status).toBe("online");
    expect(link.groupId).toBe(c.personalLink()?.groupId);

    // Once acknowledged, an edit isn't sent again on the next reconnect.
    const third = server.all.at(-1) as FakeSocket;
    await until(() => expect(puts([third]).length).toBe(1));
    await new Promise((r) => setTimeout(r, 20));
    server.drop(third);
    await until(() => expect(c.state.status).toBe("connecting"));
    t.runNext();
    await until(() => expect(c.state.status).toBe("online"));
    await new Promise((r) => setTimeout(r, 20));
    expect(puts([server.all.at(-1) as FakeSocket])).toEqual([]);
  });

  it("gives up on an edit after 3 stale replies", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const server = new FakeServer();
    const { b } = await createAndJoin(server);
    const sock = server.all.at(-1) as FakeSocket;
    const before = puts([sock]).length;
    server.intercept = (m) =>
      m.t === "put" ? { t: "error", code: "stale", id: m.env.id, version: m.env.version } : null;
    await b.updateMe({ name: "Never" });
    await until(() => expect(warn).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(puts([sock]).length - before).toBe(3);
  });

  it("backs off with the listed delays and repeats the last one", async () => {
    const server = new FakeServer();
    server.up = false;
    const t = manualTimers();
    const s = server.session({ groupId: randomId(10), key: randomId(16) }, { timers: t.timers });
    expect(s.state.status).toBe("connecting");
    const delays: number[] = [];
    for (let i = 0; i < 7; i++) {
      await until(() => expect(t.queue.length).toBe(1));
      expect(s.state.status).toBe("offline");
      delays.push(t.runNext() as number);
    }
    expect(delays).toEqual([1000, 2000, 5000, 10000, 30000, 30000, 30000]);
  });

  it("resolves the same person in two tabs without a loop, later edit wins", async () => {
    const server = new FakeServer();
    const { a, b } = await createAndJoin(server);
    const personal = b.personalLink() as PersonalLink;
    const now = () => 5_000_000_000_000;
    const before = server.all.length;
    const one = server.session(personal, { now });
    const two = server.session(personal, { now });
    await until(() => {
      expect(one.state.members.has(personal.memberId)).toBe(true);
      expect(two.state.members.has(personal.memberId)).toBe(true);
    });
    const sockets = server.all.slice(before);

    server.pause();
    await one.updateMe({ name: "One" });
    await two.updateMe({ name: "Two" });
    server.resume();

    await until(() => {
      for (const s of [a, b, one, two]) expect(s.state.members.get(personal.memberId)?.name).toBe("Two");
    });
    await new Promise((r) => setTimeout(r, 30));
    for (const sock of sockets) expect(puts([sock]).length).toBeLessThanOrEqual(2);
    expect(puts(sockets).length).toBe(3);
    for (const s of [a, b, one, two]) expect(s.state.members.get(personal.memberId)?.name).toBe("Two");
  });

  it("marks a removed member and forgets their membership", async () => {
    const server = new FakeServer();
    const storage = memoryStorage();
    const link = newGroup();
    const a = server.session(link);
    await a.create(GROUP, member("Sam"));
    await until(() => expect(server.room.envs.size).toBe(2));
    const b = server.session({ groupId: link.groupId, key: link.key }, { storage });
    await until(() => expect(b.state.group).not.toBeNull());
    await b.join(member("Alex"));
    await until(() => expect(a.state.members.size).toBe(2));
    expect(loadMembership(link.groupId, storage)).not.toBeNull();

    a.removeMember(b.state.me as string);
    expect(a.state.members.size).toBe(1);
    expect(loadCache(link.groupId, storage).length).toBeGreaterThan(0);
    await until(() => expect(b.state.error).toBe("removed"));
    expect(loadMembership(link.groupId, storage)).toBeNull();
    expect(a.state.members.size).toBe(1);
    expect(b.state.group).toBeNull();
    expect(b.state.members.size).toBe(0);
    expect(loadCache(link.groupId, storage)).toEqual([]);
  });

  it("forgets the membership and cache when the group is gone", async () => {
    const server = new FakeServer();
    const { b } = await createAndJoin(server);
    const personal = b.personalLink() as PersonalLink;
    const storage = memoryStorage();
    const c = server.session(personal, { storage });
    await until(() => expect(c.state.group).not.toBeNull());
    expect(loadMembership(personal.groupId, storage)).not.toBeNull();
    server.room.envs.clear();
    const d = server.session(personal, { storage });
    await until(() => expect(d.state.error).toBe("gone"));
    expect(loadMembership(personal.groupId, storage)).toBeNull();
    expect(loadCache(personal.groupId, storage)).toEqual([]);
  });

  describe("summary", () => {
    it("is written once the group loads, from the group and the members", async () => {
      const server = new FakeServer();
      const { b } = await createAndJoin(server);
      const personal = b.personalLink() as PersonalLink;
      const storage = memoryStorage();
      const c = server.session(personal, { storage, now: () => 1234 });
      await until(() => expect(loadMembership(personal.groupId, storage)?.summary).toBeDefined());
      expect(loadMembership(personal.groupId, storage)?.summary).toEqual({
        from: "2027-06-01",
        to: "2027-06-30",
        members: 2,
        agreed: 0,
        updatedAt: 1234,
      });
      c.close();
    });

    it("takes the agreed count from noteSummary and writes only on a change", async () => {
      const server = new FakeServer();
      const { b } = await createAndJoin(server);
      const personal = b.personalLink() as PersonalLink;
      const storage = memoryStorage();
      let clock = 100;
      const c = server.session(personal, { storage, now: () => clock });
      await until(() => expect(loadMembership(personal.groupId, storage)?.summary).toBeDefined());
      const writes = vi.spyOn(storage, "setItem");
      clock = 200;
      c.noteSummary({ agreed: 0 });
      expect(writes).not.toHaveBeenCalled();
      c.noteSummary({ agreed: 3 });
      expect(writes).toHaveBeenCalledTimes(1);
      expect(loadMembership(personal.groupId, storage)?.summary).toMatchObject({ agreed: 3, updatedAt: 200 });
      clock = 300;
      c.noteSummary({ agreed: 3 });
      expect(writes).toHaveBeenCalledTimes(1);
      expect(loadMembership(personal.groupId, storage)?.summary?.updatedAt).toBe(200);
    });

    it("is never written for a browser that hasn't joined", async () => {
      const server = new FakeServer();
      const { b } = await createAndJoin(server);
      const personal = b.personalLink() as PersonalLink;
      const storage = memoryStorage();
      const c = server.session({ groupId: personal.groupId, key: personal.key }, { storage });
      await until(() => expect(c.state.group).not.toBeNull());
      c.noteSummary({ agreed: 2 });
      expect(storage.data.size).toBeLessThanOrEqual(1);
      expect(loadMembership(personal.groupId, storage)).toBeNull();
    });
  });

  it("reports removed when the snapshot lists me", async () => {
    const server = new FakeServer();
    const { b } = await createAndJoin(server);
    const personal = b.personalLink() as PersonalLink;
    server.room.removed.add(personal.memberId);
    const c = server.session(personal);
    await until(() => expect(c.state.error).toBe("removed"));
  });

  it("gives full on the 21st join", async () => {
    const server = new FakeServer();
    const link = newGroup();
    const a = server.session(link);
    await a.create(GROUP, member("Sam"));
    await until(() => expect(server.room.envs.size).toBe(2));
    for (let i = 0; i < 19; i++) server.room.hashes.set(randomId(6), "x");
    const storage = memoryStorage();
    const late = server.session({ groupId: link.groupId, key: link.key }, { storage });
    await until(() => expect(late.state.group).not.toBeNull());
    await late.join(member("Twenty-one"));
    await until(() => expect(late.state.error).toBe("full"));
    expect(late.state.me).toBeNull();
    expect(loadMembership(link.groupId, storage)).toBeNull();
  });

  it("gives gone for an empty room on an invite", async () => {
    const server = new FakeServer();
    const s = server.session({ groupId: randomId(10), key: randomId(16) });
    await until(() => expect(s.state.error).toBe("gone"));
  });

  it("does not give gone to a new group before create runs", async () => {
    const server = new FakeServer();
    const s = server.session(newGroup());
    await until(() => expect(s.state.loaded).toBe(true));
    expect(s.state.error).toBeNull();
  });

  it("skips a corrupted envelope and loads the other members", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const server = new FakeServer();
    const { link } = await createAndJoin(server);
    server.room.envs.set("member:AAAAAAAA", {
      kind: "member",
      id: "AAAAAAAA",
      version: 1,
      iv: "aaaa",
      data: "bad",
    });
    const c = server.session({ groupId: link.groupId, key: link.key });
    await until(() => expect(c.state.members.size).toBe(2));
    expect(c.state.members.has("AAAAAAAA")).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("shows the cache while offline", async () => {
    const server = new FakeServer();
    const storage = memoryStorage();
    const link = newGroup();
    const a = server.session(link, { storage });
    await a.create(GROUP, member("Sam"));
    await until(() => expect(storage.data.get(`lm:together:cache:v1:${link.groupId}`)).toContain("member"));
    const personal = a.personalLink() as PersonalLink;
    a.close();

    server.up = false;
    const offline = server.session(personal, { storage, timers: manualTimers().timers });
    await until(() => expect(offline.state.status).toBe("offline"));
    expect(offline.state.loaded).toBe(true);
    expect(offline.state.group?.name).toBe("Lisbon 2027");
    expect(offline.state.members.get(personal.memberId)?.name).toBe("Sam");
    expect(offline.state.isAdmin).toBe(true);
  });

  it("saves a personal link as the membership, over a stored one", async () => {
    const server = new FakeServer();
    const { b } = await createAndJoin(server);
    const personal = b.personalLink() as PersonalLink;
    const storage = memoryStorage();
    saveMembership({ ...personal, memberId: "ZZZZZZZZ", secret: randomId(16), groupName: "Old" }, storage);
    const c = server.session(personal, { storage });
    expect(c.state.me).toBe(personal.memberId);
    expect(loadMembership(personal.groupId, storage)?.memberId).toBe(personal.memberId);
    await until(() => expect(loadMembership(personal.groupId, storage)?.groupName).toBe("Lisbon 2027"));
  });

  it("uses the stored membership for a plain invite", async () => {
    const server = new FakeServer();
    const storage = memoryStorage();
    const { link, b } = await createAndJoin(server);
    saveMembership({ ...(b.personalLink() as PersonalLink), groupName: "Lisbon 2027" }, storage);
    const c = server.session({ groupId: link.groupId, key: link.key }, { storage });
    expect(c.state.me).toBe(b.state.me);
  });

  it("joins with a stored identity whose record never arrived", async () => {
    const server = new FakeServer();
    const storage = memoryStorage();
    const { link, a } = await createAndJoin(server);
    const ghost = { groupId: link.groupId, key: link.key, memberId: "GHOSTxx1", secret: randomId(16) };
    saveMembership({ ...ghost, groupName: "Lisbon 2027" }, storage);
    const c = server.session({ groupId: link.groupId, key: link.key }, { storage });
    await until(() => expect(c.state.loaded).toBe(true));
    expect(c.state.me).toBe("GHOSTxx1");
    await c.join(member("Late"));
    expect(c.state.me).toBe("GHOSTxx1");
    await until(() => expect(a.state.members.get("GHOSTxx1")?.name).toBe("Late"));
  });

  it("gives incomplete for a missing link or a bad key", async () => {
    const server = new FakeServer();
    expect(server.session(null).state.error).toBe("incomplete");
    const s = server.session({ groupId: randomId(10), key: "!!" });
    await until(() => expect(s.state.error).toBe("incomplete"));
    expect(server.all.length).toBe(0);
  });

  it("never shows an older edit after a newer one, and keeps every edit", async () => {
    const server = new FakeServer();
    const { a, b } = await createAndJoin(server);
    const personal = b.personalLink() as PersonalLink;
    // put() reads the clock just before sealing, so the hook types while a seal is in progress.
    let hook: (() => void) | null = null;
    const now = () => {
      const h = hook;
      hook = null;
      h?.();
      return Date.now();
    };
    const c = server.session(personal, { now });
    await until(() => expect(c.state.members.has(personal.memberId)).toBe(true));
    const names: string[] = [];
    c.subscribe((st) => names.push(st.members.get(personal.memberId)?.name ?? ""));

    await Promise.all(["xA", "xAB", "xABC"].map((name) => c.updateMe({ name })));
    let during: Promise<void> = Promise.resolve();
    hook = () => {
      during = c.updateMe({ name: "xABCDE" });
    };
    await c.updateMe({ name: "xABCD" });
    await during;
    await c.updateMe({ allowance: 11 });

    const progress = names.filter((n) => n.startsWith("x")).map((n) => n.length);
    expect(progress).toEqual([...progress].sort((x, y) => x - y));
    for (const s of [a, b, c]) {
      await until(() =>
        expect(s.state.members.get(personal.memberId)).toMatchObject({ name: "xABCDE", allowance: 11 }),
      );
    }
  });

  it("keeps two quick edits to different fields", async () => {
    const server = new FakeServer();
    const { a, b } = await createAndJoin(server);
    const me = b.state.me as string;
    await Promise.all([b.updateMe({ name: "Both" }), b.updateMe({ allowance: 7 })]);
    for (const s of [a, b]) {
      await until(() => expect(s.state.members.get(me)).toMatchObject({ name: "Both", allowance: 7 }));
    }
  });

  it("gives incomplete when the server refuses my secret, and doesn't resend", async () => {
    const server = new FakeServer();
    const { b } = await createAndJoin(server);
    const wrong = { ...(b.personalLink() as PersonalLink), secret: randomId(16) };
    const before = server.all.length;
    const c = server.session(wrong);
    await until(() => expect(c.state.members.has(wrong.memberId)).toBe(true));
    await c.updateMe({ name: "Intruder" });
    await until(() => expect(c.state.error).toBe("incomplete"));
    await new Promise((r) => setTimeout(r, 20));
    expect(puts(server.all.slice(before)).length).toBe(1);
  });

  for (const code of ["limit", "bad"] as const) {
    it(`drops an edit the server refuses with ${code} instead of resending it`, async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const server = new FakeServer();
      const { b } = await createAndJoin(server);
      const t = manualTimers();
      const personal = b.personalLink() as PersonalLink;
      const c = server.session(personal, { timers: t.timers });
      await until(() => expect(c.state.members.has(personal.memberId)).toBe(true));
      const first = server.all.at(-1) as FakeSocket;
      server.intercept = (m) => (m.t === "put" ? { t: "error", code } : null);
      await c.updateMe({ name: "Refused" });
      await until(() => expect(puts([first]).length).toBe(1));
      await new Promise((r) => setTimeout(r, 20));
      server.intercept = null;
      server.drop(first);
      await until(() => expect(c.state.status).toBe("connecting"));
      t.runNext();
      await until(() => expect(c.state.status).toBe("online"));
      await new Promise((r) => setTimeout(r, 20));
      expect(puts([server.all.at(-1) as FakeSocket])).toEqual([]);
      expect(c.state.error).toBeNull();
    });
  }

  it("keeps the stored admin secret for a personal link without one", async () => {
    const server = new FakeServer();
    const storage = memoryStorage();
    const link = newGroup();
    const a = server.session(link, { storage });
    await a.create(GROUP, member("Sam"));
    const full = a.personalLink() as PersonalLink;
    const { admin: _admin, ...plain } = full;
    const c = server.session(plain, { storage });
    expect(c.state.isAdmin).toBe(true);
    expect(c.personalLink()?.admin).toBe(full.admin);
    expect(loadMembership(link.groupId, storage)?.admin).toBe(full.admin);
  });

  it("schedules one rate timer, cancels it on close and never hides another error", async () => {
    const server = new FakeServer();
    const t = manualTimers();
    const link = newGroup();
    const a = server.session(link, { timers: t.timers });
    await a.create(GROUP, member("Sam"));
    await until(() => expect(server.room.envs.size).toBe(2));
    const sock = [...server.sockets][0] as FakeSocket;
    server.deliver(sock, { t: "error", code: "rate" });
    server.deliver(sock, { t: "error", code: "rate" });
    await until(() => expect(a.state.error).toBe("rate"));
    await new Promise((r) => setTimeout(r, 20));
    expect(t.queue.length).toBe(1);
    const seen: unknown[] = [];
    a.subscribe((st) => seen.push(st));
    a.close();
    expect(t.queue.length).toBe(0);
    expect(seen).toEqual([]);

    for (let i = 0; i < 19; i++) server.room.hashes.set(randomId(6), "x");
    const t2 = manualTimers();
    const late = server.session({ groupId: link.groupId, key: link.key }, { timers: t2.timers });
    await until(() => expect(late.state.group).not.toBeNull());
    await late.join(member("Late"));
    await until(() => expect(late.state.error).toBe("full"));
    server.deliver(server.all.at(-1) as FakeSocket, { t: "error", code: "rate" });
    await new Promise((r) => setTimeout(r, 20));
    expect(late.state.error).toBe("full");
    t2.runNext();
    expect(late.state.error).toBe("full");
  });

  it("reports rate and clears it after the window", async () => {
    const server = new FakeServer();
    const t = manualTimers();
    const link = newGroup();
    const a = server.session(link, { timers: t.timers });
    await a.create(GROUP, member("Sam"));
    await until(() => expect(server.room.envs.size).toBe(2));
    const sock = [...server.sockets][0] as FakeSocket;
    server.deliver(sock, { t: "error", code: "rate" });
    await until(() => expect(a.state.error).toBe("rate"));
    t.runNext();
    expect(a.state.error).toBeNull();
  });

  it("notifies subscribers until they unsubscribe", async () => {
    const server = new FakeServer();
    const s = server.session(newGroup());
    const seen: unknown[] = [];
    const off = s.subscribe((st) => seen.push(st));
    await s.create(GROUP, member("Sam"));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe(s.state);
    off();
    const n = seen.length;
    await s.updateMe({ name: "Sammy" });
    expect(seen.length).toBe(n);
  });
});

describe("socketUrl", () => {
  it("uses the local worker on localhost", () => {
    const loc = { protocol: "http:", host: "localhost:4321", hostname: "localhost" };
    expect(socketUrl("abc", loc)).toBe("ws://localhost:8787/api/together/abc");
    expect(socketUrl("abc", { ...loc, host: "127.0.0.1:4321", hostname: "127.0.0.1" })).toBe(
      "ws://localhost:8787/api/together/abc",
    );
  });

  it("uses wss on the site", () => {
    const loc = { protocol: "https:", host: "leavemaxxing.com", hostname: "leavemaxxing.com" };
    expect(socketUrl("abc", loc)).toBe("wss://leavemaxxing.com/api/together/abc");
  });
});
