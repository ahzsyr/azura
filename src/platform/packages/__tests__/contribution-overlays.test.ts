import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContributionOwnerMaps } from "@/platform/packages/contribution-owner-maps";
import { decideExtensionPackageImport } from "@/platform/packages/extension-package";
import {
  resolveOverlayLockedBlockTypes,
  resolveOverlayNavInactiveIds,
} from "@/platform/packages/overlay-resolve";
import type { PackageManifest } from "@/platform/packages/manifest";
import type { BlockAvailabilityProfile } from "@/features/builder/registry/block-requirement";

function isLockedByOverlay(type: string, profile: BlockAvailabilityProfile): boolean {
  const locked = profile.overlayLockedBlockTypes;
  if (!locked) return false;
  return locked instanceof Set ? locked.has(type) : locked.includes(type);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const maps = buildContributionOwnerMaps([
  {
    id: "documentation",
    navItemIds: ["documentation"],
    contributedBlockTypes: ["documentationNav"],
  },
  {
    id: "status-page",
    navItemIds: ["status-page"],
    contributedBlockTypes: ["statusDashboard"],
  },
]);

function extensionManifest(overrides?: Partial<PackageManifest>): PackageManifest {
  return {
    id: "demo-docs-overlay",
    version: "1.0.0",
    kind: "extension",
    azuraCompatibility: ">=0.1.0",
    requiredPackages: ["documentation"],
    requiredCapabilities: [],
    requiredPresets: [],
    permissions: [],
    label: "Demo Docs Overlay",
    contributions: {
      adminNavItemIds: ["documentation"],
      adminRoutePrefixes: [],
      blockTypes: ["documentationNav"],
    },
    ...overrides,
  };
}

describe("decideExtensionPackageImport", () => {
  it("accepts real ids with profile-included owners", () => {
    const decision = decideExtensionPackageImport({
      manifest: extensionManifest(),
      entryNames: ["azura-package.json"],
      enabledModuleIds: ["documentation"],
      maps,
    });
    assert.equal(decision.action, "installed");
  });

  it("rejects unknown nav ids", () => {
    const decision = decideExtensionPackageImport({
      manifest: extensionManifest({
        contributions: {
          adminNavItemIds: ["not-real"],
          adminRoutePrefixes: [],
          blockTypes: [],
        },
      }),
      entryNames: ["azura-package.json"],
      enabledModuleIds: ["documentation"],
      maps,
    });
    assert.equal(decision.action, "reject");
  });

  it("rejects migrations and theme-tokens entries (kind-scoped)", () => {
    const decision = decideExtensionPackageImport({
      manifest: extensionManifest(),
      entryNames: ["azura-package.json", "migrations/001.up.sql"],
      enabledModuleIds: ["documentation"],
      maps,
    });
    assert.equal(decision.action, "reject");
    const tokens = decideExtensionPackageImport({
      manifest: extensionManifest(),
      entryNames: ["azura-package.json", "theme-tokens.json"],
      enabledModuleIds: ["documentation"],
      maps,
    });
    assert.equal(tokens.action, "reject");
  });

  it("rejects when owner module is profile-omitted", () => {
    const decision = decideExtensionPackageImport({
      manifest: extensionManifest(),
      entryNames: ["azura-package.json"],
      enabledModuleIds: [],
      maps,
    });
    assert.equal(decision.action, "reject");
  });
});

describe("armed-gate resolver lifecycle", () => {
  it("ignores installed-only rows (inert import)", () => {
    const inactive = resolveOverlayNavInactiveIds({
      moduleInactiveNavIds: [],
      extensionRows: [
        { status: "installed", navItemIds: ["documentation"], blockTypes: ["documentationNav"] },
      ],
    });
    assert.deepEqual(inactive, []);
    assert.deepEqual(
      resolveOverlayLockedBlockTypes([
        { status: "installed", navItemIds: ["documentation"], blockTypes: ["documentationNav"] },
      ]),
      [],
    );
  });

  it("active opens; inactive closes; any active wins", () => {
    assert.deepEqual(
      resolveOverlayNavInactiveIds({
        moduleInactiveNavIds: [],
        extensionRows: [
          { status: "active", navItemIds: ["documentation"], blockTypes: [] },
        ],
      }),
      [],
    );
    assert.deepEqual(
      resolveOverlayNavInactiveIds({
        moduleInactiveNavIds: [],
        extensionRows: [
          { status: "inactive", navItemIds: ["documentation"], blockTypes: [] },
        ],
      }),
      ["documentation"],
    );
    assert.deepEqual(
      resolveOverlayNavInactiveIds({
        moduleInactiveNavIds: [],
        extensionRows: [
          { status: "inactive", navItemIds: ["documentation"], blockTypes: [] },
          { status: "active", navItemIds: ["documentation"], blockTypes: [] },
        ],
      }),
      [],
    );
    assert.deepEqual(
      resolveOverlayLockedBlockTypes([
        { status: "inactive", navItemIds: [], blockTypes: ["documentationNav"] },
      ]),
      ["documentationNav"],
    );
  });

  it("unions module-inactive with overlay-closed", () => {
    assert.deepEqual(
      resolveOverlayNavInactiveIds({
        moduleInactiveNavIds: ["status-page"],
        extensionRows: [
          { status: "inactive", navItemIds: ["documentation"], blockTypes: [] },
        ],
      }),
      ["documentation", "status-page"],
    );
  });
});

describe("admin overlay lock vs public profile", () => {
  it("overlayLockedBlockTypes gates admin profile only when set", () => {
    const withLock: BlockAvailabilityProfile = {
      modules: ["documentation"],
      overlayLockedBlockTypes: ["documentationNav"],
    };
    const withoutLock: BlockAvailabilityProfile = {
      modules: ["documentation"],
    };
    assert.equal(isLockedByOverlay("documentationNav", withLock), true);
    assert.equal(isLockedByOverlay("documentationNav", withoutLock), false);
  });
});

describe("static wiring pins", () => {
  it("contributions.ts unions overlay resolver", () => {
    const source = readFileSync(path.join(ROOT, "src/platform/packages/contributions.ts"), "utf8");
    assert.match(source, /resolveOverlayNavInactiveIds/);
    assert.match(source, /listOverlayLockedBlockTypes/);
  });

  it("installer extension branch precedes pending throw; no SiteFeature on extension deactivate", () => {
    const source = readFileSync(path.join(ROOT, "src/platform/packages/installer.ts"), "utf8");
    const extActivate = source.indexOf("activateExtensionPackage");
    const pending = source.indexOf("is pending until its code is deployed");
    assert.ok(extActivate >= 0 && pending >= 0);
    assert.ok(extActivate < pending);
    assert.match(source, /isExtensionEnvelope/);
    const deactivate = source.slice(source.indexOf("export async function deactivatePackage"));
    const themeOrExt = deactivate.indexOf("isExtensionEnvelope");
    const siteFeature = deactivate.indexOf("updateSiteFeatures");
    assert.ok(themeOrExt >= 0 && siteFeature > themeOrExt);
  });

  it("Modules UI exposes Open/Close overlay", () => {
    const source = readFileSync(
      path.join(ROOT, "src/app/admin/(dashboard)/modules/module-screen.tsx"),
      "utf8",
    );
    assert.match(source, /openExtensionOverlay/);
    assert.match(source, /closeExtensionOverlay/);
    assert.match(source, /openOverlayButtonLabel/);
  });

  it("admin builder profile enrichment uses overlay locks", () => {
    const source = readFileSync(
      path.join(ROOT, "src/config/deployment-profile/site-features.ts"),
      "utf8",
    );
    assert.match(source, /getAdminBuilderAvailabilityProfile/);
    assert.match(source, /listOverlayLockedBlockTypes/);
    const renderer = readFileSync(
      path.join(ROOT, "src/features/builder/components/block-renderer.tsx"),
      "utf8",
    );
    assert.match(renderer, /getEffectiveAvailabilityProfile/);
    assert.doesNotMatch(renderer, /getAdminBuilderAvailabilityProfile/);
  });

  it("export only adds theme-tokens from envelope artifacts (extensions have none)", () => {
    const source = readFileSync(path.join(ROOT, "src/platform/packages/installer.ts"), "utf8");
    const exportFn = source.slice(source.indexOf("export async function exportPackageZip"));
    assert.match(exportFn, /envelope\?\.artifacts\?\.themeTokens/);
    assert.doesNotMatch(
      exportFn.slice(0, exportFn.indexOf("return writeStoreZip")),
      /kind === "extension"/,
    );
  });
});
