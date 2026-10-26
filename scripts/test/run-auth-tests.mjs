#!/usr/bin/env node
/**
 * Runs the authentication / account test suites.
 *
 * Most suites run through Node's built-in TypeScript stripping with the resolve
 * hooks in ./register.mjs, which map tsconfig paths, stub `server-only`, and
 * replace the database, mail transport and email templates with in-memory
 * doubles. Those suites never touch a real database.
 *
 * Node's type stripping cannot import `.tsx`, and each test file gets its own
 * module registry, so each suite runs in its own process.
 *
 * Options:
 *   --pure-only   only the suites that need no stubs at all
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Pure modules only. */
const PURE_TESTS = [
  "src/features/auth/__tests__/portal.test.ts",
  "src/features/auth/__tests__/email-otp.test.ts",
  "src/features/auth/__tests__/login-mfa-factors.test.ts",
  "src/features/auth/__tests__/totp-verification.test.ts",
  "src/features/auth/__tests__/admin-auth-delivery.test.ts",
  "src/features/auth/__tests__/p1-auth-security.test.ts",
  "src/features/auth/__tests__/p2-account-lifecycle.test.ts",
  "src/features/auth/__tests__/p3-admin-lifecycle.test.ts",
  "src/features/auth/__tests__/p4-customer-portal.test.ts",
  "src/features/auth/__tests__/session-revocation.test.ts",
  "src/features/auth/__tests__/abuse-controls.test.ts",
  "src/features/auth/__tests__/admin-section-grants.test.ts",
  "src/features/auth/__tests__/role-policy.test.ts",
  "src/features/auth/__tests__/user-mfa-reset.test.ts",
  "src/features/account/admin/__tests__/user-funnel.test.ts",
  "src/features/account/admin/__tests__/visitor-link-policy.test.ts",
];

/** Import `server-only` modules and need the mail/DB/template doubles. */
const SERVER_TESTS = [
  "src/features/account/__tests__/password-reset-delivery.test.ts",
  "src/features/auth/__tests__/mfa-isolation.test.ts",
];

function run(files) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        "--import",
        "./scripts/test/register.mjs",
        ...files,
      ],
      { cwd: root, stdio: "inherit" },
    );
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      console.error("[test] failed to start:", error.message);
      resolve(1);
    });
  });
}

/**
 * Each suite runs in its own process: every file gets a fresh module registry
 * (so the fake database and settings store start clean), and Node's test
 * runner reports the summaries of all files on the same event loop.
 */
async function batch(title, files) {
  console.log(`\n[test] ${title}`);
  const failed = [];
  for (const file of files) {
    console.log(`  • ${file}`);
    if ((await run([file])) !== 0) failed.push(file);
  }
  return failed;
}

const pureOnly = process.argv.includes("--pure-only");
const failed = [];

failed.push(...(await batch("policy suites", PURE_TESTS)));

if (!pureOnly) {
  failed.push(...(await batch("server suites (server-only, mail and database stubbed)", SERVER_TESTS)));
}

if (failed.length > 0) {
  console.error(`\n[test] FAILED (${failed.length}):`);
  for (const file of failed) console.error(`  ✖ ${file}`);
  process.exit(1);
}

console.log("\n[test] all auth suites passed");
