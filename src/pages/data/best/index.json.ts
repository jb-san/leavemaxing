import type { APIRoute } from "astro";
import { bestDataIndex } from "~/lib/bestData";

/** Every /data/best/{cc}/{year}.json file this build publishes. Format: docs/data-api.md. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(bestDataIndex()), {
    headers: { "Content-Type": "application/json" },
  });
