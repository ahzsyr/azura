#!/usr/bin/env node
/**
 * Build database/mysql/import-blank-full.sql — current Prisma MySQL schema + extras + blank seed.
 *
 * Usage: node scripts/database/assemble-mysql-import-blank-full.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const ROOT = process.cwd();
const PRISMA_CLI = join(ROOT, "node_modules", "prisma", "build", "index.js");
const MYSQL_DIR = join(ROOT, "database", "mysql");
const RAW_SCHEMA = join(MYSQL_DIR, "01-schema.raw.sql");
const EXTRAS = join(MYSQL_DIR, "mysql-schema-extras.sql");
const SEED_BLANK = join(MYSQL_DIR, "02-seed-blank.sql");
const OUT_FULL = join(MYSQL_DIR, "import-blank-full.sql");
const OUT_SCHEMA = join(MYSQL_DIR, "01-schema.sql");
const OUT_LEGACY = join(MYSQL_DIR, "import-blank.sql");

function runPrismaDiff() {
  if (!existsSync(PRISMA_CLI)) {
    throw new Error("Prisma CLI not found — run npm install first");
  }
  mkdirSync(MYSQL_DIR, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [
      PRISMA_CLI,
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema/mysql",
      "--script",
    ],
    { cwd: ROOT, encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || result.error);
    throw new Error("prisma migrate diff failed");
  }
  writeFileSync(RAW_SCHEMA, result.stdout);
}

function wrapMysqlSchema(raw) {
  return [
    "-- AZURA — MySQL 8+ schema (generated from prisma/schema/mysql/)",
    "-- Regenerate: node scripts/database/assemble-mysql-import-blank-full.mjs",
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
    raw.trim(),
    "",
    "SET FOREIGN_KEY_CHECKS = 1;",
    "",
  ].join("\n");
}

function stripSeedPreamble(seed) {
  return seed
    .replace(/^-- AZURA seed data: blank\r?\n/, "")
    .replace(/^-- Import AFTER 01-schema\.sql \(phpMyAdmin → Import\)\r?\n\r?\n/, "")
    .replace(/^SET NAMES utf8mb4;\r?\n/, "")
    .replace(/^SET FOREIGN_KEY_CHECKS = 0;\r?\n\r?\n/, "")
    .replace(/\r?\nSET FOREIGN_KEY_CHECKS = 1;\s*$/, "")
    .trim();
}

function listMigrationNames() {
  const dir = join(ROOT, "prisma", "migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function main() {
  console.log("Generating MySQL schema from prisma/schema/mysql…");
  runPrismaDiff();

  const rawSchema = readFileSync(RAW_SCHEMA, "utf-8");
  const schemaWrapped = wrapMysqlSchema(rawSchema);
  writeFileSync(OUT_SCHEMA, schemaWrapped);
  console.log(`Wrote ${OUT_SCHEMA}`);

  const extras = existsSync(EXTRAS) ? readFileSync(EXTRAS, "utf-8").trim() : "";
  const seed = existsSync(SEED_BLANK)
    ? stripSeedPreamble(readFileSync(SEED_BLANK, "utf-8"))
    : "";

  const migrationList = listMigrationNames().join(", ");

  const full = [
    "-- AZURA one-file MySQL import: blank (full schema + seed)",
    "-- phpMyAdmin / Hostinger: create empty database (utf8mb4_unicode_ci) → Import this file",
    "--",
    "-- Includes:",
    "--   • Final schema from prisma/schema/mysql (all Prisma migrations applied)",
    `--   • Prisma migrations folded: ${migrationList}`,
    "--   • mysql-schema-extras.sql (e.g. SearchDocument FULLTEXT)",
    "--   • Blank factory seed (no admin user — complete /setup on first visit)",
    "--",
    "-- After import: set DATABASE_URL=mysql://… and MEDIA_STORAGE=local for Hostinger disk uploads.",
    "-- Set SKIP_DB_MIGRATE=1 on deploy if tables already exist from this import.",
    "--",
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
    "-- ========== SCHEMA (prisma/schema/mysql) ==========",
    rawSchema.trim(),
    "",
    extras ? `-- ========== SCHEMA EXTRAS ==========\n${extras}\n` : "",
    "-- ========== SEED (blank) ==========",
    seed,
    "",
    "SET FOREIGN_KEY_CHECKS = 1;",
    "",
  ].join("\n");

  writeFileSync(OUT_FULL, full);
  console.log(`Wrote ${OUT_FULL}`);

  const legacy = [
    "-- AZURA one-file import: blank",
    "-- phpMyAdmin: create empty database → Import this file",
    "-- Prefer import-blank-full.sql for the latest complete schema.",
    "",
    schemaWrapped.trim(),
    "",
    seed,
    "",
  ].join("\n");
  writeFileSync(OUT_LEGACY, legacy);
  console.log(`Refreshed ${OUT_LEGACY}`);

  rmSync(RAW_SCHEMA, { force: true });
  console.log("Done.");
}

main();
