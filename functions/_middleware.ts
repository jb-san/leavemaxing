// Cloudflare Pages Functions middleware
// Redirects www.leavemaxxing.com to leavemaxxing.com

export const onRequest: PagesFunction = async (context) => {
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
