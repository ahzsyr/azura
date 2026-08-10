#!/usr/bin/env node
/**
 * Regenerate Prisma client when DATABASE_URL provider does not match generated client.
 * Run on postinstall / prestart so Hostinger Supabase URLs work after env is set.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPrismaEnv } from "./load-database-url.mjs";
import { runPrismaOrExit } from "./run-prisma.mjs";
import {
  isPostgresDatabaseUrl,
  resolvePrismaSchemaPath,
} from "./resolve-prisma-schema.mjs";

const root = process.cwd();
const clientSchema = join(root, "node_modules", ".prisma", "client", "schema.prisma");
const env = buildPrismaEnv();
const url = env.DATABASE_URL?.trim() ?? "";

if (!url) {
  console.log("[ensure-prisma] DATABASE_URL unset — skipping provider check");
  process.exit(0);
}

const expectedProvider = isPostgresDatabaseUrl(url) ? "postgresql" : "mysql";
const expectedSchema = resolvePrismaSchemaPath(env);

let currentProvider = null;
if (existsSync(clientSchema)) {
  const content = readFileSync(clientSchema, "utf-8");
  const match = content.match(/provider\s*=\s*"(\w+)"/);
  currentProvider = match?.[1] ?? null;
}

if (currentProvider === expectedProvider) {
  console.log(`[ensure-prisma] Client OK (${expectedProvider})`);
  process.exit(0);
}

console.log(
  `[ensure-prisma] Regenerating Prisma client: ${currentProvider ?? "missing"} → ${expectedProvider} (${expectedSchema})`,
);

runPrismaOrExit(["generate", "--schema", expectedSchema], { env, cwd: root });

console.log("[ensure-prisma] Done.");
