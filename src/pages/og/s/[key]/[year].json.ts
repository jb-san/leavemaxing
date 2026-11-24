import type { APIRoute } from "astro";
import { shareManifest, shareTargets } from "~/data/shareCards";

/** The prepared link previews for one plan page, read by functions/_middleware.ts. */
export function getStaticPaths() {
  return shareTargets().map((target) => ({
    params: { key: target.key, year: String(target.year) },
    props: { target },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(shareManifest(props.target)), {
    headers: { "Content-Type": "application/json" },
  });
