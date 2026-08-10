#!/usr/bin/env node
/**
 * Copy domain prisma files from mysql to postgresql folder after manual postgres edits.
 * Run: node scripts/prisma/sync-schema-variants.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mysqlDir = path.join(root, "prisma", "schema", "mysql");
const pgDir = path.join(root, "prisma", "schema", "postgresql");

const SKIP = new Set(["schema.prisma"]);

for (const name of fs.readdirSync(mysqlDir)) {
  if (!name.endsWith(".prisma") || SKIP.has(name)) continue;
  const src = path.join(mysqlDir, name);
  const dest = path.join(pgDir, name);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log(`[sync-schema] copied ${name} → postgresql/`);
  }
}

console.log("[sync-schema] done (existing postgresql domain files left unchanged)");
