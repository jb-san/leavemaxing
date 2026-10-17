import type { Env } from "./group";

export { Group } from "./group";

const ROUTE = /^\/api\/together\/([A-Za-z0-9_-]{14})$/;

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/together/health") return new Response("ok");
    const groupId = ROUTE.exec(pathname)?.[1];
    if (groupId === undefined) return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    return env.GROUP.get(env.GROUP.idFromName(groupId)).fetch(request);
  },
} satisfies ExportedHandler<Env>;
