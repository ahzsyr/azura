#!/usr/bin/env node
/**
 * Production DB setup for Hostinger.
 * MySQL: prisma migrate deploy + seed
 * PostgreSQL (Supabase): prisma db push — use /setup wizard for admin (no seed)
 */
import { spawnSync } from "node:child_process";
import {
  isPostgresDatabaseUrl,
  resolvePrismaSchemaPath,
} from "./resolve-prisma-schema.mjs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "DATABASE_URL is not set. Export it or run from Hostinger SSH after env vars are configured.",
  );
  process.exit(1);
}

const schema = resolvePrismaSchemaPath();
const isPostgres = isPostgresDatabaseUrl();

if (isPostgres) {
  console.log(`PostgreSQL detected — syncing schema (${schema})…`);
  console.log(
    "Tip: For Supabase, import database/postgres/import-blank.sql in SQL Editor on first deploy.",
  );
  run("npx", ["prisma", "db", "push", "--schema", schema, "--skip-generate"]);
  console.log("Skipping db:seed on PostgreSQL — complete /setup in the browser.");
} else {
  console.log("Applying Prisma migrations (MySQL production)…");
  run("npx", ["prisma", "migrate", "deploy", "--schema", schema]);
  console.log("Seeding database (initial install)…");
  run("npm", ["run", "db:seed"]);
}

console.log("Done. Open your site URL + /setup to configure the website and admin account.");
console.log("(If setup was already completed, sign in at /admin/login.)");
