#!/usr/bin/env node
/**
 * Phase 8 — read-only package support diagnostics snapshot (no secrets).
 *
 * Usage:
 *   node scripts/platform/export-package-support-diagnostics.mjs --all-builtins
 *   node scripts/platform/export-package-support-diagnostics.mjs --package documentation
 *   node scripts/platform/export-package-support-diagnostics.mjs --shape-fixture
 *
 * Live export loads the TypeScript collector via tsx (Prisma + profile).
 * `--shape-fixture` prints a valid offline fixture (no DB) for smoke checks.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);

if (args.includes("--shape-fixture")) {
  const fixture = {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      profileId: "agency",
      profileSourceHash: "abc",
      generated: true,
    },
    packages: [
      {
        packageId: "documentation",
        kind: "app",
        status: "active",
        version: "1.0.0",
        azuraCompatibility: ">=0.1.0",
        compatibleWithCore: true,
        coreVersion: "0.1.0",
        migrations: { appliedUps: 0, pendingUpCount: 0 },
        lastLifecycleFailure: null,
        recoveryHint: null,
        moduleIncludedInProfile: true,
      },
    ],
    secretsExcluded: true,
  };
  process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
  process.exit(0);
}

const runner = path.join(root, "scripts/platform/export-package-support-diagnostics-run.ts");
const tsxBin = path.join(root, "node_modules/.bin/tsx");
const serverOnlyRegister = path.join(root, "scripts/platform/register-cli-server-only.mjs");
const result = spawnSync(
  tsxBin,
  ["--import", serverOnlyRegister, runner, ...args],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  },
);

process.exit(result.status ?? 1);
