#!/usr/bin/env node
/**
 * Lightweight Hostinger staging smoke.
 *
 *   STAGING_URL=https://your-hostinger-domain.example node scripts/ci/smoke-hostinger.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STAGING_URL = process.env.STAGING_URL?.replace(/\/$/, "");

const requiredEnvHints = [
  "DATABASE_URL",
  "MEDIA_STORAGE",
  "CRON_SECRET",
];

const missing = requiredEnvHints.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.warn(
    "[smoke-hostinger] Env hints missing locally (set on Hostinger):",
    missing.join(", "),
  );
} else {
  console.log("[smoke-hostinger] Env hints: OK");
}

if (!STAGING_URL) {
  console.log("[smoke-hostinger] STAGING_URL not set — skipping HTTP health check");
} else {
  try {
    const res = await fetch(`${STAGING_URL}/api/health`);
    console.log(`[smoke-hostinger] GET ${STAGING_URL}/api/health → ${res.status}`);
  } catch (err) {
    console.warn("[smoke-hostinger] Health check failed:", err instanceof Error ? err.message : err);
  }
}

function countMtimeChanges(dir, sinceMs) {
  let changed = 0;
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) changed += countMtimeChanges(full, sinceMs);
      else if (st.mtimeMs > sinceMs) changed += 1;
    }
  } catch {
    // ignore
  }
  return changed;
}

const dataDir = join(process.cwd(), "src/data");
const before = Date.now();
const changed = countMtimeChanges(dataDir, before - 60_000);
if (changed > 0) {
  console.warn(`[smoke-hostinger] ${changed} file(s) under src/data changed during smoke window`);
} else {
  console.log("[smoke-hostinger] No recent src/data mtime churn detected");
}

console.log("[smoke-hostinger] Done — run Hostinger Phase 4 Stability Gate before release.");
