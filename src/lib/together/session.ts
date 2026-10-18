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
  forgetGroup,
  forgetMembership,
  loadCache,
  loadMembership,
  loadPending,
  type Membership,
  type MembershipSummary,
  type StorageLike,
  type StoredPending,
  saveCache,
  saveMembership,
  savePending,
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

/** A personal link naming someone other than the member this device already is in the group. */
export interface IdentityChoice {
  /** The member in the link. */
  link: string;
  /** The member this device is now. */
  stored: string;
  /** Taking the link would leave this device's admin secret behind. */
  losesAdmin: boolean;
}

export interface GroupState {
  status: Status;
  group: GroupRecord | null;
  members: Map<string, MemberRecord>;
  me: string | null;
  isAdmin: boolean;
  error: SessionError;
  loaded: boolean;
  /** Some edit hasn't reached the server yet. */
  saving: boolean;
  /** Set until `choose` is called. Nothing is written for the group meanwhile. */
  choice: IdentityChoice | null;
}

/** `create` couldn't reach the server, so the group doesn't exist. */
export class Unreachable extends Error {
  constructor() {
    super("Together: can't reach the server");
  }
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
/** How long `create` waits for the server to take the group. */
export const CREATE_TIMEOUT_MS = 15_000;

const OPEN = 1;
const MAX_TRIES = 3;
const MEMBER = "member:";

type Rec = GroupRecord | MemberRecord;
/** One edit, as the fields it sets. Plain data, so it can be kept and applied again later. */
type Patch = Partial<MemberRecord> | Partial<GroupRecord>;
/** What this tab shows for one record. `iv` is "" until the record is sealed. */
interface Held {
  version: number;
  iv: string;
  record: Rec;
}
/**
 * Sent but not yet acknowledged; resent on every (re)open. A put keeps the patches that made it and
 * the server version they were applied to (`base`). When the server has a newer version from
 * someone else (my other device), the patches are applied again on top of it.
 */
type PendingPut = { t: "put"; msg: PutMsg; patches: Patch[]; base: number; tries: number };
type Pending = PendingPut | { t: "remove"; msg: RemoveMsg };

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
  /** What My plans shows about this group, kept in the membership. */
  private summary: MembershipSummary | undefined;
  /** The agreed count last reported by the view, which is the only thing that scores. */
  private agreed: number | undefined;
  /** A newGroup() link whose group isn't on the server yet: an empty room is expected. */
  private creating = false;
  /** Settles `create` once the server has the group, or can't be reached. */
  private created: { resolve: () => void; reject: (e: Error) => void; timer: TimerId } | null = null;
  /** Whether the last membership write reached storage. */
  private stored = false;
  /** The identity on this device and the one in the link, until the person picks one. */
  private choosing: { stored: Membership; link: PersonalLink } | null = null;
  private status: Status = "connecting";
  private error: SessionError = null;
  private loaded = false;
  private local = new Map<string, Held>();
  private confirmed = new Map<string, Envelope>();
  private pending = new Map<string, Pending>();
  /** Messages sent on this socket and not yet answered, oldest first. The server answers in order. */
  private inflight: { key: string; msg: PutMsg | RemoveMsg }[] = [];
  /** Edits shown but not yet sealed, per key, re-applied in order on top of any newer record. */
  private drafts = new Map<string, Patch[]>();
  /** The IVs of every envelope this session sealed: an update with one of them is my own write. */
  private sealed = new Set<string>();
  private hashes = new Map<string, Promise<string>>();
  private listeners = new Set<(s: GroupState) => void>();
  private work: Promise<void> = Promise.resolve();
  private ws: SocketLike | null = null;
  private attempt = 0;
  private timer: TimerId | null = null;
  private rateTimer: TimerId | null = null;
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
      if ("memberId" in link && stored && stored.memberId !== link.memberId) {
        // Someone else's link: ask before replacing who this device is.
        this.choosing = { stored, link };
        this.groupName = stored.groupName;
      } else if ("memberId" in link) {
        this.adopt(link.memberId, link.secret, link.admin ?? stored?.admin ?? null);
        this.groupName = stored?.groupName ?? "";
        this.summary = stored?.summary;
        this.remember();
      } else if (stored) {
        this.adopt(stored.memberId, stored.secret, stored.admin ?? null);
        this.groupName = stored.groupName;
        this.summary = stored.summary;
        this.stored = true;
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

  /** Whether the membership is in this browser's storage, so the invite alone brings this person back. */
  get saved(): boolean {
    return this.stored;
  }

  /**
   * Only for newGroup() links. The creator becomes `group.createdBy`. Resolves once the server has
   * the group, and only then is anything kept in this browser. Rejects with `Unreachable` when the
   * server can't be reached: then the group doesn't exist.
   */
  create(group: GroupRecord, me: MemberRecord): Promise<void> {
    if (!this.creating || !this.admin || this.memberId) return reject("create needs a new group link");
    const record = sanitizeMember(me);
    const { memberId, secret } = newMember();
    const g = { ...group, createdBy: memberId };
    if (!isGroupRecord(g) || !record) return reject("invalid group or member");
    this.adopt(memberId, secret, this.admin);
    this.groupName = g.name;
    this.local.set("group", { version: 0, iv: "", record: g });
    this.local.set(MEMBER + memberId, { version: 0, iv: "", record });
    this.emit();
    const done = new Promise<void>((resolve, rejectCreate) => {
      const timer = this.timers.set(() => this.settleCreate(new Unreachable()), CREATE_TIMEOUT_MS);
      this.created = { resolve, reject: rejectCreate, timer };
    });
    if (this.status === "offline") this.settleCreate(new Unreachable());
    // The group must reach the server before the creator's member record.
    this.run(async () => {
      await this.put("group", g, [g]);
      await this.put(MEMBER + memberId, record, [record]);
    }).catch((e: unknown) => this.settleCreate(e instanceof Error ? e : new Error(String(e))));
    return done;
  }

  /**
   * Answers the identity choice: keep who this device is ("stored"), or become the link's member
   * ("link"). Only now is the membership written.
   */
  choose(keep: "stored" | "link"): Promise<void> {
    const choosing = this.choosing;
    if (!choosing) return Promise.resolve();
    this.choosing = null;
    const { stored, link } = choosing;
    if (keep === "stored") {
      this.adopt(stored.memberId, stored.secret, stored.admin ?? null);
      this.summary = stored.summary;
      this.stored = true;
    } else {
      this.adopt(link.memberId, link.secret, link.admin ?? null);
      this.summary = undefined;
      this.remember();
    }
    this.emit();
    return this.run(async () => {
      if (keep === "link") {
        this.savePending();
        return;
      }
      await this.restorePending();
      for (const p of this.pending.values()) this.transmit(p.msg);
      // The server may have newer records from this member's other devices by now.
      for (const [key, p] of this.pending) {
        const env = this.confirmed.get(key);
        if (p.t !== "put" || !env || !this.conflicts(p, env)) continue;
        const opened = await this.decrypt(env);
        if (opened) await this.rebase(key, opened);
      }
      this.emit();
    });
  }

  join(me: MemberRecord): Promise<void> {
    if (this.choosing) return reject("choose who you are on this device first");
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
    return this.run(() => this.put(key, record, [record]));
  }

  updateMe(patch: Partial<MemberRecord>): Promise<void> {
    const key = this.memberId ? MEMBER + this.memberId : "";
    return this.edit(key, patch);
  }

  updateGroup(patch: Partial<GroupRecord>): Promise<void> {
    if (!this.admin) return reject("only the admin can change the group");
    return this.edit("group", patch);
  }

  removeMember(memberId: string): void {
    if (!this.admin) throw new Error("Together: only the admin can remove members");
    this.local.delete(MEMBER + memberId);
    const msg: RemoveMsg = { t: "remove", memberId, secret: this.admin };
    this.pend(`remove:${memberId}`, { t: "remove", msg });
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
    this.settleCreate(new Unreachable());
    for (const t of [this.timer, this.rateTimer]) if (t !== null) this.timers.clear(t);
    this.timer = null;
    this.rateTimer = null;
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
    await this.restorePending();
    const cached = loadCache(this.groupId, this.storage);
    if (cached.length > 0) {
      await this.replace(cached, []);
      this.loaded = this.local.has("group");
      this.emit();
    }
    this.connect();
  }

  /** Brings back the edits this device's member hadn't got to the server before the page closed. */
  private async restorePending(): Promise<void> {
    if (!this.memberId || !this.key) return;
    for (const p of loadPending(this.groupId, this.storage)) {
      // Only what this identity can still send: another member's edits stay unsent.
      if (!("patches" in p)) {
        if (p.msg.t !== "remove" || p.msg.secret !== this.admin) continue;
        this.pending.set(p.key, { t: "remove", msg: p.msg });
        this.local.delete(MEMBER + p.msg.memberId);
        continue;
      }
      const secret = p.key === "group" ? this.admin : p.key === MEMBER + this.memberId ? this.secret : null;
      if (!secret || p.msg.secret !== secret) continue;
      const held = await this.decrypt(p.msg.env);
      if (!held) continue;
      this.sealed.add(p.msg.env.iv);
      this.local.set(p.key, held);
      this.pending.set(p.key, {
        t: "put",
        msg: p.msg,
        patches: p.patches as Patch[],
        base: p.base,
        tries: p.tries,
      });
    }
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
      this.inflight = [];
      for (const p of this.pending.values()) this.transmit(p.msg);
      this.emit();
    };
    ws.onmessage = (e) => {
      if (this.ws === ws) void this.run(() => this.receive(e.data));
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.closed) return;
      this.ws = null;
      // The group never reached the server: tell the create form now rather than keep trying.
      if (this.created) {
        this.fail("unreachable");
        return;
      }
      // A missing group isn't reopened until the page is.
      if (this.error === "gone") return;
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
      this.inflight.push({
        key: msg.t === "put" ? envKey(msg.env.kind, msg.env.id) : `remove:${msg.memberId}`,
        msg,
      });
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
    // A group that isn't there only waits for the server to say whether it's gone for good.
    if (this.error === "gone" && msg.t !== "error") return;
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
      // Shown as gone, but only the server's own "gone" forgets the group: this could be a group
      // whose first write never arrived, or a server that lost it for a moment.
      return this.missing();
    }
    for (const id of removed) this.unpend(`remove:${id}`);
    const conflicts = await this.replace(envs, removed);
    for (const [key, p] of this.pending) {
      if (p.t === "put" && sameEnv(p.msg.env, this.confirmed.get(key))) this.unpend(key);
    }
    for (const [key, base] of conflicts) await this.rebase(key, base);
    if (this.confirmed.has("group")) this.groupConfirmed();
    this.persist();
    this.loaded = true;
    this.emit();
  }

  private async onUpdate(env: Envelope): Promise<void> {
    const key = envKey(env.kind, env.id);
    if (env.version > (this.confirmed.get(key)?.version ?? -1)) this.confirmed.set(key, env);
    const p = this.pending.get(key);
    if (p?.t === "put" && sameEnv(p.msg.env, env)) this.unpend(key);
    this.answered((m) => m.t === "put" && sameEnv(m.env, env));
    if (key === "group") this.groupConfirmed();
    this.persist();
    if (p?.t === "put" && this.conflicts(p, env)) {
      // My other device wrote this record since my edit was made: my edit goes on top of theirs.
      const opened = await this.decrypt(env);
      if (opened) await this.rebase(key, opened);
    } else {
      const held = this.local.get(key);
      if (!held || env.version > held.version) {
        const opened = await this.decrypt(env);
        if (opened) this.local.set(key, this.compose(key, opened));
      }
    }
    this.emit();
  }

  /** The server has the group: from now on this browser keeps it. */
  private groupConfirmed(): void {
    if (!this.creating) return;
    this.creating = false;
    this.remember();
    this.savePending();
    this.settleCreate(null);
  }

  private settleCreate(error: Error | null): void {
    const created = this.created;
    if (!created) return;
    this.created = null;
    this.timers.clear(created.timer);
    if (error) created.reject(error);
    else created.resolve();
  }

  private onRemoved(memberId: string): void {
    const key = MEMBER + memberId;
    this.local.delete(key);
    this.confirmed.delete(key);
    this.unpend(key);
    this.unpend(`remove:${memberId}`);
    this.answered((m) => m.t === "remove" && m.memberId === memberId);
    this.persist();
    if (memberId === this.memberId) this.fail("removed");
    else this.emit();
  }

  private async onError(code: string, id?: string, version?: number): Promise<void> {
    // Errors carry no id (except stale), but they answer the oldest unanswered message.
    const head = this.inflight.shift();
    const pending = head ? this.pending.get(head.key) : undefined;
    const refused = head && pending?.msg === head.msg ? head.key : null;
    if (code === "stale" && id !== undefined && version !== undefined) {
      // Another tab of mine wrote first. Apply my edit again on top of the server's record and send it
      // above the server's version, a few times at most.
      const key = id === "group" ? "group" : MEMBER + id;
      const p = this.pending.get(key);
      if (p?.t !== "put" || p.msg.env.version > version) return;
      if (p.tries >= MAX_TRIES) {
        this.unpend(key);
        console.warn("Together: gave up on an edit after repeated conflicts");
        return;
      }
      const latest = this.confirmed.get(key);
      const base = (latest && (await this.decrypt(latest))) ?? this.local.get(key);
      if (!base) return;
      return this.rebase(key, { ...base, version: Math.max(base.version, version) }, p.tries + 1);
    }
    if (code === "rate") return this.rateLimited();
    if (code === "gone") return this.fail("gone");
    // auth, bad or limit: the server will never take this message, so stop sending it.
    if (refused) this.unpend(refused);
    const mine = this.memberId ? MEMBER + this.memberId : "";
    if (code === "limit" && refused === mine && !this.confirmed.has(mine)) {
      // My join was refused: the group already has its full number of members.
      forgetMembership(this.groupId, this.storage);
      this.local.delete(mine);
      this.drafts.delete(mine);
      this.memberId = null;
      this.secret = null;
      this.error = "full";
      this.emit();
      return;
    }
    // My secret doesn't match: the link I came in with is wrong.
    if (code === "auth" && refused) return this.fail("incomplete");
    console.warn(`Together: the server refused a message (${code})`);
  }

  private rateLimited(): void {
    if (this.error === null) this.error = "rate";
    this.emit();
    if (this.rateTimer !== null) return;
    const { set } = this.timers;
    this.rateTimer = set(() => {
      this.rateTimer = null;
      if (this.closed) return;
      if (this.error === "rate") this.error = null;
      for (const p of this.pending.values()) this.transmit(p.msg);
      this.emit();
    }, LIMITS.rateWindowMs);
  }

  /** Forget the in-flight entry for a message the server has just acknowledged. */
  private answered(match: (m: PutMsg | RemoveMsg) => boolean): void {
    const i = this.inflight.findIndex((e) => match(e.msg));
    if (i >= 0) this.inflight.splice(i, 1);
  }

  /**
   * Swap in the server's (or the cache's) records, keeping my own unacknowledged edits. Returns the
   * records my other device changed under an edit of mine, opened, for `rebase`.
   */
  private async replace(envs: Envelope[], removed: string[]): Promise<Map<string, Held>> {
    const fresh = new Map<string, Envelope>();
    for (const env of envs) {
      if (env.kind === "member" && (removed.includes(env.id) || this.pending.has(`remove:${env.id}`)))
        continue;
      fresh.set(envKey(env.kind, env.id), env);
    }
    const next = new Map<string, Held>();
    const conflicts = new Map<string, Held>();
    for (const [key, env] of fresh) {
      const held = this.local.get(key);
      const p = this.pending.get(key);
      if (p?.t === "put" && this.conflicts(p, env)) {
        const opened = await this.decrypt(env);
        if (opened) conflicts.set(key, opened);
        if (held) next.set(key, this.compose(key, held));
      } else if (held && (p?.t === "put" || (held.version === env.version && held.iv === env.iv))) {
        next.set(key, this.compose(key, held));
      } else {
        const opened = await this.decrypt(env);
        if (opened) next.set(key, this.compose(key, opened));
      }
    }
    for (const [key, held] of this.local) {
      if (!next.has(key) && (this.pending.has(key) || held.iv === "")) next.set(key, held);
    }
    this.local = next;
    this.confirmed = fresh;
    return conflicts;
  }

  /** A server record I didn't write, newer than the one my pending edit was made on. */
  private conflicts(p: PendingPut, env: Envelope): boolean {
    return !this.sealed.has(env.iv) && env.version > p.base;
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

  private edit(key: string, patch: Patch): Promise<void> {
    const held = this.local.get(key);
    const record = held ? this.apply(key, held.record, patch) : null;
    if (!held || !record) return reject("nothing to edit, or the edit is invalid");
    this.drafts.set(key, [...(this.drafts.get(key) ?? []), patch]);
    this.local.set(key, { ...held, record });
    this.emit();
    return this.run(async () => {
      // Seal every edit shown so far, re-applied on top of whatever arrived meanwhile.
      // Later queued edits find nothing left to seal.
      const edits = this.drafts.get(key);
      this.drafts.delete(key);
      const latest = this.local.get(key);
      if (!edits || !latest) return;
      const next = this.applyAll(key, latest.record, edits);
      // A put still unanswered is replaced by this one, so this one carries its patches too, and
      // the server version they were applied to: a newer one still sends them through `rebase`.
      const p = this.pending.get(key);
      const unanswered = p?.t === "put" ? p : null;
      const base = unanswered?.base ?? this.confirmed.get(key)?.version ?? 0;
      await this.put(key, next, [...(unanswered?.patches ?? []), ...edits], 1, 0, base);
    });
  }

  /**
   * My pending edit again, on top of a newer server record: its patches applied in order, sealed
   * above the server's version and sent. Unsealed drafts stay on top, as `compose` keeps them.
   */
  private async rebase(key: string, base: Held, tries?: number): Promise<void> {
    const p = this.pending.get(key);
    if (p?.t !== "put") return;
    const record = this.applyAll(key, base.record, p.patches);
    await this.put(key, record, p.patches, tries ?? p.tries, base.version, base.version);
  }

  /** A record with my unsealed edits on top, so newer typing never disappears. */
  private compose(key: string, held: Held): Held {
    const edits = this.drafts.get(key);
    if (!edits) return held;
    return { ...held, record: this.applyAll(key, held.record, edits) };
  }

  /** One patch on a record, or null when the result isn't a valid record. */
  private apply(key: string, r: Rec, patch: Patch): Rec | null {
    if (key !== "group") return sanitizeMember({ ...r, ...patch });
    const g = { ...r, ...patch };
    return isGroupRecord(g) ? g : null;
  }

  /** Patches in order, skipping any that no longer make a valid record. */
  private applyAll(key: string, r: Rec, patches: readonly Patch[]): Rec {
    return patches.reduce<Rec>((acc, patch) => this.apply(key, acc, patch) ?? acc, r);
  }

  private async put(
    key: string,
    record: Rec,
    patches: Patch[],
    tries = 1,
    floor = 0,
    base = this.confirmed.get(key)?.version ?? 0,
  ): Promise<void> {
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
    this.sealed.add(env.iv);
    // Edits made while sealing stay on screen; they are sealed by their own turn.
    this.local.set(key, this.compose(key, { version, iv: env.iv, record }));
    this.pend(key, { t: "put", msg, patches, base, tries });
    this.transmit(msg);
    this.emit();
  }

  private pend(key: string, p: Pending): void {
    this.pending.set(key, p);
    this.savePending();
  }

  private unpend(key: string): void {
    if (this.pending.delete(key)) this.savePending();
  }

  /**
   * Keeps what's unsent, so a reload sends it. Only for a member, never while the group is being
   * created (it doesn't exist yet) or while the identity choice is open (the stored list is theirs).
   */
  private savePending(): void {
    if (!this.memberId || this.creating || this.choosing) return;
    const list: StoredPending[] = [];
    for (const [key, p] of this.pending) {
      list.push(
        p.t === "put"
          ? { key, msg: p.msg, patches: p.patches, base: p.base, tries: p.tries }
          : { key, msg: p.msg },
      );
    }
    savePending(this.groupId, list, this.storage);
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

  /** Saves the membership. Not for a group the server doesn't have yet. */
  private remember(): void {
    if (!this.memberId || !this.secret || this.creating) return;
    this.stored = saveMembership(
      {
        groupId: this.groupId,
        key: this.keyText,
        memberId: this.memberId,
        secret: this.secret,
        groupName: this.groupName,
        ...(this.summary ? { summary: this.summary } : {}),
        ...(this.admin ? { admin: this.admin } : {}),
      },
      this.storage,
    );
  }

  /** The view reports how many dates work for everyone, as only it runs the scoring. */
  noteSummary(note: { agreed: number }): void {
    this.agreed = note.agreed;
    this.syncSummary();
  }

  /** Writes the summary only when something it holds has changed. Never for a browser that hasn't joined. */
  private syncSummary(): void {
    const group = this.current.group;
    if (!this.memberId || !this.secret || !this.loaded || !group || this.error) return;
    const { start, end } = groupRange(group);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    const next = {
      from: toIso(start),
      to: toIso(end),
      members: this.current.members.size,
      agreed: this.agreed ?? this.summary?.agreed ?? 0,
    };
    const was = this.summary;
    if (
      was &&
      was.from === next.from &&
      was.to === next.to &&
      was.members === next.members &&
      was.agreed === next.agreed
    )
      return;
    this.summary = { ...next, updatedAt: this.now() };
    this.remember();
  }

  private persist(): void {
    if (this.creating) return;
    saveCache(this.groupId, [...this.confirmed.values()], this.storage);
  }

  /** Nothing from this group is shown any more. Storage is left to the caller. */
  private clearShown(): void {
    this.summary = undefined;
    this.local.clear();
    this.confirmed.clear();
    this.pending.clear();
    this.drafts.clear();
  }

  /**
   * The group isn't on the server, but the server hasn't said it's gone for good. Shown as gone,
   * while the membership, cache and unsent edits stay, and the socket stays open for that "gone".
   */
  private missing(): void {
    this.clearShown();
    this.loaded = true;
    this.error = "gone";
    this.emit();
  }

  private fail(error: Exclude<SessionError, null> | "unreachable"): void {
    if (error === "unreachable") {
      this.close();
      return;
    }
    if (error === "gone" || error === "removed") {
      // The server said so: nothing from this group is kept in this browser any more.
      forgetGroup(this.groupId, this.storage);
      this.clearShown();
    }
    if (error === "removed") {
      this.memberId = null;
      this.secret = null;
      this.admin = null;
    }
    this.settleCreate(new Error(`Together: ${error}`));
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
    const choosing = this.choosing;
    return {
      status: this.status,
      group,
      members,
      me: this.memberId,
      isAdmin: this.admin !== null,
      error: this.error,
      loaded: this.loaded,
      saving: this.pending.size > 0 || this.drafts.size > 0,
      choice: choosing && {
        link: choosing.link.memberId,
        stored: choosing.stored.memberId,
        losesAdmin: choosing.stored.admin !== undefined && !choosing.link.admin,
      },
    };
  }

  private emit(): void {
    this.current = this.build();
    const name = this.current.group?.name;
    if (name !== undefined && name !== this.groupName && this.memberId) {
      this.groupName = name;
      this.remember();
    }
    this.syncSummary();
    for (const fn of this.listeners) fn(this.current);
  }
}
