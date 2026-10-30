#!/usr/bin/env node
/**
 * Build a standalone bundle for Hostinger upload (avoids 60+ worker next build on shared hosting).
 * Run locally: npm run build:hostinger:standalone
 */
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  OUTPUT_STANDALONE: "1",
};

function run(label, command, args) {
  console.log(`[hostinger-standalone] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("hostinger build", "node", [
  "--max-old-space-size=4096",
  "scripts/deploy/hostinger-build.mjs",
]);
run("assemble standalone", "node", ["scripts/deploy/assemble-standalone.mjs"]);

console.log("\n[hostinger-standalone] Bundle ready.");
console.log("[hostinger-standalone] Deploy order (prevents ChunkLoadError / 520 windows):");
console.log("  1. Upload/sync .next/static (content-hashed) WITHOUT deleting prior hashes yet");
console.log("  2. ORIGIN_URL=https://your-domain npm run verify:origin-assets");
console.log("  3. Swap/restart app so HTML matches this build");
console.log("  4. Purge Cloudflare cache only after step 2 passes");
console.log("  5. Optionally prune old /_next/static hashes after traffic is stable");
console.log("Start command: node scripts/deploy/hostinger-start.mjs");
