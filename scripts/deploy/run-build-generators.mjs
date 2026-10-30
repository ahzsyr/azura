#!/usr/bin/env node
/**
 * M2.3 — Hard-fail non-profile generators (ensure-style injectable runners).
 *
 * Hostinger: prisma-metadata then middleware (schema-only first; middleware DB best-effort).
 * npm prebuild: middleware → profile:generate → assert → prisma-metadata (preserved order).
 *
 * Hard-fail = process exit nonzero aborts. Middleware exit 0 with fallback JSON (no DB)
 * is success — not a live-DB requirement.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSERT_SCRIPT, defaultRunNode } from "./ensure-selected-deployment-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const PRISMA_METADATA_SCRIPT = "scripts/build/generate-prisma-metadata.mjs";
export const MIDDLEWARE_MANIFEST_SCRIPT = "scripts/build/generate-middleware-manifest.mjs";

export const PREBUILD_MIDDLEWARE_NPM = "middleware:manifest";
export const PREBUILD_PROFILE_NPM = "profile:generate";
export const PREBUILD_PRISMA_METADATA_NPM = "prisma-metadata:generate";

/**
 * @typedef {{ status: number, error?: string }} RunResult
 * @typedef {(scriptRel: string, env: NodeJS.ProcessEnv) => RunResult} RunNode
 * @typedef {(npmScript: string, env: NodeJS.ProcessEnv) => RunResult} RunNpm
 */

/**
 * @type {RunNpm}
 */
export function defaultRunNpm(npmScript, env) {
  const result = spawnSync("npm", ["run", npmScript], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return { status: result.status ?? 1 };
}

/**
 * Hostinger ship-path pair: prisma-metadata → middleware.
 *
 * @param {{ env?: NodeJS.ProcessEnv, runNode?: RunNode }} [options]
 * @returns {{ ok: true } | { ok: false, failedStep: string, code: number }}
 */
export function runBuildGenerators(options = {}) {
  const env = { ...(options.env ?? process.env) };
  const runNode = options.runNode ?? defaultRunNode;

  const steps = [
    { step: "prisma-metadata:generate", script: PRISMA_METADATA_SCRIPT },
    { step: "middleware:manifest", script: MIDDLEWARE_MANIFEST_SCRIPT },
  ];

  for (const { step, script } of steps) {
    const result = runNode(script, env);
    if ((result.status ?? 1) !== 0) {
      return { ok: false, failedStep: step, code: result.status ?? 1 };
    }
  }

  return { ok: true };
}

/**
 * npm prebuild triad + selected-profile assert (order preserved from softFail era).
 *
 * @param {{ env?: NodeJS.ProcessEnv, runNpm?: RunNpm, runNode?: RunNode }} [options]
 * @returns {{ ok: true } | { ok: false, failedStep: string, code: number }}
 */
export function runPrebuildManifestSteps(options = {}) {
  const env = { ...(options.env ?? process.env) };
  const runNpm = options.runNpm ?? defaultRunNpm;
  const runNode = options.runNode ?? defaultRunNode;

  /** @type {{ step: string, run: () => RunResult }[]} */
  const steps = [
    {
      step: PREBUILD_MIDDLEWARE_NPM,
      run: () => runNpm(PREBUILD_MIDDLEWARE_NPM, env),
    },
    {
      step: PREBUILD_PROFILE_NPM,
      run: () => runNpm(PREBUILD_PROFILE_NPM, env),
    },
    {
      step: "profile:assert",
      run: () => runNode(ASSERT_SCRIPT, env),
    },
    {
      step: PREBUILD_PRISMA_METADATA_NPM,
      run: () => runNpm(PREBUILD_PRISMA_METADATA_NPM, env),
    },
  ];

  for (const { step, run } of steps) {
    const result = run();
    if ((result.status ?? 1) !== 0) {
      return { ok: false, failedStep: step, code: result.status ?? 1 };
    }
  }

  return { ok: true };
}
