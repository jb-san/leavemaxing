import { type Envelope, isEnvelope } from "./protocol";

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

function write(key: string, value: unknown, s: StorageLike | null): void {
  try {
    s?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the session still works, it just won't be remembered.
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

export function saveMembership(m: Membership, s: StorageLike | null = local()): void {
  write(membershipKey(m.groupId), m, s);
}

export function forgetMembership(groupId: string, s: StorageLike | null = local()): void {
  try {
    s?.removeItem(membershipKey(groupId));
  } catch {
    // Nothing to do.
  }
}

export function loadCache(groupId: string, s: StorageLike | null = local()): Envelope[] {
  const v = read(cacheKey(groupId), s);
  return Array.isArray(v) ? v.filter(isEnvelope) : [];
}

export function saveCache(groupId: string, envs: Envelope[], s: StorageLike | null = local()): void {
  write(cacheKey(groupId), envs, s);
}

/** Leaves this browser's copy of a group: the membership and the cached envelopes. */
export function forgetGroup(groupId: string, s: StorageLike | null = local()): void {
  forgetMembership(groupId, s);
  try {
    s?.removeItem(cacheKey(groupId));
  } catch {
    // Nothing to do.
  }
}
