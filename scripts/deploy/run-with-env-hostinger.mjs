#!/usr/bin/env node
/**
 * Run a npm script with variables from .env.hostinger loaded.
 * Usage: node scripts/deploy/run-with-env-hostinger.mjs test:db
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const envPath = join(root, ".env.hostinger");

if (!existsSync(envPath)) {
  console.error("Missing .env.hostinger");
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const script = process.argv[2] ?? "test:db";
const result = spawnSync("npm", ["run", script], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
  cwd: root,
});

process.exit(result.status ?? 1);
