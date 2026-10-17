import {
  type ClientMsg,
  type Envelope,
  envKey,
  hashSecret,
  isEnvelope,
  LIMITS,
  type PutMsg,
  type RemoveMsg,
  type ServerMsg,
} from "../../src/lib/together/protocol";

export interface Room {
  envs: Map<string, Envelope>;
  hashes: Map<string, string>;
  adminHash: string | null;
  removed: Set<string>;
  until: string | null;
  lastWrite: number;
}

export type Outcome = { ok: true; broadcast: ServerMsg; dirty: string[] } | { ok: false; reply: ServerMsg };

export interface RateState {
  start: number;
  count: number;
}

const DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyRoom(): Room {
  return {
    envs: new Map(),
    hashes: new Map(),
    adminHash: null,
    removed: new Set(),
    until: null,
    lastWrite: 0,
  };
}

function fail(
  code: "auth" | "stale" | "limit" | "gone" | "bad",
  extra?: { id: string; version: number },
): Outcome {
  return { ok: false, reply: { t: "error", code, ...extra } };
}

function validUntil(until: string): boolean {
  return ISO_DATE.test(until) && !Number.isNaN(Date.parse(`${until}T00:00:00Z`));
}

export function parseClientMsg(raw: string): ClientMsg | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const m = v as Record<string, unknown>;
  if (typeof m.secret !== "string") return null;
  if (m.t === "put") {
    if (!isEnvelope(m.env)) return null;
    if (m.secretHash !== undefined && typeof m.secretHash !== "string") return null;
    if (m.until !== undefined && typeof m.until !== "string") return null;
    return v as PutMsg;
  }
  if (m.t === "remove") {
    return typeof m.memberId === "string" ? (v as RemoveMsg) : null;
  }
  return null;
}

export async function applyPut(room: Room, msg: PutMsg, now: number): Promise<Outcome> {
  const { env, secret } = msg;
  if (JSON.stringify(env).length > LIMITS.envelopeChars) return fail("limit");
  if (msg.until !== undefined && !validUntil(msg.until)) return fail("bad");

  const secretHash = await hashSecret(secret);
  const dirty: string[] = [];
  let register: (() => void) | null = null;

  if (env.kind === "group") {
    if (room.adminHash === null) {
      if (msg.secretHash !== secretHash) return fail("auth");
      register = () => {
        room.adminHash = secretHash;
        dirty.push("admin");
      };
    } else if (room.adminHash !== secretHash) {
      return fail("auth");
    }
  } else {
    if (!room.envs.has("group")) return fail("gone");
    if (room.removed.has(env.id)) return fail("auth");
    const stored = room.hashes.get(env.id);
    if (stored === undefined) {
      if (msg.secretHash !== secretHash) return fail("auth");
      if (room.hashes.size >= LIMITS.members) return fail("limit");
      register = () => {
        room.hashes.set(env.id, secretHash);
        dirty.push(`hash:${env.id}`);
      };
    } else if (stored !== secretHash) {
      return fail("auth");
    }
  }

  const key = envKey(env.kind, env.id);
  const current = room.envs.get(key);
  if (current && env.version <= current.version) {
    return fail("stale", { id: env.id, version: current.version });
  }

  register?.();
  room.envs.set(key, env);
  dirty.push(key);
  if (env.kind === "group" && msg.until !== undefined) {
    room.until = msg.until;
    dirty.push("until");
  }
  room.lastWrite = now;
  dirty.push("lastWrite");
  return { ok: true, broadcast: { t: "update", env }, dirty };
}

export async function applyRemove(room: Room, msg: RemoveMsg, now: number): Promise<Outcome> {
  if (room.adminHash === null || room.adminHash !== (await hashSecret(msg.secret))) return fail("auth");
  const { memberId } = msg;
  room.envs.delete(envKey("member", memberId));
  room.hashes.delete(memberId);
  room.removed.add(memberId);
  room.lastWrite = now;
  return {
    ok: true,
    broadcast: { t: "removed", memberId },
    dirty: [envKey("member", memberId), `hash:${memberId}`, `tomb:${memberId}`, "lastWrite"],
  };
}

export function snapshot(room: Room): ServerMsg {
  return { t: "snapshot", envs: [...room.envs.values()], removed: [...room.removed] };
}

export function expiresAt(room: Room): number | null {
  if (room.envs.size === 0) return null;
  const idle = room.lastWrite + 180 * DAY;
  if (room.until === null) return idle;
  return Math.min(Date.parse(`${room.until}T00:00:00Z`) + 60 * DAY, idle);
}

export function rate(state: RateState | null, now: number): { ok: boolean; state: RateState } {
  if (state === null || now - state.start >= LIMITS.rateWindowMs) {
    return { ok: true, state: { start: now, count: 1 } };
  }
  const next = { start: state.start, count: state.count + 1 };
  return { ok: next.count <= LIMITS.rateMessages, state: next };
}
