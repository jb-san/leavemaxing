import { ensureDir } from "$std/fs/mod.ts";
import { join } from "$std/path/mod.ts";
import { copy } from "$std/fs/copy.ts";

const DIST_DIR = "./dist";
const BASE_URL = "https://leavemaxing.com";
const PORT = 8001;

const PAGES = [
  { path: "/", filename: "index.html" },
  { path: "/about", filename: "about/index.html" },
  { path: "/privacy-policy", filename: "privacy-policy/index.html" },
  { path: "/_404", filename: "404.html" },
];

async function buildFresh() {
  console.log("🔨 Building Fresh app...");
  const buildProcess = new Deno.Command("deno", {
    args: ["task", "build"],
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await buildProcess.output();
  if (code !== 0) {
    throw new Error("Build failed");
  }
  console.log("✅ Build complete");
}

async function startServer(): Promise<Deno.ChildProcess> {
  console.log(`🚀 Starting Fresh server on port ${PORT}...`);
  const serverProcess = new Deno.Command("deno", {
    args: ["run", "-A", "main.ts"],
    env: { PORT: PORT.toString() },
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  console.log("⏳ Waiting for server to be ready...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/`);
      if (response.ok) {
        console.log("✅ Server is ready");
        return serverProcess;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Server failed to start within timeout");
}

async function fetchPage(path: string, allowNotFound = false): Promise<string> {
  const url = `http://localhost:${PORT}${path}`;
  console.log(`📄 Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok && !(allowNotFound && response.status === 404)) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return await response.text();
}

async function cleanDist() {
  console.log("🧹 Cleaning dist directory...");
  try {
    await Deno.remove(DIST_DIR, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  await ensureDir(DIST_DIR);
}

async function exportPages() {
  console.log("📦 Exporting pages...");
  for (const page of PAGES) {
    const allowNotFound = page.path === "/_404";
    const html = await fetchPage(page.path, allowNotFound);
    const filePath = join(DIST_DIR, page.filename);
    await ensureDir(
      join(DIST_DIR, page.filename.split("/").slice(0, -1).join("/")),
    );
    await Deno.writeTextFile(filePath, html);
    console.log(`  ✓ ${page.filename}`);
  }
}

async function copyStaticAssets() {
  console.log("📁 Copying static assets...");
  await copy("./static", join(DIST_DIR, "/"), { overwrite: true });
  console.log("✅ Static assets copied");
}

async function copyFreshAssets() {
  console.log("📁 Copying Fresh build assets...");
  try {
    await copy("./_fresh", join(DIST_DIR, "/_fresh"), { overwrite: true });
    console.log("✅ Fresh assets copied");
  } catch (error) {
    console.log(
      "⚠️  No Fresh assets found (this is OK for static sites):",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function generateSitemap(): string {
  const urls = [
    { loc: BASE_URL, priority: "1.0" },
    { loc: `${BASE_URL}/about`, priority: "0.8" },
    { loc: `${BASE_URL}/privacy-policy`, priority: "0.5" },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${
    urls.map((url) =>
      `  <url>
    <loc>${url.loc}</loc>
    <changefreq>monthly</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    ).join("\n")
  }
</urlset>`;

  return sitemap;
}

function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
}

function generateHeadersFile(): string {
  return `# Cache hashed assets (Fresh island bundles and static assets with hashes)
/_fresh/*
  Cache-Control: public, max-age=31536000, immutable

/static/*
  Cache-Control: public, max-age=31536000, immutable

# Don't cache HTML pages
/*.html
  Cache-Control: public, max-age=0, must-revalidate

/
  Cache-Control: public, max-age=0, must-revalidate

# Security headers for all pages
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: interest-cohort=()
`;
}

async function generateSEOFiles() {
  console.log("🔍 Generating SEO files...");
  await Deno.writeTextFile(join(DIST_DIR, "sitemap.xml"), generateSitemap());
  await Deno.writeTextFile(join(DIST_DIR, "robots.txt"), generateRobotsTxt());
  console.log("✅ SEO files generated");
}

async function generateCloudflareConfig() {
  console.log("☁️  Generating Cloudflare Pages config...");
  await Deno.writeTextFile(join(DIST_DIR, "_headers"), generateHeadersFile());
  console.log("✅ Cloudflare config generated");
}

async function main() {
  let serverProcess: Deno.ChildProcess | null = null;

  try {
    await cleanDist();
    await buildFresh();
    serverProcess = await startServer();
    await exportPages();
    await copyStaticAssets();
    await copyFreshAssets();
    await generateSEOFiles();
    await generateCloudflareConfig();

    console.log("\n✨ Export complete! Static site is in ./dist\n");
  } catch (error) {
    console.error("❌ Export failed:", error);
    Deno.exit(1);
  } finally {
    if (serverProcess) {
      console.log("🛑 Stopping server...");
      serverProcess.kill("SIGTERM");
    }
  }
}

if (import.meta.main) {
  main();
}
