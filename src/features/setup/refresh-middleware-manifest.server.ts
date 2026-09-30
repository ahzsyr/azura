import "server-only";

import { spawnSync } from "node:child_process";
import path from "node:path";

let lastRefreshAt = 0;
const MIN_REFRESH_INTERVAL_MS = 5_000;

export async function refreshMiddlewareManifestBestEffort(reason: string): Promise<void> {
  if (process.env.MIDDLEWARE_MANIFEST_REFRESH === "0") return;

  const now = Date.now();
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) return;
  lastRefreshAt = now;

  try {
    const root = process.cwd();
    const script = path.join(root, "scripts", "build", "generate-middleware-manifest.mjs");
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      stdio: "ignore",
      env: process.env,
      shell: false,
    });
    if ((result.status ?? 1) !== 0) {
      console.warn(`[middleware-manifest] refresh skipped after ${reason}.`);
    }
  } catch (error) {
    console.warn(
      `[middleware-manifest] refresh failed after ${reason}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
