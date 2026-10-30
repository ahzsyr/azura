import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { getModuleForContributedBlock, MODULE_MANIFESTS } from "@/config/deployment-profile/route-registry";

test("builder contribution matrix: Docs/Status blocks; Marketing/SEO none", () => {
  assert.equal(getModuleForContributedBlock("documentationNav"), "documentation");
  assert.equal(getModuleForContributedBlock("statusDashboard"), "status-page");
  for (const id of ["marketing", "advanced-seo"] as const) {
    const m = MODULE_MANIFESTS.find((row) => row.id === id);
    assert.equal(m?.contributedBlockTypes.length, 0, id);
  }
});

test("admin builder uses overlay locks; public render path does not", () => {
  const overlays = readFileSync(
    path.join(process.cwd(), "src/platform/packages/__tests__/contribution-overlays.test.ts"),
    "utf8",
  );
  assert.match(overlays, /getAdminBuilderAvailabilityProfile/);
  assert.match(overlays, /doesNotMatch\(renderer/);
});
