#!/usr/bin/env node
/**
 * Hostinger zip deploys often strip +x from Prisma native binaries.
 * `chmod -R u+rwX` does NOT restore execute on regular files that lost +x
 * (capital X only applies to dirs / files that already had some execute bit).
 * Call this before `prisma migrate` / any schema-engine use.
 */
import { chmodSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";

const ENGINE_FILE_RE =
  /^(schema-engine|query-engine|libquery_engine|migration-engine|prisma-fmt)/i;

function chmodTree(dir, { allFiles = false } = {}) {
  if (!existsSync(dir)) return 0;
  let fixed = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      fixed += chmodTree(path, { allFiles });
      continue;
    }
    if (!allFiles && !ENGINE_FILE_RE.test(name)) continue;
    try {
      chmodSync(path, 0o755);
      fixed += 1;
    } catch {
      // ignore; migrate will surface EACCES if still blocked
    }
  }
  return fixed;
}

/**
 * @param {string} [cwd]
 * @returns {number} files chmod'd
 */
export function ensurePrismaEnginesExecutable(cwd = process.cwd()) {
  if (platform() === "win32") return 0;

  const enginesDir = join(cwd, "node_modules", "@prisma", "engines");
  const clientDir = join(cwd, "node_modules", ".prisma", "client");
  const prismaEngines = join(cwd, "node_modules", "prisma", "engines");

  // All files under @prisma/engines are native binaries / helpers
  let fixed = chmodTree(enginesDir, { allFiles: true });
  fixed += chmodTree(clientDir, { allFiles: false });
  fixed += chmodTree(prismaEngines, { allFiles: true });

  if (fixed > 0) {
    console.log(`[prisma-engines] Made ${fixed} engine binary(ies) executable`);
  }
  return fixed;
}
