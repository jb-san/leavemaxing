// Generates dist/sw.js after the build: precaches the app shell and caches pages and
// holiday data as they're visited, so the planner keeps working offline.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SHELL_PAGES = ["/", "/offline/", "/plans/", "/compare/", "/about/", "/privacy-policy/"];
const SHELL_FILES = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** @returns {import("astro").AstroIntegration} */
export default function serviceWorker() {
  return {
    name: "leavemaxxing-sw",
    hooks: {
      "astro:build:done": ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const assets = walk(join(out, "_astro"))
          .map((p) => `/${relative(out, p).split("\\").join("/")}`)
          // Latin fonts only; other subsets load on demand.
          .filter((p) => !/vietnamese|latin-ext/.test(p));
        const precache = [...SHELL_PAGES, ...SHELL_FILES, ...assets];
        const hash = createHash("sha1");
        for (const p of precache) {
          const file = p.endsWith("/") ? join(out, p, "index.html") : join(out, p);
          try {
            hash.update(readFileSync(file));
          } catch {
            hash.update(p);
          }
        }
        const version = hash.digest("hex").slice(0, 10);
        writeFileSync(join(out, "sw.js"), template(version, precache));
        logger.info(`sw.js written (version ${version}, ${precache.length} files precached)`);
      },
    },
  };
}

function template(version, precache) {
  return `// Generated at build time by integrations/service-worker.mjs
const VERSION = ${JSON.stringify(version)};
const SHELL = "lm-shell-" + VERSION;
const PAGES = "lm-pages-v1";
const DATA = "lm-data-v1";
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lm-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first, fall back to the last copy, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy)).then(() => trim(PAGES, 60));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/offline/")) || Response.error()),
    );
    return;
  }

  // Holiday data: serve the cached copy straight away and refresh it in the background.
  if (url.pathname.startsWith("/data/")) {
    event.respondWith(
      caches.open(DATA).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).then(() => trim(DATA, 120));
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
    return;
  }

  // Built assets: cache first.
  if (url.pathname.startsWith("/_astro/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok && url.pathname.startsWith("/_astro/")) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
`;
}
