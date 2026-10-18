import { randomId } from "./protocol";

export interface InviteLink {
  groupId: string;
  key: string;
}

export interface PersonalLink extends InviteLink {
  memberId: string;
  secret: string;
  admin?: string;
}

const GROUP_ID_CHARS = 14;
const KEY_CHARS = 22;
const MEMBER_ID_CHARS = 8;
const SECRET_CHARS = 22;

export function parseFragment(hash: string): InviteLink | PersonalLink | null {
  let text = hash.replace(/^#/, "");
  try {
    text = decodeURIComponent(text);
  } catch {
    return null;
  }
  const parts = text
    .trim()
    .replace(/[^A-Za-z0-9_.-]+$/, "")
    .split(".");
  while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();

  const [groupId, key, memberId, secret, admin] = parts;
  if (groupId?.length !== GROUP_ID_CHARS || key?.length !== KEY_CHARS) return null;
  if (!parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))) return null;
  if (parts.length === 2) return { groupId, key };
  if (memberId?.length !== MEMBER_ID_CHARS || secret?.length !== SECRET_CHARS) return null;
  if (parts.length === 4) return { groupId, key, memberId, secret };
  if (parts.length === 5 && admin?.length === SECRET_CHARS) return { groupId, key, memberId, secret, admin };
  return null;
}

export function formatInvite(origin: string, l: InviteLink): string {
  return `${origin}/together/#${l.groupId}.${l.key}`;
}

export function formatPersonal(origin: string, l: PersonalLink): string {
  const tail = l.admin ? `.${l.admin}` : "";
  return `${origin}/together/#${l.groupId}.${l.key}.${l.memberId}.${l.secret}${tail}`;
}

export function newGroup(): InviteLink & { admin: string } {
  return { groupId: randomId(10), key: randomId(16), admin: randomId(16) };
}

export function newMember(): { memberId: string; secret: string } {
  return { memberId: randomId(6), secret: randomId(16) };
}
