// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import serviceWorker from "./integrations/service-worker.mjs";
import { isSeasonalYearUrl, shouldIndexPage } from "./src/data/sitemap-config.ts";
import { BUILD_DATE } from "./src/lib/buildDate.ts";

export default defineConfig({
  site: "https://leavemaxxing.com",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        if (page.includes("/plans/") || page.includes("/offline/")) return false;
        return shouldIndexPage(page);
      },
      serialize(item) {
        if (isSeasonalYearUrl(item.url)) item.lastmod = BUILD_DATE;
        return item;
      },
    }),
    serviceWorker(),
  ],
  vite: {
    plugins: [tailwindcss()],
    worker: { format: "es" },
  },
});
