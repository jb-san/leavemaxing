// Registers the `client:afterpaint` hydration directive (src/directives/afterpaint.ts).

/** @returns {import("astro").AstroIntegration} */
export default function afterPaintDirective() {
  return {
    name: "leavemaxxing-afterpaint",
    hooks: {
      "astro:config:setup": ({ addClientDirective }) => {
        addClientDirective({
          name: "afterpaint",
          entrypoint: new URL("../src/directives/afterpaint.ts", import.meta.url),
        });
      },
    },
  };
}
