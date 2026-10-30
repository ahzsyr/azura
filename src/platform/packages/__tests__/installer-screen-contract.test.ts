/**
 * Source contracts for Modules installer/actions/UI (tsx — no runtime import of
 * server-only installer or "use server" actions).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/** Extract an `export async function name(...) { ... }` body by brace balance. */
function exportedAsyncFunctionBody(source: string, name: string): string {
  const marker = `export async function ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing export async function ${name}`);
  const braceOpen = source.indexOf("{", start);
  assert.ok(braceOpen >= 0, `${name}: missing opening brace`);
  let depth = 0;
  for (let i = braceOpen; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceOpen + 1, i);
    }
  }
  assert.fail(`${name}: unbalanced braces`);
}

test("deactivatePackage body has no applyPackageSql (flag flip only)", () => {
  const body = exportedAsyncFunctionBody(readSrc("src/platform/packages/installer.ts"), "deactivatePackage");
  assert.equal(body.includes("applyPackageSql"), false);
  assert.equal(body.includes("applyPackageSqlOrThrow"), false);
});

test("activatePackage body re-runs allowlisted up SQL via applyPackageSqlOrThrow", () => {
  const body = exportedAsyncFunctionBody(readSrc("src/platform/packages/installer.ts"), "activatePackage");
  assert.match(body, /applyPackageSqlOrThrow\s*\([^)]*"up"\s*\)/);
});

test("activatePackage ensures ledger row before SiteFeature enable", () => {
  const body = exportedAsyncFunctionBody(readSrc("src/platform/packages/installer.ts"), "activatePackage");
  const createIdx = body.search(/packageInstallation\.create/);
  const featuresIdx = body.search(/updateSiteFeatures/);
  const upIdx = body.search(/applyPackageSqlOrThrow\s*\([^)]*"up"\s*\)/);
  assert.ok(createIdx >= 0 && featuresIdx >= 0 && upIdx >= 0);
  assert.ok(createIdx < featuresIdx, "create row must precede SiteFeature enable");
  assert.ok(upIdx < featuresIdx, "up SQL must precede SiteFeature enable");
  assert.match(body, /status:\s*"installed"/);
  assert.match(body, /asStatus\(row\.status\) === "active"/);
});

test("only destructive uninstallPackage owns applyPackageSql down in installer.ts", () => {
  const source = readSrc("src/platform/packages/installer.ts");
  const uninstallBody = exportedAsyncFunctionBody(source, "uninstallPackage");
  const downCalls = [...uninstallBody.matchAll(/applyPackageSqlOrThrow\s*\([^)]*"down"\s*\)/g)];
  assert.equal(downCalls.length, 1, "uninstallPackage must own exactly one down call");
  assert.match(uninstallBody, /if\s*\(\s*destructive\s*\)/);
  const destructiveIdx = uninstallBody.search(/if\s*\(\s*destructive\s*\)[\s\S]*?applyPackageSqlOrThrow/);
  const downIdx = uninstallBody.search(/applyPackageSqlOrThrow\s*\([^)]*"down"\s*\)/);
  assert.ok(destructiveIdx >= 0 && downIdx >= 0, "down must sit inside a destructive branch");

  const otherFns = ["installPackage", "activatePackage", "deactivatePackage", "updatePackage", "importPackageZip"] as const;
  for (const name of otherFns) {
    const body = exportedAsyncFunctionBody(source, name);
    assert.equal(/applyPackageSql(?:OrThrow)?\s*\([^)]*"down"\s*\)/.test(body), false, `${name} must not call down`);
  }
});

test("uninstallPackage refuses destructive for any builtin before dependents and before down", () => {
  const body = exportedAsyncFunctionBody(readSrc("src/platform/packages/installer.ts"), "uninstallPackage");
  const builtinRefuse = body.search(/destructive\s*&&\s*builtinManifest\s*\(\s*packageId\s*\)/);
  const dependentsCall = body.search(/dependents\s*\(\s*packageId\s*\)/);
  const downCall = body.search(/applyPackageSqlOrThrow\s*\([^)]*"down"\s*\)/);
  assert.ok(builtinRefuse >= 0, "must refuse destructive when builtinManifest(packageId)");
  assert.ok(dependentsCall >= 0, "must still check dependents");
  assert.ok(downCall >= 0, "must still own a down call for non-builtins");
  assert.ok(builtinRefuse < dependentsCall, "builtin refuse must precede dependents");
  assert.ok(builtinRefuse < downCall, "builtin refuse must precede applyPackageSql down");
});

