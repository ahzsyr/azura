#!/usr/bin/env node
/**
 * Summarize Next.js client chunk sizes after `next build`.
 * Usage: npm run perf:bundle
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const nextDir = path.join(root, ".next");
const chunksDir = path.join(nextDir, "static", "chunks");
const outFile = path.join(root, "performance-reports", "bundle-report.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function formatKb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

function main() {
  if (!fs.existsSync(nextDir)) {
    console.error("No .next directory — run `npm run build` first.");
    process.exit(1);
  }

  const chunkFiles = walkFiles(chunksDir).filter((f) => f.endsWith(".js"));
  const chunks = chunkFiles
    .map((filePath) => {
      const stat = fs.statSync(filePath);
      return {
        file: path.relative(root, filePath).replace(/\\/g, "/"),
        bytes: stat.size,
        kb: formatKb(stat.size),
      };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const totalJsBytes = chunks.reduce((sum, c) => sum + c.bytes, 0);

  let appBuildManifest = null;
  const manifestPath = path.join(nextDir, "app-build-manifest.json");
  if (fs.existsSync(manifestPath)) {
    appBuildManifest = readJson(manifestPath);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalJsKb: formatKb(totalJsBytes),
    chunkCount: chunks.length,
    topChunks: chunks.slice(0, 25),
    routeEntrypoints: appBuildManifest?.pages
      ? Object.keys(appBuildManifest.pages).slice(0, 40)
      : [],
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log("Bundle report written:", path.relative(root, outFile));
  console.log(`Total JS (chunks): ${report.totalJsKb} KB across ${report.chunkCount} files`);
  console.log("Top chunks:");
  for (const chunk of report.topChunks.slice(0, 10)) {
    console.log(`  ${chunk.kb} KB  ${chunk.file}`);
  }
}

main();
