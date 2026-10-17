import { type Envelope, isEnvelope } from "./protocol";

export interface Membership {
  groupId: string;
  key: string;
  memberId: string;
  secret: string;
  admin?: string;
  groupName: string;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const membershipKey = (groupId: string) => `lm:together:v1:${groupId}`;
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

export function loadMembership(groupId: string, s: StorageLike | null = local()): Membership | null {
  const v = read(membershipKey(groupId), s);
  return isMembership(v) && v.groupId === groupId ? v : null;
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