test("updatePackage eligibility asserts appear before installPackage and up SQL", () => {
  const body = exportedAsyncFunctionBody(readSrc("src/platform/packages/installer.ts"), "updatePackage");
  const generated = body.search(/getDeploymentProfile\s*\(\s*\)/);
  const included = body.search(/isModuleEnabled\s*\(\s*packageId\s*\)/);
  const pendingRefuse = body.search(/pending/);
  const installBranch = body.search(/installPackage\s*\(\s*packageId\s*\)/);
  const upSql = body.search(/applyPackageSqlOrThrow\s*\([^)]*"up"\s*\)/);
  assert.ok(generated >= 0, "must call getDeploymentProfile");
  assert.ok(included >= 0, "must call isModuleEnabled");
  assert.ok(pendingRefuse >= 0, "must refuse pending status");
  assert.ok(installBranch >= 0, "must retain !existing → installPackage");
  assert.ok(upSql >= 0, "must apply up SQL");
  assert.ok(generated < installBranch && included < installBranch, "eligibility before installPackage");
  assert.ok(generated < upSql && included < upSql, "eligibility before up SQL");
  assert.ok(pendingRefuse < installBranch, "pending refuse before installPackage branch");
});

test("Modules actions wire Update / Uninstall / Remove under system section", () => {
  const actions = readSrc("src/platform/packages/actions.ts");
  assert.match(actions, /export async function updateInstalledPackage/);
  assert.match(actions, /export async function uninstallInstalledPackage/);
  assert.match(actions, /export async function removeInstalledPackage/);
  assert.match(actions, /requireAdminSection\s*\(\s*"system"\s*\)/);

  const removeBody = exportedAsyncFunctionBody(actions, "removeInstalledPackage");
  assert.match(removeBody, /confirmPhrase/);
  assert.match(removeBody, /uninstallPackage\s*\(\s*packageId\s*,\s*true\s*\)/);
  const phraseCheck = removeBody.search(/confirmPhrase/);
  const destructiveCall = removeBody.search(/uninstallPackage\s*\(\s*packageId\s*,\s*true\s*\)/);
  assert.ok(phraseCheck >= 0 && destructiveCall > phraseCheck, "phrase check before destructive uninstall");

  const uninstallBody = exportedAsyncFunctionBody(actions, "uninstallInstalledPackage");
  assert.match(uninstallBody, /uninstallPackage\s*\(\s*packageId\s*,\s*false\s*\)/);
});

test("Modules screen exposes Update / Uninstall / Remove; no Purge operator label", () => {
  const screen = readSrc("src/app/admin/(dashboard)/modules/module-screen.tsx");
  const toggleActions = readSrc("src/modules/module-screen-actions.ts");

  assert.match(screen, /importInstalledPackage/);
  assert.match(screen, /exportInstalledPackage/);
  assert.match(screen, /updateInstalledPackage/);
  assert.match(screen, /uninstallInstalledPackage/);
  assert.match(screen, /removeInstalledPackage/);
  assert.match(screen, /updatePackageButtonLabel/);
  assert.match(screen, /removePackageButtonLabel/);
  assert.match(screen, /purgeUnavailableNote/);
  assert.match(screen, /runPackagePreflight|preflightModuleToggle/);
  assert.doesNotMatch(screen, /purgePackage|onPurge|Purge package/);

  assert.match(toggleActions, /activatePackage/);
  assert.match(toggleActions, /deactivatePackage/);
  assert.match(toggleActions, /preflightModuleToggle/);
  assert.equal(toggleActions.includes("updatePackage"), false);
  assert.equal(toggleActions.includes("uninstallPackage"), false);
  assert.equal(toggleActions.includes("importPackageZip"), false);
});

test("module-screen writable formulas require profileGenerated", () => {
  const source = readSrc("src/modules/module-screen.ts");
  assert.match(source, /writable:\s*profileGenerated\s*&&\s*presetIncluded/);
  assert.match(source, /writable:\s*profileGenerated\s*&&\s*included/);
});
