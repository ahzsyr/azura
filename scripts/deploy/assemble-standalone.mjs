#!/usr/bin/env node
/**
 * After `next build` with output: "standalone", copy static assets into the bundle.
 * Run locally, then upload `.next/standalone` + start with node server.js on Hostinger.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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

const standaloneChunks = join(standaloneNext, "static", "chunks");
if (!existsSync(standaloneChunks)) {
  console.error(
    "ERROR: .next/static/chunks missing in standalone bundle — upload would cause /_next/static 404s.",
  );
  process.exit(1);
}
const chunkCount = readdirSync(standaloneChunks).length;
if (chunkCount < 10) {
  console.error(
    `ERROR: only ${chunkCount} chunk files in standalone bundle — build output looks incomplete.`,
  );
  process.exit(1);
}
console.log(`Verified ${chunkCount} files in .next/static/chunks`);

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

const deployScripts = [
  "prisma-migrate-deploy.mjs",
  "hostinger-start.mjs",
  "load-database-url.mjs",
  "resolve-prisma-schema.mjs",
  "run-prisma.mjs",
  "ensure-prisma-engines-executable.mjs",
];
mkdirSync(join(standaloneDir, "scripts", "deploy"), { recursive: true });
for (const name of deployScripts) {
  const src = join(root, "scripts", "deploy", name);
  if (!existsSync(src)) continue;
  cpSync(src, join(standaloneDir, "scripts", "deploy", name));
  console.log(`Copied scripts/deploy/${name}`);
}

const prismaDir = join(root, "prisma");
if (existsSync(prismaDir)) {
  cpSync(prismaDir, join(standaloneDir, "prisma"), { recursive: true });
  console.log("Copied prisma/ (required for migrate deploy on start)");
}

console.log("\nStandalone bundle ready:");
console.log(`  ${standaloneDir}`);
console.log(
  "Hostinger start: node scripts/deploy/hostinger-start.mjs  (migrates DB, then starts server.js)",
);
console.log(
  "  or: node scripts/deploy/ensure-uploads-symlink.mjs && node server.js (set LOCAL_PUBLIC_DIR; run migrate separately)",
);
