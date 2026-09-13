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

console.log("\n[hostinger-standalone] Upload .next/standalone/ to Hostinger and start with: node server.js");
