// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import afterPaintDirective from "./integrations/afterpaint.mjs";
import llms from "./integrations/llms.mjs";
import serviceWorker from "./integrations/service-worker.mjs";
import { inSitemap, isSeasonalYearUrl } from "./src/data/sitemap-config.ts";
import { BUILD_DATE } from "./src/lib/buildDate.ts";

export default defineConfig({
  site: "https://leavemaxxing.com",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    react(),
    afterPaintDirective(),
    sitemap({
      filter: inSitemap,
      serialize(item) {
        if (isSeasonalYearUrl(item.url)) item.lastmod = BUILD_DATE;
        return item;
      },
    }),
    serviceWorker(),
    llms(),
  ],
  vite: {
    plugins: [tailwindcss()],
    worker: { format: "es" },
  },
});
