// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import serviceWorker from "./integrations/service-worker.mjs";

export default defineConfig({
  site: "https://leavemaxxing.com",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    react(),
    sitemap({ filter: (page) => !page.includes("/plans/") && !page.includes("/offline/") }),
    serviceWorker(),
  ],
  vite: {
    plugins: [tailwindcss()],
    worker: { format: "es" },
  },
});
