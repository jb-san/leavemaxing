import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4322", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "pnpm astro preview --port 4322 --ignore-lock",
      url: "http://localhost:4322/",
      reuseExistingServer: !process.env.CI,
    },
    {
      // The built site with its Pages Functions, for link previews (tests/e2e/share.spec.ts).
      command: "pnpm exec wrangler pages dev dist --port 8788",
      url: "http://localhost:8788/robots.txt",
      reuseExistingServer: !process.env.CI,
      env: { WRANGLER_SEND_METRICS: "false" },
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
      timeout: 120_000,
    },
    {
      // The Together worker. SIGTERM lets wrangler stop workerd, which a hard kill would leave holding the port.
      command: "pnpm worker:dev",
      url: "http://localhost:8787/api/together/health",
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
      timeout: 120_000,
    },
  ],
});
