/**
 * Static pins: Advanced pages/APIs/actions call advanced-seo assert before side effects;
 * sample Basic action has no advanced-seo assert.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { advancedSeoModuleManifest } from "@/modules/advanced-seo/manifest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("advanced-seo manifest contract", () => {
  it("never declares /admin/seo as an adminRoute", () => {
    assert.ok(!advancedSeoModuleManifest.adminRoutes.includes("/admin/seo"));
    assert.ok(advancedSeoModuleManifest.adminRoutes.every((r) => r.startsWith("/admin/seo/")));
  });

  it("publicRoutes stay empty", () => {
    assert.deepEqual(advancedSeoModuleManifest.publicRoutes, []);
  });
});

describe("Advanced page / API / action guard pins (static)", () => {
  it("sample Advanced page calls requireAdvancedSeoPage before data load", () => {
    const source = read("src/app/admin/(dashboard)/seo/templates/page.tsx");
    const guard = source.indexOf("requireAdvancedSeoPage");
    const load = source.indexOf("getAppearanceConfig");
    assert.ok(guard >= 0, "must call requireAdvancedSeoPage");
    assert.ok(load >= 0, "must load appearance");
    assert.ok(guard < load, "page guard must precede data load");
  });

  it("sample Advanced API calls advancedSeoApiGuardResponse before side effects", () => {
    const source = read("src/app/api/seo/analyze/route.ts");
    const guard = source.indexOf("advancedSeoApiGuardResponse");
    const side = source.indexOf("seoPlatform.content.analyze");
    assert.ok(guard >= 0);
    assert.ok(side >= 0);
    assert.ok(guard < side, "API guard must precede analyze");
  });

  it("sample Advanced action asserts before write", () => {
    const source = read("src/features/seo/actions.ts");
    const appearance = source.indexOf("export async function upsertSeoAppearanceAction");
    const assertCall = source.indexOf("assertAdvancedSeoMutationAllowed", appearance);
    const write = source.indexOf("upsertAppearanceConfig", appearance);
    assert.ok(appearance >= 0 && assertCall >= 0 && write >= 0);
    assert.ok(assertCall < write, "assert must precede appearance write");
  });

  it("Google platform mutations assert before write", () => {
    const source = read("src/features/seo/google-platform/actions.ts");
    for (const fn of [
      "upsertGoogleGlobalSettingsAction",
      "upsertGoogleServiceConfigAction",
      "upsertGoogleServicePolicyAction",
      "runGoogleOperationAction",
      "testGoogleIntegrationAction",
      "disconnectGoogleIntegrationAction",
    ]) {
      const start = source.indexOf(`export async function ${fn}`);
      assert.ok(start >= 0, `missing ${fn}`);
      const nextExport = source.indexOf("\nexport async function", start + 1);
      const body = source.slice(start, nextExport > 0 ? nextExport : undefined);
      assert.match(body, /assertAdvancedSeoMutationAllowed/, `${fn} must assert Advanced SEO`);
    }
  });

  it("Advanced queue/analytics admin actions assert before side effects", () => {
    const source = read("src/features/seo/actions.ts");
    for (const fn of [
      "enqueueSitemapSubmissionAction",
      "runSeoSubmissionQueueAction",
      "submitSitemapAndRunAction",
      "runSeoAnalyticsIngestionAction",
    ]) {
      const start = source.indexOf(`export async function ${fn}`);
      assert.ok(start >= 0, `missing ${fn}`);
      const nextExport = source.indexOf("\nexport async function", start + 1);
      const body = source.slice(start, nextExport > 0 ? nextExport : undefined);
      assert.match(body, /assertAdvancedSeoMutationAllowed/, `${fn} must assert Advanced SEO`);
    }
  });

  it("sample Basic action has no advanced-seo assert", () => {
    const source = read("src/features/seo/actions.ts");
    const fn = source.indexOf("export async function upsertRedirectAction");
    const nextExport = source.indexOf("\nexport async function", fn + 1);
    const body = source.slice(fn, nextExport > 0 ? nextExport : undefined);
    assert.doesNotMatch(body, /assertAdvancedSeoMutationAllowed/);
  });

  it("public Basic API reads are not guarded by advanced-seo", () => {
    for (const rel of [
      "src/app/api/seo/head/route.ts",
      "src/app/api/seo/llms/route.ts",
      "src/app/api/seo/indexnow-key/[key]/route.ts",
      "src/app/api/seo/analytics/run/route.ts",
    ]) {
      const source = read(rel);
      assert.doesNotMatch(source, /advancedSeoApiGuardResponse|assertAdvancedSeoMutationAllowed/);
    }
  });

  it("Search Intelligence workspace mutations assert Advanced SEO", () => {
    const source = read("src/features/search-intelligence/workspaces/actions.ts");
    for (const fn of [
      "enqueueSearchOperationAction",
      "approveSearchOperationAction",
      "rejectSearchOperationAction",
      "updateApprovalPolicyAction",
      "testSearchOpsConnectorAction",
    ]) {
      const start = source.indexOf(`export async function ${fn}`);
      assert.ok(start >= 0, `missing ${fn}`);
      const nextExport = source.indexOf("\nexport async function", start + 1);
      const body = source.slice(start, nextExport > 0 ? nextExport : undefined);
      assert.match(body, /assertAdvancedSeoMutationAllowed/, `${fn} must assert Advanced SEO`);
    }
  });

  it("Search Intelligence content mutations assert Advanced SEO", () => {
    const source = read("src/features/search-intelligence/content-intelligence/actions.ts");
    for (const fn of [
      "upsertPageSearchTargetAction",
      "deletePageSearchTargetAction",
      "upsertKeywordClusterAction",
      "createPlanningBriefAction",
    ]) {
      const start = source.indexOf(`export async function ${fn}`);
      assert.ok(start >= 0, `missing ${fn}`);
      const nextExport = source.indexOf("\nexport async function", start + 1);
      const body = source.slice(start, nextExport > 0 ? nextExport : undefined);
      assert.match(body, /assertAdvancedSeoMutationAllowed/, `${fn} must assert Advanced SEO`);
    }
  });

  it("Phase 7 ownership inventory reports zero gaps", () => {
    const inventory = JSON.parse(
      read("docs/modules-v2/inventories/advanced-seo-ownership.json"),
    );
    assert.equal(inventory.phase, "7");
    assert.equal(inventory.summary.gaps, 0);
    assert.equal(inventory.summary.prefixCoverageOk, true);
    assert.ok(!advancedSeoModuleManifest.adminRoutes.includes("/admin/seo"));
  });
});
