const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve(__dirname, "../dist-chrome");
const srcDir = path.resolve(__dirname, "../src");

console.log("Cleaning dist-chrome...");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log("Building background script...");
try {
  execSync(
    `npx -y esbuild "${path.join(srcDir, "background.chrome.ts")}" --bundle --outfile="${path.join(distDir, "background.chrome.js")}" --platform=browser --format=esm --minify`,
    { stdio: "inherit" },
  );
} catch (_e) {
  console.error("Failed to build background script");
  process.exit(1);
}

console.log("Building content script...");
try {
  execSync(
    `npx -y esbuild "${path.join(srcDir, "content-script.ts")}" --bundle --outfile="${path.join(distDir, "content-script.js")}" --platform=browser --minify`,
    { stdio: "inherit" },
  );
} catch (_e) {
  console.error("Failed to build content script");
  process.exit(1);
}

console.log("Copying assets...");
const assetDist = path.join(distDir, "assets");
if (!fs.existsSync(assetDist)) fs.mkdirSync(assetDist);
fs.readdirSync(path.join(srcDir, "assets")).forEach((file) => {
  fs.copyFileSync(
    path.join(srcDir, "assets", file),
    path.join(assetDist, file),
  );
});

console.log("Generating manifest.json...");
const manifestPath = path.join(srcDir, "manifest.chrome.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Sync version with package.json
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"),
);
manifest.version = pkg.version;

// Correct paths for the bundled extension
manifest.background.service_worker = "background.chrome.js";
manifest.content_scripts[0].js = ["content-script.js"];

// Ensure all required fields are present
if (!manifest.manifest_version) manifest.manifest_version = 3;

fs.writeFileSync(
  path.join(distDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);

console.log("✨ Chrome build complete with esbuild!");
