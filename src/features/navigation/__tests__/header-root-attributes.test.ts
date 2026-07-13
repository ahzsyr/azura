import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultWorkspace } from "@/features/navigation/defaults";
import { buildHeaderRootPresentation } from "@/features/navigation/header-root-attributes";

test("buildHeaderRootPresentation includes overlay attributes for site shell", () => {
  const workspace = createDefaultWorkspace();
  workspace.settings = {
    ...workspace.settings,
    headerStyle: "boxed-compact",
    overlayMode: "over-media",
    overlaySurface: "glass",
    mobileType: "hamburger",
  };

  const shell = buildHeaderRootPresentation({
    workspace,
    surface: "site",
    themePreset: "CLASSIC",
    sticky: true,
    shellPlaceholder: true,
  });
  const renderer = buildHeaderRootPresentation({
    workspace,
    surface: "site",
    themePreset: "CLASSIC",
    sticky: true,
  });

  assert.equal(shell.dataAttributes["data-header-style"], "boxed-compact");
  assert.equal(shell.dataAttributes["data-overlay-mode"], "over-media");
  assert.equal(shell.dataAttributes["data-overlay-surface"], "glass");
  assert.equal(shell.dataAttributes["data-header-overlay"], "true");
  assert.equal(shell.dataAttributes["data-header-shell"], "true");
  assert.equal(renderer.dataAttributes["data-header-overlay"], "true");
  assert.equal(renderer.dataAttributes["data-overlay-mode"], shell.dataAttributes["data-overlay-mode"]);
  assert.equal(renderer.dataAttributes["data-mobile-nav-animation"], shell.dataAttributes["data-mobile-nav-animation"]);
});
