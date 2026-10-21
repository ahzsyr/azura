#!/usr/bin/env node
/**
 * Path-scoped ESLint for files changed vs a base ref (default: origin/main…HEAD,
 * falling back to unstaged+staged working tree). Keeps repo-wide historical lint
 * debt from blocking CI while still gating remediation files.
 *
 * Usage:
 *   node scripts/ci/lint-changed.mjs
 *   node scripts/ci/lint-changed.mjs --base origin/main
 *   LINT_CHANGED_BASE=origin/main node scripts/ci/lint-changed.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const baseFlag = args.indexOf("--base");
const base =
  (baseFlag >= 0 ? args[baseFlag + 1] : null) ||
  process.env.LINT_CHANGED_BASE ||
  "origin/main";

function git(lines) {
  const result = spawnSync("git", lines, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout ?? "";
}

function collectPaths() {
  const fromDiff = git(["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`]);
  const unstaged = git(["diff", "--name-only", "--diff-filter=ACMR"]);
  const staged = git(["diff", "--name-only", "--cached", "--diff-filter=ACMR"]);
  const set = new Set(
    [...fromDiff.split("\n"), ...unstaged.split("\n"), ...staged.split("\n")]
      .map((p) => p.trim())
      .filter((p) => p && /\.(tsx?|jsx?|mjs|cjs)$/.test(p) && existsSync(p)),
  );
  return [...set];
}

const paths = collectPaths();
if (paths.length === 0) {
  console.log("[lint-changed] no changed JS/TS files to lint");
  process.exit(0);
}

console.log(`[lint-changed] linting ${paths.length} file(s) vs ${base} + working tree`);
const eslint = spawnSync(
  process.execPath,
  ["./node_modules/eslint/bin/eslint.js", "--max-warnings=0", ...paths],
  { stdio: "inherit" },
);
process.exit(eslint.status ?? 1);
