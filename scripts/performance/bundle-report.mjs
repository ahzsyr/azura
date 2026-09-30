#!/usr/bin/env node
/**
 * Summarize Next.js client chunk sizes after `next build`.
 * Usage: npm run perf:bundle
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

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

function collectChunkRefs(value, refs = []) {
  if (!value) return refs;
  if (typeof value === "string") {
    if (value.endsWith(".js")) refs.push(value);
    return refs;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectChunkRefs(item, refs);
    return refs;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectChunkRefs(item, refs);
  }
  return refs;
}

function normalizeChunkPath(ref) {
  return ref.startsWith(".next/") ? ref : `.next/${ref.replace(/^\/+/, "")}`;
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
      const contents = fs.readFileSync(filePath);
      return {
        file: path.relative(root, filePath).replace(/\\/g, "/"),
        bytes: stat.size,
        kb: formatKb(stat.size),
        gzipBytes: zlib.gzipSync(contents).length,
        gzipKb: formatKb(zlib.gzipSync(contents).length),
      };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const totalJsBytes = chunks.reduce((sum, c) => sum + c.bytes, 0);
  const totalGzipBytes = chunks.reduce((sum, c) => sum + c.gzipBytes, 0);
  const chunkByFile = new Map(chunks.map((chunk) => [chunk.file, chunk]));

  let appBuildManifest = null;
  const manifestPath = path.join(nextDir, "app-build-manifest.json");
  if (fs.existsSync(manifestPath)) {
    appBuildManifest = readJson(manifestPath);
  }

  const routeEntries = appBuildManifest?.pages
    ? Object.entries(appBuildManifest.pages)
    : [];
  const routeBundles = routeEntries
    .map(([route, value]) => {
      const files = [...new Set(collectChunkRefs(value).map(normalizeChunkPath))];
      const routeChunks = files
        .map((file) => chunkByFile.get(file))
        .filter(Boolean)
        .sort((a, b) => b.bytes - a.bytes);
      return {
        route,
        isAdmin: route.startsWith("/admin") || route.includes("/admin/"),
        files,
        totalKb: formatKb(routeChunks.reduce((sum, chunk) => sum + chunk.bytes, 0)),
        totalGzipKb: formatKb(routeChunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0)),
        topChunks: routeChunks.slice(0, 10),
      };
    })
    .sort((a, b) => b.totalKb - a.totalKb);

  const routeUseCount = new Map();
  for (const route of routeBundles) {
    for (const file of route.files) {
      routeUseCount.set(file, (routeUseCount.get(file) ?? 0) + 1);
    }
  }
  const sharedChunks = chunks
    .filter((chunk) => (routeUseCount.get(chunk.file) ?? 0) > 1)
    .map((chunk) => ({ ...chunk, routeCount: routeUseCount.get(chunk.file) }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 25);

  const report = {
    generatedAt: new Date().toISOString(),
    totalJsKb: formatKb(totalJsBytes),
    totalJsGzipKb: formatKb(totalGzipBytes),
    chunkCount: chunks.length,
    topChunks: chunks.slice(0, 25),
    sharedChunks,
    routeEntrypoints: routeBundles.map((route) => route.route).slice(0, 80),
    routeBundles,
    storefrontRouteBundles: routeBundles.filter((route) => !route.isAdmin),
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log("Bundle report written:", path.relative(root, outFile));
  console.log(
    `Total JS (chunks): ${report.totalJsKb} KB / ${report.totalJsGzipKb} KB gzip across ${report.chunkCount} files`,
  );
  console.log("Top chunks:");
  for (const chunk of report.topChunks.slice(0, 10)) {
    console.log(`  ${chunk.kb} KB  ${chunk.file}`);
  }
}

main();
