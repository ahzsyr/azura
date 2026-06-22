#!/usr/bin/env node
/**
 * Resolve DATABASE_URL for Prisma scripts.
 * Priority: process.env → .env.hostinger → .env
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Strip copy-paste mistakes from hPanel/Vercel env values. */
export function sanitizeDatabaseUrl(raw) {
  let url = String(raw ?? "").trim();
  if (!url) return "";

  url = url.replace(/^DATABASE_URL\s*=\s*/i, "");
  url = url.replace(/^["']+|["']+$/g, "");

  const postgresMatch = url.match(/(postgres(?:ql)?:\/\/[^\s"'<>]+)/i);
  if (postgresMatch) {
    return postgresMatch[1];
  }

  return url.trim();
}

export function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
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
    vars[key] = value;
  }
  return vars;
}

export function loadDatabaseUrl(cwd = process.cwd()) {
  if (process.env.DATABASE_URL?.trim()) {
    return sanitizeDatabaseUrl(process.env.DATABASE_URL);
  }
  const hostinger = parseEnvFile(join(cwd, ".env.hostinger"));
  if (hostinger.DATABASE_URL?.trim()) {
    return sanitizeDatabaseUrl(hostinger.DATABASE_URL);
  }
  const env = parseEnvFile(join(cwd, ".env"));
  if (env.DATABASE_URL?.trim()) {
    return sanitizeDatabaseUrl(env.DATABASE_URL);
  }
  return "";
}

/** Env for child processes: inject resolved DATABASE_URL without mutating parent. */
export function buildPrismaEnv(cwd = process.cwd()) {
  const url = loadDatabaseUrl(cwd);
  const env = { ...process.env };
  if (url) {
    env.DATABASE_URL = url;
  }
  return env;
}
