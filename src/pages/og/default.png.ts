import type { APIRoute } from "astro";
import { renderOg } from "~/lib/og";

export const GET: APIRoute = async () => {
  const png = await renderOg({ title: "Same leave.", subtitle: "Leave planner for 200+ countries" });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
