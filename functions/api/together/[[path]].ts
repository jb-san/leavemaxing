// Cloudflare Pages Function: hand Together's WebSocket requests to the Together worker.
// A service binding reaches the worker without a route on the zone, and works on preview deploys too.

interface Context {
  request: Request;
  env: { TOGETHER: { fetch: (request: Request) => Promise<Response> } };
}

export const onRequest = (context: Context): Promise<Response> => context.env.TOGETHER.fetch(context.request);
