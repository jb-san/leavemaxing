import "astro";

declare module "astro" {
  interface AstroClientDirectives {
    /** Hydrate right after the server-rendered island has painted. See src/directives/afterpaint.ts. */
    "client:afterpaint"?: boolean;
  }
}
