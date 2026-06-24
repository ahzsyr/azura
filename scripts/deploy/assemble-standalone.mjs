#!/usr/bin/env node
/**
 * After `next build` with output: "standalone", copy static assets into the bundle.
 * Run locally, then upload `.next/standalone` + start with node server.js on Hostinger.
 */
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");

if (!existsSync(standaloneDir)) {
  console.error("Missing .next/standalone — run npm run build first with output: standalone");
  process.exit(1);
}

const standaloneNext = join(standaloneDir, ".next");
if (existsSync(staticDir)) {
  cpSync(staticDir, join(standaloneNext, "static"), { recursive: true });
  console.log("Copied .next/static");
}

if (existsSync(publicDir)) {
  cpSync(publicDir, join(standaloneDir, "public"), { recursive: true });
  console.log("Copied public/");
}

console.log("\nStandalone bundle ready:");
console.log(`  ${standaloneDir}`);
console.log("Hostinger start command: node server.js (cwd = standalone folder)");
