// Cloudflare Pages Functions middleware:
// - redirect www.leavemaxxing.com to leavemaxxing.com;
// - give shared plan links (`/se/2027/?d=25`) a link preview made for them. Crawlers don't run
//   JavaScript, so the og: tags have to be right in the HTML. The cards are PNGs prepared at build
//   time (src/pages/og/s/); this only rewrites a few tags as the page streams through, so it stays
//   well within the free plan's CPU limit. See src/lib/shareMeta.ts.

import { escapeAttribute, parseShareRequest, type ShareCard, type ShareManifest } from "../src/lib/shareMeta";

interface Context {
  request: Request;
  env: { ASSETS: { fetch: (input: Request | string) => Promise<Response> } };
  next: () => Promise<Response>;
}

/** The part of the Workers runtime's HTMLRewriter used here. */
interface Element {
  setAttribute(name: string, value: string): void;
  after(content: string, options: { html: boolean }): void;
}
declare const HTMLRewriter: {
  new (): {
    on(selector: string, handlers: { element(element: Element): void }): InstanceType<typeof HTMLRewriter>;
    transform(response: Response): Response;
  };
};

/**
 * og:url is the share link itself, so Facebook and LinkedIn, which re-read og:url, show this card
 * rather than the page's. rel=canonical stays the clean page URL for search engines, and pages
 * without a card keep og:url clean too.
 */
const OG_URL_IS_SHARE_LINK = true;

async function shareCard(
  context: Context,
  manifestPath: string,
  url: URL,
  days: number,
): Promise<ShareCard | null> {
  try {
    const res = await context.env.ASSETS.fetch(new URL(manifestPath, url).toString());
    if (!res.ok) return null;
    const manifest = (await res.json()) as ShareManifest;
    if (manifest.path !== url.pathname) return null;
    return manifest.cards[String(days)] ?? null;
  } catch {
    return null;
  }
}

function withCard(res: Response, card: ShareCard, url: URL, shareUrl: string): Response {
  const image = new URL(card.image, url).toString();
  const set = (value: string) => ({ element: (el: Element) => el.setAttribute("content", value) });
  let rewriter = new HTMLRewriter()
    .on('meta[property="og:title"]', set(card.title))
    .on('meta[property="og:description"]', set(card.description))
    .on('meta[property="og:image"]', {
      element(el) {
        el.setAttribute("content", image);
        el.after(`<meta property="og:image:alt" content="${escapeAttribute(card.alt)}">`, { html: true });
      },
    })
    .on('meta[name="twitter:card"]', {
      element(el) {
        el.after(
          `<meta name="twitter:title" content="${escapeAttribute(card.title)}">` +
            `<meta name="twitter:description" content="${escapeAttribute(card.description)}">` +
            `<meta name="twitter:image" content="${escapeAttribute(image)}">`,
          { html: true },
        );
      },
    });
  if (OG_URL_IS_SHARE_LINK) rewriter = rewriter.on('meta[property="og:url"]', set(shareUrl));
  return rewriter.transform(res);
}

export const onRequest = async (context: Context): Promise<Response> => {
  const url = new URL(context.request.url);
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.replace(/^www\./, "");
    return Response.redirect(url.toString(), 301);
  }
  const method = context.request.method;
  const share = method === "GET" || method === "HEAD" ? parseShareRequest(url) : null;
  if (!share) return context.next();

  const [res, card] = await Promise.all([
    context.next(),
    shareCard(context, share.manifest, url, share.days),
  ]);
  if (!card || !res.ok || !(res.headers.get("Content-Type") ?? "").includes("text/html")) return res;
  return withCard(res, card, url, share.shareUrl);
};
