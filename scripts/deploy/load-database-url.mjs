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

/**
 * Session pooler first (credentials from DATABASE_URL); then DIRECT_URL; then transaction pooler.
 */
export function resolveMigrateDatabaseUrl(env = process.env) {
  const candidates = resolvePostgresMigrateUrls(env);
  return candidates[0]?.url ?? "";
}

/**
 * Supabase session pooler (same host as transaction pooler, port 5432).
 * Reachable from Vercel CI when db.*.supabase.co direct IPv6 is not.
 */
export function deriveSessionPoolerUrl(databaseUrl) {
  const raw = sanitizeDatabaseUrl(databaseUrl);
  if (!raw || !/pooler\.supabase\.com/i.test(raw)) {
    return "";
  }
  let url = raw.replace(/:6543(\/|$)/i, ":5432$1");
  url = url.replace(/([?&])pgbouncer=[^&]*(&)?/gi, (_, sep, amp) => (amp ? sep : ""));
  url = url.replace(/([?&])connection_limit=[^&]*(&)?/gi, (_, sep, amp) => (amp ? sep : ""));
  url = url.replace(/\?&/, "?").replace(/[?&]$/, "");
  if (!/sslmode=/i.test(url)) {
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  return url === raw ? "" : url;
}

/** Ordered migrate URLs: session pooler → DIRECT_URL → transaction pooler. */
export function resolvePostgresMigrateUrls(env = process.env) {
  const candidates = [];
  const seen = new Set();

  const add = (raw, label) => {
    const url = sanitizeDatabaseUrl(raw);
    if (!url || !/^postgres(ql)?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    candidates.push({ url, label });
  };

  add(deriveSessionPoolerUrl(env.DATABASE_URL), "session pooler (port 5432)");
  add(env.DIRECT_URL, "DIRECT_URL");
  add(env.DATABASE_URL, "DATABASE_URL (transaction pooler)");

  return candidates;
}
