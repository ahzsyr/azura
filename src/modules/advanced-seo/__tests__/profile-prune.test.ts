/**
 * Compiles agency (omits advanced-seo) and enterprise (includes it) and asserts
 * generator prune + disabled-prefix survival.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { advancedSeoModuleManifest } from "@/modules/advanced-seo/manifest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const GENERATED = path.join(ROOT, "src/generated/deployment-profile.json");
const GENERATOR = path.join(ROOT, "scripts/build/generate-deployment-profile.mjs");

type Compiled = {
  modules?: string[];
  enabledNavItemIds?: string[];
  disabledAdminPrefixes?: string[];
  disabledPublicPrefixes?: string[];
};

function compileProfile(profileId: string): Compiled {
  const result = spawnSync(process.execPath, [GENERATOR], {
    cwd: ROOT,
    env: { ...process.env, AZURA_PROFILE: profileId },
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || result.error?.message || "generate failed",
  );
  assert.ok(existsSync(GENERATED), "missing generated deployment-profile.json");
  return JSON.parse(readFileSync(GENERATED, "utf8")) as Compiled;
}

describe("advanced-seo profile prune + disabled-prefix survival", () => {
  it("enterprise includes advanced-seo and keeps sample Advanced nav ids enabled", () => {
    const enterprise = compileProfile("enterprise");
    assert.ok(enterprise.modules?.includes("advanced-seo"));
    for (const id of ["seo-templates", "seo-metadata", "seo-404", "seo-search-operations"]) {
      assert.ok(
        enterprise.enabledNavItemIds?.includes(id),
        `enterprise should keep ${id} when module included`,
      );
    }
  });

  it("agency omits module and prunes Advanced navItemIds", () => {
    const agency = compileProfile("agency");
    assert.ok(!agency.modules?.includes("advanced-seo"));
    for (const id of advancedSeoModuleManifest.navItemIds) {
      assert.ok(
        !agency.enabledNavItemIds?.includes(id),
        `agency must prune Advanced nav id ${id}`,
      );
    }
  });

  it("omitted profile retains Advanced adminRoutes as disabled prefixes (not /admin/seo)", () => {
    const agency = compileProfile("agency");
    const disabled = [
      ...(agency.disabledAdminPrefixes ?? []),
      ...(agency.disabledPublicPrefixes ?? []),
    ];
    assert.ok(!disabled.includes("/admin/seo"), "must never disable whole /admin/seo");
    for (const prefix of advancedSeoModuleManifest.adminRoutes) {
      assert.ok(
        disabled.includes(prefix),
        `omitted profile must keep disabled prefix ${prefix}`,
      );
    }
  });
});
