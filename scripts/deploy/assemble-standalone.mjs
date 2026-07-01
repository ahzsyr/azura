#!/usr/bin/env node
/**
 * After `next build` with output: "standalone", copy static assets into the bundle.
 * Run locally, then upload `.next/standalone` + start with node server.js on Hostinger.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");
const symlinkScript = join(root, "scripts", "deploy", "ensure-uploads-symlink.mjs");

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

if (existsSync(symlinkScript)) {
  const dest = join(standaloneDir, "scripts", "deploy", "ensure-uploads-symlink.mjs");
  const pathsModule = join(root, "scripts", "deploy", "local-persistence-paths.mjs");
  mkdirSync(join(standaloneDir, "scripts", "deploy"), { recursive: true });
  cpSync(symlinkScript, dest);
  console.log("Copied scripts/deploy/ensure-uploads-symlink.mjs");
  if (existsSync(pathsModule)) {
    cpSync(pathsModule, join(standaloneDir, "scripts", "deploy", "local-persistence-paths.mjs"));
    console.log("Copied scripts/deploy/local-persistence-paths.mjs");
  }
}

console.log("\nStandalone bundle ready:");
console.log(`  ${standaloneDir}`);
console.log(
  "Hostinger start: node scripts/deploy/ensure-uploads-symlink.mjs && node server.js (set LOCAL_PUBLIC_DIR)",
);
