import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRIBUTION_INVENTORY,
  PACKAGE_CONTRIBUTION_KEYS,
  contributionStatus,
  declaredOnlyContributionKeys,
  operationalContributionKeys,
  resolveActivePackageSections,
  resolveInactiveContributedNavItemIds,
} from "@/platform/packages/contribution-inventory";
import { packageManifestFromModule, validatePackageManifest } from "@/platform/packages/manifest";
import { documentationModuleManifest } from "@/modules/documentation/manifest";
import { marketingModuleManifest } from "@/modules/marketing/manifest";
import { statusPageModuleManifest } from "@/modules/status-page/manifest";
import { isBlockRequirementMet } from "@/features/builder/registry/block-requirement";
import { getModuleForContributedBlock } from "@/config/deployment-profile/route-registry";

test("inventory covers every PackageContributions key plus themeTokens not-in-contract", () => {
  for (const key of PACKAGE_CONTRIBUTION_KEYS) {
    assert.ok(
      CONTRIBUTION_INVENTORY.some((entry) => entry.key === key),
      `missing inventory for ${key}`,
    );
  }
  assert.equal(contributionStatus("themeTokens"), "not-in-contract");
  assert.deepEqual(operationalContributionKeys().sort(), [
    "adminNavItemIds",
    "adminRoutePrefixes",
    "blockTypes",
  ]);
  assert.deepEqual(declaredOnlyContributionKeys(), []);
  assert.equal(contributionStatus("publicRoutePrefixes"), "not-in-contract");
  assert.equal(contributionStatus("dashboardSections"), "not-in-contract");
});

test("in-contract inventory keys match PACKAGE_CONTRIBUTION_KEYS exactly (reverse + uniqueness)", () => {
  const inContract = CONTRIBUTION_INVENTORY.filter((entry) => entry.status !== "not-in-contract").map(
    (entry) => entry.key,
  );
  assert.deepEqual([...inContract].sort(), [...PACKAGE_CONTRIBUTION_KEYS].sort());
  assert.equal(new Set(CONTRIBUTION_INVENTORY.map((entry) => entry.key)).size, CONTRIBUTION_INVENTORY.length);
});

test("themeTokens stays not-in-contract and outside PACKAGE_CONTRIBUTION_KEYS", () => {
  assert.equal(contributionStatus("themeTokens"), "not-in-contract");
  assert.equal(PACKAGE_CONTRIBUTION_KEYS.includes("themeTokens"), false);
});

test("forward contract: multi-prefix package emits only first adminRoutePrefixes href", () => {
  // Synthetic: all shipped Modules today have a single adminRoutes entry.
  const sections = resolveActivePackageSections([
    {
      id: "multi",
      active: true,
      label: "Multi",
      adminRoutePrefixes: ["/admin/first", "/admin/second"],
    },
  ]);
  assert.deepEqual(sections, [{ id: "multi", label: "Multi", href: "/admin/first" }]);
  assert.equal(
    sections.some((section) => section.href === "/admin/second"),
    false,
  );
});

test("validation rejects themeTokens and other unknown contribution keys", () => {
  const theme = validatePackageManifest({
    id: "pretty",
    version: "1.0.0",
    kind: "theme",
    contributions: {
      themeTokens: { primary: "#000" },
    },
  });
  assert.equal(theme.ok, false);
  if (!theme.ok) {
    assert.match(theme.errors.join(" "), /contributions\.themeTokens/);
    assert.match(theme.errors.join(" "), /not a supported contribution type/);
  }

  const weird = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "extension",
    contributions: { loadReact: ["Evil.tsx"] },
  });
  assert.equal(weird.ok, false);
});

test("Phase 4 removed contribution keys are rejected", () => {
  const validated = validatePackageManifest({
    id: "docs-mirror",
    version: "1.0.0",
    kind: "app",
    contributions: {
      publicRoutePrefixes: ["/docs"],
      dashboardSections: ["Docs"],
      adminRoutePrefixes: ["/admin/documentation"],
    },
  });
  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.match(validated.errors.join(" "), /removed in Phase 4/);
  }
});

test("inactive modules hide their contributed nav item ids", () => {
  const ids = resolveInactiveContributedNavItemIds([
    { active: true, navItemIds: ["marketing-dashboard", "marketing-campaigns"] },
    { active: false, navItemIds: ["documentation"] },
    { active: false, navItemIds: ["status-page"] },
  ]);
  assert.deepEqual(ids, ["documentation", "status-page"]);
});

test("active package sections omit inactive packages and need an admin route prefix", () => {
  const sections = resolveActivePackageSections([
    {
      id: "documentation",
      active: true,
      label: "Documentation",
      adminRoutePrefixes: ["/admin/documentation"],
    },
    {
      id: "marketing",
      active: false,
      label: "Marketing",
      adminRoutePrefixes: ["/admin/marketing"],
    },
    {
      id: "orphan",
      active: true,
      label: "Orphan",
      adminRoutePrefixes: [],
    },
  ]);
  assert.deepEqual(sections, [
    { id: "documentation", label: "Documentation", href: "/admin/documentation" },
  ]);
});

test("contributed block types require an active owning module on the availability profile", () => {
  assert.equal(getModuleForContributedBlock("documentationNav"), "documentation");
  assert.equal(getModuleForContributedBlock("statusDashboard"), "status-page");
  assert.equal(getModuleForContributedBlock("hero"), undefined);

  assert.equal(
    isBlockRequirementMet({ module: "documentation" }, { modules: ["documentation"] }),
    true,
  );
  assert.equal(
    isBlockRequirementMet({ module: "documentation" }, { modules: ["marketing"] }),
    false,
  );
  assert.equal(
    isBlockRequirementMet({ module: "status-page" }, { modules: [] }),
    false,
  );
});

test("builtin packageManifestFromModule mirrors operational contribution fields", () => {
  const docs = packageManifestFromModule(documentationModuleManifest);
  assert.deepEqual(docs.contributions.adminNavItemIds, documentationModuleManifest.navItemIds);
  assert.deepEqual(docs.contributions.blockTypes, documentationModuleManifest.contributedBlockTypes);
  assert.deepEqual(docs.contributions.adminRoutePrefixes, documentationModuleManifest.adminRoutes);

  const marketing = packageManifestFromModule(marketingModuleManifest);
  assert.deepEqual(marketing.contributions.blockTypes, []);
  assert.ok(marketing.contributions.adminNavItemIds.includes("marketing-dashboard"));

  const status = packageManifestFromModule(statusPageModuleManifest);
  assert.deepEqual(status.contributions.blockTypes, ["statusDashboard"]);
});

test("packageManifestFromModule preserves adminRoutes order for multi-prefix (dashboard [0] invariant)", () => {
  const multi = packageManifestFromModule({
    ...documentationModuleManifest,
    id: "multi-admin",
    adminRoutes: ["/admin/alpha", "/admin/beta"],
  });
  assert.deepEqual(multi.contributions.adminRoutePrefixes, ["/admin/alpha", "/admin/beta"]);
});
