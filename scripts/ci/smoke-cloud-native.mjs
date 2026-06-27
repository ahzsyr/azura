#!/usr/bin/env node
/**
 * Optional smoke check for cloud-native staging: verifies env flags and that
 * blocked directories were not modified during a test window.
 *
 * Usage:
 *   STAGING_URL=https://your-preview.vercel.app node scripts/ci/smoke-cloud-native.mjs
 */
import { statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const STAGING_URL = process.env.STAGING_URL?.replace(/\/$/, "");

const WATCH_DIRS = [
  join(ROOT, "src", "data"),
  join(ROOT, "public", "uploads"),
  join(ROOT, "data", "search-analytics"),
];

function collectMtimes(dir, out = new Map()) {
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) collectMtimes(full, out);
      else out.set(full, st.mtimeMs);
    }
  } catch {
    // directory may not exist in cloud-native checkout
  }
  return out;
}

function assertEnv() {
  const required = {
    PRISMA_SCHEMA: "postgresql",
    CATALOG_PRODUCTS_SOURCE: "db",
    MEDIA_STORAGE: "supabase",
  };
  const missing = Object.entries(required).filter(([k, v]) => process.env[k] !== v);
  if (missing.length) {
    console.warn(
      "[smoke-cloud-native] Env not fully cloud-native (set in staging Vercel project):",
      missing.map(([k]) => k).join(", "),
    );
  } else {
    console.log("[smoke-cloud-native] Cloud-native env flags: OK");
  }
}

async function pingStaging() {
  if (!STAGING_URL) {
    console.log("[smoke-cloud-native] STAGING_URL not set — skipping HTTP health check");
    return;
  }
  try {
    const res = await fetch(`${STAGING_URL}/api/health`, { redirect: "follow" });
    console.log(`[smoke-cloud-native] GET ${STAGING_URL}/api/health → ${res.status}`);
  } catch (err) {
    console.warn("[smoke-cloud-native] Health check failed:", err instanceof Error ? err.message : err);
  }
}

assertEnv();
const before = collectMtimes(WATCH_DIRS[0]);
await pingStaging();
const after = collectMtimes(WATCH_DIRS[0]);

let changed = 0;
for (const [path, mtime] of after) {
  if (before.get(path) !== mtime) changed++;
}
if (changed > 0) {
  console.warn(`[smoke-cloud-native] ${changed} file(s) under src/data changed during smoke run`);
} else {
  console.log("[smoke-cloud-native] No src/data mtime changes detected");
}

console.log("[smoke-cloud-native] Done — run manual CRUD checklist on staging before release.");
