#!/usr/bin/env node
/**
 * Production DB setup for Hostinger.
 * MySQL: prisma migrate deploy + seed (fresh install only)
 * PostgreSQL (Supabase): prisma db push — use /setup wizard for admin (no seed)
 */
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
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

async function hasHeaderWorkspaceRecord() {
  const prisma = new PrismaClient();
  try {
    const row = await prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace: "header-workspace", key: "default" } },
    });
    return Boolean(row);
  } finally {
    await prisma.$disconnect();
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

  const forceSeed = process.env.SETUP_FRESH_INSTALL === "1";
  const hasWorkspace = await hasHeaderWorkspaceRecord();

  if (forceSeed) {
    console.log("SETUP_FRESH_INSTALL=1 — running full db:seed.");
    run("npm", ["run", "db:seed"]);
  } else if (hasWorkspace) {
    console.log(
      "Header workspace already exists — skipping db:seed to preserve live configuration.",
    );
    console.log("To force a fresh seed, run with SETUP_FRESH_INSTALL=1.");
  } else {
    console.log("No header workspace found — seeding database (initial install)…");
    run("npm", ["run", "db:seed"]);
  }
}

console.log("Done. Open your site URL + /setup to configure the website and admin account.");
console.log("(If setup was already completed, sign in at /admin/login.)");
