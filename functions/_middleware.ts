// Cloudflare Pages Functions middleware: redirect www.leavemaxxing.com to leavemaxxing.com.

interface Context {
  request: Request;
  next: () => Promise<Response>;
}

export const onRequest = async (context: Context): Promise<Response> => {
  const url = new URL(context.request.url);
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.replace(/^www\./, "");
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
};
