import { DurableObject } from "cloudflare:workers";
import type { Envelope, ServerMsg } from "../../src/lib/together/protocol";
import {
  applyPut,
  applyRemove,
  emptyRoom,
  expiresAt,
  markDeleted,
  parseClientMsg,
  type RateState,
  type Room,
  rate,
  snapshot,
} from "./rules";

export interface Env {
  GROUP: DurableObjectNamespace<Group>;
}

const GONE = 4410;

function send(ws: WebSocket, msg: ServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // The socket closed while we were working.
  }
}

async function load(storage: DurableObjectStorage): Promise<Room> {
  const all = await storage.list();
  if (all.has("deleted")) return markDeleted();
  const room = emptyRoom();
  for (const [key, value] of all) {
    if (key === "group" || key.startsWith("member:")) room.envs.set(key, value as Envelope);
    else if (key.startsWith("hash:")) room.hashes.set(key.slice(5), value as string);
    else if (key.startsWith("tomb:")) room.removed.add(key.slice(5));
    else if (key === "admin") room.adminHash = value as string;
    else if (key === "until") room.until = value as string;
    else if (key === "lastWrite") room.lastWrite = value as number;
  }
  return room;
}

function stored(room: Room, key: string): unknown {
  if (key === "group" || key.startsWith("member:")) return room.envs.get(key);
  if (key.startsWith("hash:")) return room.hashes.get(key.slice(5));
  if (key.startsWith("tomb:")) return room.removed.has(key.slice(5)) ? true : undefined;
  if (key === "admin") return room.adminHash ?? undefined;
  if (key === "until") return room.until ?? undefined;
  if (key === "lastWrite") return room.lastWrite;
  return undefined;
}

export class Group extends DurableObject<Env> {
  private room: Room = emptyRoom();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.room = await load(ctx.storage);
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    send(server, snapshot(this.room));
    if (this.room.deleted) send(server, { t: "error", code: "gone" });
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const now = Date.now();
    const limit = rate(ws.deserializeAttachment() as RateState | null, now);
    ws.serializeAttachment(limit.state);
    if (!limit.ok) return send(ws, { t: "error", code: "rate" });

    const msg = typeof message === "string" ? parseClientMsg(message) : null;
    if (msg === null) return send(ws, { t: "error", code: "bad" });
    const outcome =
      msg.t === "put" ? await applyPut(this.room, msg, now) : await applyRemove(this.room, msg, now);
    if (!outcome.ok) return send(ws, outcome.reply);

    await this.persist(outcome.dirty);
    const at = expiresAt(this.room);
    if (at !== null) await this.ctx.storage.setAlarm(at);
    for (const socket of this.ctx.getWebSockets()) send(socket, outcome.broadcast);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code);
    } catch {
      // Already closed.
    }
  }

  override async alarm(): Promise<void> {
    const at = expiresAt(this.room);
    if (at === null) return;
    if (Date.now() < at) {
      await this.ctx.storage.setAlarm(at);
      return;
    }
    // Both writes are queued before anything is awaited, so workerd commits them together: an
    // eviction can't fall between them and leave an empty, undeleted group for an invite to re-create.
    // The marker goes last, so the deleteAll doesn't take it with everything else.
    const cleared = this.ctx.storage.deleteAll();
    const marked = this.ctx.storage.put("deleted", true);
    await Promise.all([cleared, marked]);
    this.room = markDeleted();
    for (const ws of this.ctx.getWebSockets()) ws.close(GONE, "gone");
  }

  private async persist(keys: string[]): Promise<void> {
    const puts: Record<string, unknown> = {};
    const deletes: string[] = [];
    for (const key of keys) {
      const value = stored(this.room, key);
      if (value === undefined) deletes.push(key);
      else puts[key] = value;
    }
    if (Object.keys(puts).length > 0) await this.ctx.storage.put(puts);
    if (deletes.length > 0) await this.ctx.storage.delete(deletes);
  }
}
