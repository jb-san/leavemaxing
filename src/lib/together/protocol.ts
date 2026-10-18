import { fromIso, toIso } from "../dates";

export type WindowKey = `${string}..${string}`;
export type Vote = "yes" | "maybe" | "no";

export interface GroupRecord {
  name: string;
  months: { year: number; month: number }[];
  minLength: number;
  maxLength: number;
  createdBy: string;
}

export interface MemberRecord {
  name: string;
  color: string;
  country: string;
  region: string | null;
  workWeek: boolean[];
  customOff: number[];
  blocked: number[];
  allowance: number;
  proposals: WindowKey[];
  votes: Record<WindowKey, Vote>;
}

export interface Envelope {
  kind: "group" | "member";
  id: string;
  version: number;
  iv: string;
  data: string;
}

export type PutMsg = { t: "put"; env: Envelope; secret: string; secretHash?: string; until?: string };
export type RemoveMsg = { t: "remove"; memberId: string; secret: string };
export type ClientMsg = PutMsg | RemoveMsg;
export type ErrorCode = "auth" | "stale" | "limit" | "gone" | "rate" | "bad";
export type ServerMsg =
  | { t: "snapshot"; envs: Envelope[]; removed: string[] }
  | { t: "update"; env: Envelope }
  | { t: "removed"; memberId: string }
  | { t: "error"; code: ErrorCode; id?: string; version?: number };

export const LIMITS = {
  members: 20,
  envelopeChars: 16_384,
  rateMessages: 30,
  rateWindowMs: 10_000,
  minLength: 3,
  maxLength: 21,
} as const;

/** Each has at least 3:1 contrast against both #ffffff and #1e293b. */
export const MEMBER_COLORS: readonly string[] = [
  "#e11d48",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#c026d3",
  "#db2777",
];

const MAX_NAME = 40;
const MAX_GROUP_NAME = 60;
const MAX_MONTHS = 24;
const MAX_ALLOWANCE = 80;
const B64URL = /^[A-Za-z0-9_-]*$/;
const WINDOW_KEY = /^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/;

export function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  if (!B64URL.test(s) || s.length % 4 === 1) throw new Error("Invalid base64url");
  const padded = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function randomId(bytes: number): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return b64url(new Uint8Array(digest));
}

export function envKey(kind: Envelope["kind"], id: string): string {
  return kind === "group" ? "group" : `member:${id}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

export function isEnvelope(v: unknown): v is Envelope {
  return (
    isRecord(v) &&
    (v.kind === "group" || v.kind === "member") &&
    typeof v.id === "string" &&
    Number.isSafeInteger(v.version) &&
    (v.version as number) >= 0 &&
    typeof v.iv === "string" &&
    typeof v.data === "string"
  );
}

export function isGroupRecord(v: unknown): v is GroupRecord {
  return (
    isRecord(v) &&
    typeof v.name === "string" &&
    v.name.trim().length >= 1 &&
    v.name.trim().length <= MAX_GROUP_NAME &&
    typeof v.createdBy === "string" &&
    Array.isArray(v.months) &&
    v.months.length >= 1 &&
    v.months.length <= MAX_MONTHS &&
    v.months.every(
      (m) =>
        isRecord(m) &&
        isInt(m.year) &&
        m.year >= 2000 &&
        m.year <= 2100 &&
        isInt(m.month) &&
        m.month >= 1 &&
        m.month <= 12,
    ) &&
    isInt(v.minLength) &&
    isInt(v.maxLength) &&
    v.minLength >= LIMITS.minLength &&
    v.maxLength <= LIMITS.maxLength &&
    v.minLength <= v.maxLength
  );
}

/** A window key's first and last day, or null unless it's a valid trip of 3 to 21 days. */
export function parseWindowKey(k: string): { start: number; end: number } | null {
  if (!WINDOW_KEY.test(k)) return null;
  const [a, b] = k.split("..") as [string, string];
  const start = fromIso(a);
  const end = fromIso(b);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (toIso(start) !== a || toIso(end) !== b) return null;
  // Every window is a trip: suggested dates, proposals and votes alike.
  const length = end - start + 1;
  if (length < LIMITS.minLength || length > LIMITS.maxLength) return null;
  return { start, end };
}

export function sanitizeMember(v: unknown): MemberRecord | null {
  if (!isRecord(v)) return null;
  const { name, color, country, region, workWeek, allowance } = v;
  if (typeof name !== "string") return null;
  if (typeof country !== "string" || !/^[A-Za-z]{2}$/.test(country)) return null;
  if (!Array.isArray(workWeek) || workWeek.length !== 7 || !workWeek.every((d) => typeof d === "boolean")) {
    return null;
  }
  if (typeof allowance !== "number" || Number.isNaN(allowance)) return null;

  const days = (x: unknown): number[] => (Array.isArray(x) ? x.filter(isInt) : []);
  const proposals = (Array.isArray(v.proposals) ? v.proposals : []).filter(
    (k): k is WindowKey => typeof k === "string" && parseWindowKey(k) !== null,
  );
  const votes: Record<WindowKey, Vote> = {};
  if (isRecord(v.votes)) {
    for (const [k, vote] of Object.entries(v.votes)) {
      if ((vote === "yes" || vote === "maybe" || vote === "no") && parseWindowKey(k)) {
        votes[k as WindowKey] = vote;
      }
    }
  }

  return {
    name: name.slice(0, MAX_NAME),
    color: MEMBER_COLORS.find((c) => c === String(color).toLowerCase()) ?? (MEMBER_COLORS[0] as string),
    country,
    region: typeof region === "string" ? region : null,
    workWeek: workWeek as boolean[],
    customOff: days(v.customOff),
    blocked: days(v.blocked),
    allowance: Math.min(MAX_ALLOWANCE, Math.max(0, allowance)),
    proposals,
    votes,
  };
}
