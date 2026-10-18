import { type Envelope, isEnvelope, type PutMsg, type RemoveMsg } from "./protocol";

export interface Membership {
  groupId: string;
  key: string;
  memberId: string;
  secret: string;
  admin?: string;
  groupName: string;
  summary?: MembershipSummary;
}

/** What My plans shows without decrypting anything. Plaintext, next to the key this browser already holds. */
export interface MembershipSummary {
  /** First and last day of the group's months, as ISO dates. */
  from: string;
  to: string;
  members: number;
  /** Dates that work for everyone. */
  agreed: number;
  /** When this last changed, in ms. */
  updatedAt: number;
}

/** Storage that can also be walked, as My plans needs to. */
export type ListableStorage = StorageLike & Pick<Storage, "key" | "length">;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const membershipKey = (groupId: string) => `${PREFIX}${groupId}`;
const PREFIX = "lm:together:v1:";
const cacheKey = (groupId: string) => `lm:together:cache:v1:${groupId}`;
const pendingKey = (groupId: string) => `lm:together:pending:v1:${groupId}`;

/**
 * A message sent but not yet acknowledged, kept so it's sent again after a reload. A put keeps the
 * field patches that made it and the server version they were applied to, so they can be applied
 * again on top of a newer record.
 */
export type StoredPending =
  | { key: string; msg: PutMsg; patches: object[]; base: number; tries: number }
  | { key: string; msg: RemoveMsg };

/** The browser's localStorage, or null where there is none (or it throws). */
function local(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function read(key: string, s: StorageLike | null): unknown {
  try {
    const raw = s?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Whether the value was stored. */
function write(key: string, value: unknown, s: StorageLike | null): boolean {
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Full or blocked storage: the session still works, it just won't be remembered.
    return false;
  }
}

function remove(key: string, s: StorageLike | null): void {
  try {
    s?.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

function isSummary(v: unknown): v is MembershipSummary {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.from === "string" &&
    typeof m.to === "string" &&
    Number.isFinite(m.members) &&
    Number.isFinite(m.agreed) &&
    Number.isFinite(m.updatedAt)
  );
}

function isMembership(v: unknown): v is Membership {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.groupId === "string" &&
    typeof m.key === "string" &&
    typeof m.memberId === "string" &&
    typeof m.secret === "string" &&
    (m.admin === undefined || typeof m.admin === "string") &&
    typeof m.groupName === "string"
  );
}

/** A stored membership with a summary that doesn't parse loses only the summary. */
function clean(v: unknown): Membership | null {
  if (!isMembership(v)) return null;
  const { summary, ...rest } = v;
  return isSummary(summary) ? { ...rest, summary } : rest;
}

export function loadMembership(groupId: string, s: StorageLike | null = local()): Membership | null {
  const v = clean(read(membershipKey(groupId), s));
  return v && v.groupId === groupId ? v : null;
}

/**
 * Every group this browser belongs to: newest summary first, then those without one by name.
 * Malformed entries are skipped, and storage that throws gives an empty list.
 */
export function listMemberships(s: ListableStorage | null = local() as ListableStorage | null): Membership[] {
  const found: Membership[] = [];
  try {
    if (!s) return [];
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      const m = clean(read(k, s));
      if (m && membershipKey(m.groupId) === k) found.push(m);
    }
  } catch {
    return [];
  }
  return found.sort((a, b) => {
    const x = a.summary?.updatedAt;
    const y = b.summary?.updatedAt;
    if (x !== undefined && y !== undefined && x !== y) return y - x;
    if (x !== undefined && y === undefined) return -1;
    if (x === undefined && y !== undefined) return 1;
    return a.groupName.localeCompare(b.groupName);
  });
}

/** Whether the membership was stored: false where there's no storage, or it's full or blocked. */
export function saveMembership(m: Membership, s: StorageLike | null = local()): boolean {
  return write(membershipKey(m.groupId), m, s);
}

export function forgetMembership(groupId: string, s: StorageLike | null = local()): void {
  remove(membershipKey(groupId), s);
}

export function loadCache(groupId: string, s: StorageLike | null = local()): Envelope[] {
  const v = read(cacheKey(groupId), s);
  return Array.isArray(v) ? v.filter(isEnvelope) : [];
}

export function saveCache(groupId: string, envs: Envelope[], s: StorageLike | null = local()): void {
  write(cacheKey(groupId), envs, s);
}

function isPending(v: unknown): v is StoredPending {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  const msg = p.msg as Record<string, unknown> | null;
  if (typeof p.key !== "string" || !msg || typeof msg !== "object" || typeof msg.secret !== "string") {
    return false;
  }
  if (msg.t === "remove") return typeof msg.memberId === "string";
  return (
    msg.t === "put" &&
    isEnvelope(msg.env) &&
    Array.isArray(p.patches) &&
    p.patches.every((x) => x !== null && typeof x === "object" && !Array.isArray(x)) &&
    Number.isSafeInteger(p.base) &&
    Number.isSafeInteger(p.tries)
  );
}

export function loadPending(groupId: string, s: StorageLike | null = local()): StoredPending[] {
  const v = read(pendingKey(groupId), s);
  return Array.isArray(v) ? v.filter(isPending) : [];
}

/** Keeps what's still unsent, or clears the key when nothing is. */
export function savePending(groupId: string, list: StoredPending[], s: StorageLike | null = local()): void {
  if (list.length === 0) remove(pendingKey(groupId), s);
  else write(pendingKey(groupId), list, s);
}

/** Leaves this browser's copy of a group: the membership, the cached envelopes and unsent edits. */
export function forgetGroup(groupId: string, s: StorageLike | null = local()): void {
  forgetMembership(groupId, s);
  remove(cacheKey(groupId), s);
  remove(pendingKey(groupId), s);
}
