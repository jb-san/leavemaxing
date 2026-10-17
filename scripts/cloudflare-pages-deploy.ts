#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const PROJECT_NAME = "leavemaxing";
const DIST_DIR = "./dist";

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
  console.error(
    "Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set",
  );
  Deno.exit(1);
}

const branch = Deno.args[0] || "main";
const commitHash = Deno.args[1];

interface UploadManifest {
  [key: string]: string;
}

async function getFileHash(path: string): Promise<string> {
  const data = await Deno.readFile(path);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function collectFiles(
  dir: string,
  baseDir = dir,
): Promise<UploadManifest> {
  const manifest: UploadManifest = {};

  for await (const entry of Deno.readDir(dir)) {
    const fullPath = `${dir}/${entry.name}`;
    const relativePath = fullPath.substring(baseDir.length + 1);

    if (entry.isDirectory) {
      Object.assign(manifest, await collectFiles(fullPath, baseDir));
    } else if (entry.isFile) {
      const hash = await getFileHash(fullPath);
      manifest[relativePath] = hash;
    }
  }

  return manifest;
}

async function uploadFile(url: string, filePath: string): Promise<void> {
  const data = await Deno.readFile(filePath);
  const response = await fetch(url, {
    method: "PUT",
    body: data,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${filePath}: ${response.statusText}`);
  }
}

async function deployToCloudflare() {
  console.log(`🚀 Deploying ${PROJECT_NAME} to Cloudflare Pages...`);
  console.log(`   Branch: ${branch}`);
  if (commitHash) {
    console.log(`   Commit: ${commitHash}`);
  }

  // Step 0: Verify project exists
  console.log("\n🔍 Verifying project exists...");
  const projectUrl =
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`;
  const projectResponse = await fetch(projectUrl, {
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });

  if (!projectResponse.ok) {
    const error = await projectResponse.json();
    console.error(
      "❌ Failed to verify project:",
      JSON.stringify(error, null, 2),
    );
    console.error(`\nProject URL: ${projectUrl}`);
    console.error(`HTTP Status: ${projectResponse.status}`);
    Deno.exit(1);
  }

  console.log(`   ✅ Project ${PROJECT_NAME} exists`);

  // Step 1: Collect all files and their hashes
  console.log("\n📦 Collecting files...");
  const manifest = await collectFiles(DIST_DIR);
  const fileCount = Object.keys(manifest).length;
  console.log(`   Found ${fileCount} files`);

  // Step 2: Create deployment
  console.log("\n🔄 Creating deployment...");
  const createUrl =
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`;

  const deploymentPayload: {
    branch?: string;
    manifest: UploadManifest;
    commit_hash?: string;
  } = {
    manifest,
  };

  if (branch) deploymentPayload.branch = branch;
  if (commitHash) deploymentPayload.commit_hash = commitHash;

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deploymentPayload),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error("❌ Failed to create deployment:", error);
    Deno.exit(1);
  }

  const deployment = await createResponse.json();
  const deploymentId = deployment.result.id;
  const uploadUrls = deployment.result.upload_urls || {};

  console.log(`   Deployment ID: ${deploymentId}`);
  console.log(`   Files to upload: ${Object.keys(uploadUrls).length}`);

  // Step 3: Upload files
  if (Object.keys(uploadUrls).length > 0) {
    console.log("\n📤 Uploading files...");
    let uploaded = 0;

    for (const [filePath, uploadUrl] of Object.entries(uploadUrls)) {
      const fullPath = `${DIST_DIR}/${filePath}`;
      if (typeof uploadUrl === "string") {
        await uploadFile(uploadUrl, fullPath);
      }
      uploaded++;
      if (uploaded % 10 === 0 || uploaded === Object.keys(uploadUrls).length) {
        console.log(
          `   Uploaded ${uploaded}/${Object.keys(uploadUrls).length} files...`,
        );
      }
    }
  }

  // Step 4: Finalize deployment
  console.log("\n✅ Finalizing deployment...");
  const finalizeUrl =
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments/${deploymentId}/finalize`;

  const finalizeResponse = await fetch(finalizeUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });

  if (!finalizeResponse.ok) {
    const error = await finalizeResponse.text();
    console.error("❌ Failed to finalize deployment:", error);
    Deno.exit(1);
  }

  const finalResult = await finalizeResponse.json();
  const previewUrl = finalResult.result.url;

  console.log("\n🎉 Deployment successful!");
  console.log(`   Preview URL: ${previewUrl}`);
  console.log(`   Deployment ID: ${deploymentId}`);

  return previewUrl;
}

if (import.meta.main) {
  try {
    await deployToCloudflare();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Deployment failed:", message);
    Deno.exit(1);
  }
}
