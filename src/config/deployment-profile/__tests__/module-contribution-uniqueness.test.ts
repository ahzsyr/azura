import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { MODULE_MANIFESTS } from "@/config/deployment-profile/route-registry";
import { MODULE_EXTRA_PUBLIC_BINDINGS } from "@/config/deployment-profile/module-extra-bindings";
import { buildContributionOwnerMaps } from "@/platform/packages/contribution-owner-maps";

test("MODULE_MANIFESTS nav item ids are unique across Modules", () => {
  const seen = new Map<string, string>();
  for (const manifest of MODULE_MANIFESTS) {
    for (const id of manifest.navItemIds) {
      const prior = seen.get(id);
      assert.equal(prior, undefined, `duplicate nav id “${id}” on ${manifest.id} and ${prior}`);
      seen.set(id, manifest.id);
    }
  }
});

test("MODULE_MANIFESTS contributed block types are unique across Modules", () => {
  const seen = new Map<string, string>();
  for (const manifest of MODULE_MANIFESTS) {
    for (const block of manifest.contributedBlockTypes as readonly string[]) {
      const prior = seen.get(block);
      assert.equal(
        prior,
        undefined,
        `duplicate block type “${block}” on ${manifest.id} and ${prior}`,
      );
      seen.set(block, manifest.id);
    }
  }
});

test("contribution owner maps resolve every shipped nav and block id", () => {
  const maps = buildContributionOwnerMaps();
  for (const manifest of MODULE_MANIFESTS) {
    for (const id of manifest.navItemIds) {
      assert.equal(maps.navItemIdToModule.get(id), manifest.id, id);
    }
    for (const block of manifest.contributedBlockTypes as readonly string[]) {
      assert.equal(maps.blockTypeToModule.get(block), manifest.id, block);
    }
  }
});
test("MODULE_EXTRA_PUBLIC_BINDINGS stays synced with the profile generator module", () => {
  const mjs = readFileSync(
    path.join(process.cwd(), "scripts/build/module-extra-public-bindings.mjs"),
    "utf8",
  );
  assert.match(mjs, /marketing:\s*\[\s*"\/a"\s*\]/);
  assert.deepEqual(MODULE_EXTRA_PUBLIC_BINDINGS.marketing, ["/a"]);
});

test("Marketing and Advanced SEO declare zero contributed block types", () => {
  const marketing = MODULE_MANIFESTS.find((m) => m.id === "marketing");
  const seo = MODULE_MANIFESTS.find((m) => m.id === "advanced-seo");
  assert.deepEqual(marketing?.contributedBlockTypes, []);
  assert.deepEqual(seo?.contributedBlockTypes, []);
});

test("Documentation and Status Page each contribute exactly one block type", () => {
  const docs = MODULE_MANIFESTS.find((m) => m.id === "documentation");
  const status = MODULE_MANIFESTS.find((m) => m.id === "status-page");
  assert.deepEqual(docs?.contributedBlockTypes, ["documentationNav"]);
  assert.deepEqual(status?.contributedBlockTypes, ["statusDashboard"]);
});
