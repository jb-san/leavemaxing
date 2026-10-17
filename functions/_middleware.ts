// Cloudflare Pages Functions middleware
// Redirects www.leavemaxxing.com to leavemaxxing.com

interface EventContext<
  Env = unknown,
  P extends string = string,
  Data = Record<string, unknown>,
> {
  request: Request;
  env: Env;
  params: Record<P, string>;
  data: Data;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
}

type PagesFunction<
  Env = unknown,
  P extends string = string,
  Data = Record<string, unknown>,
> = (
  context: EventContext<Env, P, Data>,
) => Response | Promise<Response>;

export const onRequest: PagesFunction = (context) => {
  const url = new URL(context.request.url);

  // Redirect www to apex domain
  if (url.hostname.startsWith("www.")) {
    const newUrl = new URL(context.request.url);
    newUrl.hostname = newUrl.hostname.replace(/^www\./, "");
    return Response.redirect(newUrl.toString(), 301);
  }

  // Continue to next middleware/page
  return context.next();
};
