import { b64url, type Envelope, fromB64url } from "./protocol";

export function importKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromB64url(key), "AES-GCM", false, ["encrypt", "decrypt"]);
}

function aad(kind: string, id: string, version: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${kind}:${id}:${version}`);
}

export async function seal(
  key: CryptoKey,
  kind: Envelope["kind"],
  id: string,
  version: number,
  record: unknown,
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(kind, id, version) },
    key,
    new TextEncoder().encode(JSON.stringify(record)),
  );
  return { kind, id, version, iv: b64url(iv), data: b64url(new Uint8Array(data)) };
}

export async function open(key: CryptoKey, env: Envelope): Promise<unknown | null> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(env.iv), additionalData: aad(env.kind, env.id, env.version) },
      key,
      fromB64url(env.data),
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

export function nextVersion(previous: number, now: number = Date.now()): number {
  return Math.max(previous + 1, now);
}
