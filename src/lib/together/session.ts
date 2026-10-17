import { toIso } from "~/lib/dates";
import { importKey, nextVersion, open, seal } from "./crypto";
import { type InviteLink, newMember, type PersonalLink } from "./link";
import {
  type Envelope,
  envKey,
  type GroupRecord,
  hashSecret,
  isEnvelope,
  isGroupRecord,
  LIMITS,
  type MemberRecord,
  type PutMsg,
  type RemoveMsg,
  type ServerMsg,
  sanitizeMember,
} from "./protocol";
import { groupRange } from "./score";
import {
  forgetMembership,
  loadCache,
  loadMembership,
  type StorageLike,
  saveCache,
  saveMembership,
} from "./store";

export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: (() => void) | null;
}

export type Status = "connecting" | "online" | "offline";
export type SessionError = "incomplete" | "gone" | "removed" | "full" | "rate" | null;

export interface GroupState {
  status: Status;
  group: GroupRecord | null;
  members: Map<string, MemberRecord>;
  me: string | null;
  isAdmin: boolean;
  error: SessionError;
  loaded: boolean;
}

type TimerId = ReturnType<typeof setTimeout>;

export interface SessionDeps {
  socket?: (url: string) => SocketLike;
  now?: () => number;
  /** Accepts `{ set: setTimeout, clear: clearTimeout }`; both are called unbound. */
  timers?: { set: (fn: () => void, ms: number) => TimerId; clear: (id: TimerId) => void };
  /** Defaults to localStorage. */
  storage?: StorageLike | null;
}

export const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];

const OPEN = 1;
const MAX_TRIES = 3;
const MEMBER = "member:";

type Rec = GroupRecord | MemberRecord;
/** What this tab shows for one record. `iv` is "" until the record is sealed. */
interface Held {
  version: number;
  iv: string;
  record: Rec;
}
/** Sent but not yet acknowledged; resent on every (re)open. */
type Pending = { t: "put"; msg: PutMsg; record: Rec; tries: number } | { t: "remove"; msg: RemoveMsg };

export function socketUrl(
  groupId: string,
  loc: Pick<Location, "protocol" | "host" | "hostname"> | undefined = typeof location === "undefined"
    ? undefined
    : location,
): string {
  if (!loc || loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
    return `ws://localhost:8787/api/together/${groupId}`;
  }
  return `wss://${loc.host}/api/together/${groupId}`;
}

const sameEnv = (a: Envelope, b: Envelope | undefined) => b?.version === a.version && b.iv === a.iv;
const reject = (message: string) => Promise.reject(new Error(`Together: ${message}`));

export class GroupSession {
  private current: GroupState;
  private readonly groupId: string;
  private readonly keyText: string;
  private readonly socket: (url: string) => SocketLike;
  private readonly now: () => number;
  private readonly timers: NonNullable<SessionDeps["timers"]>;
  private readonly storage: StorageLike | null | undefined;
  private key: CryptoKey | null = null;
  private memberId: string | null = null;
  private secret: string | null = null;
  private admin: string | null = null;
  private groupName = "";
  /** A newGroup() link whose group isn't on the server yet: an empty room is expected. */
  private creating = false;
  private status: Status = "connecting";
  private error: SessionError = null;
  private loaded = false;
  private local = new Map<string, Held>();
  private confirmed = new Map<string, Envelope>();
  private pending = new Map<string, Pending>();
  private hashes = new Map<string, Promise<string>>();
  private listeners = new Set<(s: GroupState) => void>();
  private work: Promise<void> = Promise.resolve();
  private ws: SocketLike | null = null;
  private attempt = 0;
  private timer: TimerId | null = null;
  private closed = false;

  constructor(link: InviteLink | PersonalLink | null, deps: SessionDeps = {}) {
    this.socket = deps.socket ?? ((url) => new WebSocket(url) as unknown as SocketLike);
    this.now = deps.now ?? Date.now;
    this.timers = deps.timers ?? { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };
    this.storage = deps.storage;
    this.groupId = link?.groupId ?? "";
    this.keyText = link?.key ?? "";

    if (link) {
      const stored = loadMembership(link.groupId, this.storage);
      const linkAdmin = (link as { admin?: unknown }).admin;
      if ("memberId" in link) {
        this.adopt(link.memberId, link.secret, link.admin ?? null);
        this.groupName = stored?.groupName ?? "";
        this.remember();
      } else if (stored) {
        this.adopt(stored.memberId, stored.secret, stored.admin ?? null);
        this.groupName = stored.groupName;
      } else if (typeof linkAdmin === "string") {
        this.admin = linkAdmin;
        this.creating = true;
      }
    }
    this.current = this.build();
    if (!link) this.fail("incomplete");
    else void this.run(() => this.start());
  }

