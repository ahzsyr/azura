import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import {
  createDefaultWorkspace,
  mergeHeaderWorkspaceWithTheme,
} from "@/features/navigation/defaults";

describe("mergeHeaderWorkspaceWithTheme", () => {
  it("applies theme layout and typography when brand name is still a factory default", () => {
    const workspace = createDefaultWorkspace();
    workspace.branding = normalizeBranding({
      brandLayoutDesktop: "logo-and-text",
      brandLayoutMobile: "logo-and-text",
      brandName: "Stale Workspace Name",
      areaStyle: "default",
    });

    const merged = mergeHeaderWorkspaceWithTheme(workspace, {
      brandConfig: {
        brandName: "AZURA solution",
        brandLayoutDesktop: "logo-only",
        brandLayoutMobile: "text-only",
        areaStyle: "soft",
        brandNameTypography: { fontWeight: 700, sizeDesktop: "1.5rem" },
      },
      siteName: "Safar Al-Madina",
    });

    assert.equal(merged.branding.brandLayoutDesktop, "logo-only");
    assert.equal(merged.branding.brandLayoutMobile, "text-only");
    assert.equal(merged.branding.areaStyle, "soft");
    assert.equal(merged.branding.brandName, "Safar Al-Madina");
    assert.equal(merged.branding.brandNameTypography.fontWeight, 700);
    assert.equal(merged.branding.brandNameTypography.sizeDesktop, "1.5rem");
  });

  it("keeps workspace branding when theme brandConfig is still factory defaults", () => {
    const workspace = createDefaultWorkspace();
    workspace.branding = normalizeBranding({
      brandLayoutDesktop: "logo-only",
      brandName: "Custom Workspace Brand",
    });

    const merged = mergeHeaderWorkspaceWithTheme(workspace, {
      brandConfig: normalizeBranding({}),
    });

    assert.equal(merged.branding.brandLayoutDesktop, "logo-only");
    assert.equal(merged.branding.brandName, "Custom Workspace Brand");
  });
});