  get state(): GroupState {
    return this.current;
  }

  subscribe(fn: (s: GroupState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Only for newGroup() links. The creator becomes `group.createdBy`. */
  create(group: GroupRecord, me: MemberRecord): Promise<void> {
    if (!this.creating || !this.admin || this.memberId) return reject("create needs a new group link");
    const record = sanitizeMember(me);
    const { memberId, secret } = newMember();
    const g = { ...group, createdBy: memberId };
    if (!isGroupRecord(g) || !record) return reject("invalid group or member");
    this.adopt(memberId, secret, this.admin);
    this.groupName = g.name;
    this.remember();
    this.local.set("group", { version: 0, iv: "", record: g });
    this.local.set(MEMBER + memberId, { version: 0, iv: "", record });
    this.emit();
    // The group must reach the server before the creator's member record.
    return this.run(async () => {
      await this.put("group", g);
      await this.put(MEMBER + memberId, record);
    });
  }

  join(me: MemberRecord): Promise<void> {
    if (this.memberId && this.local.has(MEMBER + this.memberId)) return this.updateMe(me);
    const record = sanitizeMember(me);
    if (!record) return reject("invalid member");
    // A stored identity whose record never reached the server keeps its id.
    if (!this.memberId || !this.secret) {
      const { memberId, secret } = newMember();
      this.adopt(memberId, secret, this.admin);
    }
    const key = MEMBER + this.memberId;
    this.groupName = this.current.group?.name ?? "";
    this.remember();
    this.local.set(key, { version: 0, iv: "", record });
    this.emit();
    return this.run(() => this.put(key, record));
  }

  updateMe(patch: Partial<MemberRecord>): Promise<void> {
    const key = this.memberId ? MEMBER + this.memberId : "";
    return this.edit(key, (r) => sanitizeMember({ ...r, ...patch }));
  }

  updateGroup(patch: Partial<GroupRecord>): Promise<void> {
    if (!this.admin) return reject("only the admin can change the group");
    return this.edit("group", (r) => {
      const g = { ...r, ...patch };
      return isGroupRecord(g) ? g : null;
    });
  }

  removeMember(memberId: string): void {
    if (!this.admin) throw new Error("Together: only the admin can remove members");
    this.local.delete(MEMBER + memberId);
    const msg: RemoveMsg = { t: "remove", memberId, secret: this.admin };
    this.pending.set(`remove:${memberId}`, { t: "remove", msg });
    this.transmit(msg);
    this.emit();
  }

  personalLink(): PersonalLink | null {
    if (!this.memberId || !this.secret) return null;
    const link: PersonalLink = {
      groupId: this.groupId,
      key: this.keyText,
      memberId: this.memberId,
      secret: this.secret,
    };
    if (this.admin) link.admin = this.admin;
    return link;
  }

  close(): void {
    this.closed = true;
    if (this.timer !== null) this.timers.clear(this.timer);
    this.timer = null;
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }

  // Startup and connection

  private async start(): Promise<void> {
    try {
      this.key = await importKey(this.keyText);
    } catch {
      return this.fail("incomplete");
    }
    const cached = loadCache(this.groupId, this.storage);
    if (cached.length > 0) {
      await this.replace(cached, []);
      this.loaded = this.local.has("group");
      this.emit();
    }
    this.connect();
  }

  private connect(): void {
    if (this.closed) return;
    const ws = this.socket(socketUrl(this.groupId));
    this.ws = ws;
    let opened = false;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      opened = true;
      this.attempt = 0;
      this.status = "online";
      for (const p of this.pending.values()) this.transmit(p.msg);
      this.emit();
    };
    ws.onmessage = (e) => {
      if (this.ws === ws) void this.run(() => this.receive(e.data));
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.closed) return;
      this.ws = null;
      this.status = opened ? "connecting" : "offline";
      const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)] as number;
      this.attempt++;
      const { set } = this.timers;
      this.timer = set(() => {
        this.timer = null;
        this.connect();
      }, delay);
      this.emit();
    };
  }

  private transmit(msg: PutMsg | RemoveMsg): void {
    if (this.ws?.readyState !== OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {
      // Resent from `pending` on the next open.
    }
  }

  // Incoming messages

  private async receive(data: string): Promise<void> {
    if (this.closed) return;
    let msg: ServerMsg;
    try {
      msg = JSON.parse(data) as ServerMsg;
    } catch {
      return;
    }
    if (msg.t === "snapshot") return this.onSnapshot(msg.envs, msg.removed);
    if (msg.t === "update" && isEnvelope(msg.env)) return this.onUpdate(msg.env);
    if (msg.t === "removed" && typeof msg.memberId === "string") return this.onRemoved(msg.memberId);
    if (msg.t === "error") return this.onError(msg.code, msg.id, msg.version);
  }

  private async onSnapshot(rawEnvs: unknown, rawRemoved: unknown): Promise<void> {
    const envs = Array.isArray(rawEnvs) ? rawEnvs.filter(isEnvelope) : [];
    const removed = Array.isArray(rawRemoved) ? rawRemoved.filter((x) => typeof x === "string") : [];
    if (this.memberId && removed.includes(this.memberId)) return this.fail("removed");
    if (!envs.some((e) => e.kind === "group") && !this.creating && !this.pending.has("group")) {
      return this.fail("gone");
    }
    for (const id of removed) this.pending.delete(`remove:${id}`);
    await this.replace(envs, removed);
    for (const [key, p] of this.pending) {
      if (p.t === "put" && sameEnv(p.msg.env, this.confirmed.get(key))) this.pending.delete(key);
    }
    if (this.confirmed.has("group")) this.creating = false;
    this.persist();
    this.loaded = true;
    this.emit();
  }

  private async onUpdate(env: Envelope): Promise<void> {
    const key = envKey(env.kind, env.id);
    if (env.version > (this.confirmed.get(key)?.version ?? -1)) {
      this.confirmed.set(key, env);
      this.persist();
    }
    if (key === "group") this.creating = false;
    const p = this.pending.get(key);
    if (p?.t === "put" && sameEnv(p.msg.env, env)) this.pending.delete(key);
    const held = this.local.get(key);
    if (!held || env.version > held.version) {
      const opened = await this.decrypt(env);
      if (opened) this.local.set(key, opened);
    }
    this.emit();
  }

  private onRemoved(memberId: string): void {
    const key = MEMBER + memberId;
    this.local.delete(key);
    this.confirmed.delete(key);
    this.pending.delete(key);
    this.pending.delete(`remove:${memberId}`);
    this.persist();
    if (memberId === this.memberId) this.fail("removed");
    else this.emit();
  }

  private async onError(code: string, id?: string, version?: number): Promise<void> {
    if (code === "stale" && id !== undefined && version !== undefined) {
      // Another tab of mine wrote first. Bump past the server and resend this edit, a few times at most.
      const key = id === "group" ? "group" : MEMBER + id;
      const p = this.pending.get(key);
      if (p?.t !== "put" || p.msg.env.version > version) return;
      if (p.tries >= MAX_TRIES) {
        this.pending.delete(key);
        console.warn("Together: gave up on an edit after repeated conflicts");
        return;
      }
      return this.put(key, p.record, p.tries + 1, version);
    }
    if (code === "limit") {
      const key = this.memberId ? MEMBER + this.memberId : "";
      if (this.pending.has(key) && !this.confirmed.has(key)) {
        // My join was refused: the group already has its full number of members.
        forgetMembership(this.groupId, this.storage);
        this.pending.delete(key);
        this.local.delete(key);
        this.memberId = null;
        this.secret = null;
        this.error = "full";
        this.emit();
      } else console.warn("Together: a record was too large to save");
      return;
    }
    if (code === "rate") {
      this.error = "rate";
      this.emit();
      const { set } = this.timers;
      set(() => {
        if (this.error === "rate") this.error = null;
        for (const p of this.pending.values()) this.transmit(p.msg);
        this.emit();
      }, LIMITS.rateWindowMs);
      return;
    }
    if (code === "gone") return this.fail("gone");
    console.warn(`Together: the server refused a message (${code})`);
  }

  /** Swap in the server's (or the cache's) records, keeping my own unacknowledged edits. */
  private async replace(envs: Envelope[], removed: string[]): Promise<void> {
    const fresh = new Map<string, Envelope>();
    for (const env of envs) {
      if (env.kind === "member" && (removed.includes(env.id) || this.pending.has(`remove:${env.id}`)))
        continue;
      fresh.set(envKey(env.kind, env.id), env);
    }
    const next = new Map<string, Held>();
    for (const [key, env] of fresh) {
      const held = this.local.get(key);
      const mine = held && this.pending.has(key) && held.version > env.version;
      if (held && (mine || (held.version === env.version && held.iv === env.iv))) next.set(key, held);
      else {
        const opened = await this.decrypt(env);
        if (opened) next.set(key, opened);
      }
    }
    for (const [key, held] of this.local) {
      if (!next.has(key) && (this.pending.has(key) || held.iv === "")) next.set(key, held);
    }
    this.local = next;
    this.confirmed = fresh;
  }

  private async decrypt(env: Envelope): Promise<Held | null> {
    const raw = this.key ? await open(this.key, env) : null;
    let record: Rec | null = null;
    if (raw !== null) {
      if (env.kind === "member") record = sanitizeMember(raw);
      else if (env.id === "group" && isGroupRecord(raw)) record = raw;
    }
    if (!record) {
      console.warn(`Together: skipped an unreadable ${env.kind} record`, env.id);
      return null;
    }
    return { version: env.version, iv: env.iv, record };
  }

  // Outgoing edits

  private edit(key: string, apply: (r: Rec) => Rec | null): Promise<void> {
    const held = this.local.get(key);
    const record = held ? apply(held.record) : null;
    if (!held || !record) return reject("nothing to edit, or the edit is invalid");
    this.local.set(key, { ...held, record });
    this.emit();
    return this.run(async () => {
      // Re-apply on top of whatever arrived while this edit waited its turn.
      const latest = this.local.get(key);
      const next = latest ? apply(latest.record) : null;
      if (next) await this.put(key, next);
    });
  }

  private async put(key: string, record: Rec, tries = 1, floor = 0): Promise<void> {
    const isGroup = key === "group";
    const secret = isGroup ? this.admin : this.secret;
    if (!this.key || !secret) throw new Error("Together: can't write this record");
    const previous = Math.max(
      this.local.get(key)?.version ?? 0,
      this.confirmed.get(key)?.version ?? 0,
      floor,
    );
    const version = nextVersion(previous, this.now());
    const env = await seal(
      this.key,
      isGroup ? "group" : "member",
      isGroup ? "group" : key.slice(MEMBER.length),
      version,
      record,
    );
    const msg: PutMsg = { t: "put", env, secret, secretHash: await this.hash(secret) };
    if (isGroup) msg.until = toIso(groupRange(record as GroupRecord).end);
    this.local.set(key, { version, iv: env.iv, record });
    this.pending.set(key, { t: "put", msg, record, tries });
    this.transmit(msg);
    this.emit();
  }

  // Helpers

  private run(task: () => Promise<void>): Promise<void> {
    const next = this.work.then(task);
    this.work = next.catch((e: unknown) => console.warn("Together:", e));
    return next;
  }

  private hash(secret: string): Promise<string> {
    let h = this.hashes.get(secret);
    if (!h) {
      h = hashSecret(secret);
      this.hashes.set(secret, h);
    }
    return h;
  }

  private adopt(memberId: string, secret: string, admin: string | null): void {
    this.memberId = memberId;
    this.secret = secret;
    this.admin = admin;
  }

  private remember(): void {
    if (!this.memberId || !this.secret) return;
    saveMembership(
      {
        groupId: this.groupId,
        key: this.keyText,
        memberId: this.memberId,
        secret: this.secret,
        groupName: this.groupName,
        ...(this.admin ? { admin: this.admin } : {}),
      },
      this.storage,
    );
  }

  private persist(): void {
    saveCache(this.groupId, [...this.confirmed.values()], this.storage);
  }

  private fail(error: Exclude<SessionError, null>): void {
    if (error === "removed") {
      forgetMembership(this.groupId, this.storage);
      this.memberId = null;
      this.secret = null;
      this.admin = null;
    }
    if (error === "gone") saveCache(this.groupId, [], this.storage);
    this.close();
    this.error = error;
    this.emit();
  }

  private build(): GroupState {
    let group: GroupRecord | null = null;
    const members = new Map<string, MemberRecord>();
    for (const [key, held] of this.local) {
      if (key === "group") group = held.record as GroupRecord;
      else members.set(key.slice(MEMBER.length), held.record as MemberRecord);
    }
    return {
      status: this.status,
      group,
      members,
      me: this.memberId,
      isAdmin: this.admin !== null,
      error: this.error,
      loaded: this.loaded,
    };
  }

  private emit(): void {
    this.current = this.build();
    const name = this.current.group?.name;
    if (name !== undefined && name !== this.groupName && this.memberId) {
      this.groupName = name;
      this.remember();
    }
    for (const fn of this.listeners) fn(this.current);
  }
}
