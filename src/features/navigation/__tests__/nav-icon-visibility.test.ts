import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  navIconVisibilityDataAttributes,
  resolveNavIconBreakpoint,
  resolveNavIconVisibility,
  shouldMountMobileNavIcons,
  shouldShowNavIconsAtBreakpoint,
} from "@/features/navigation/nav-icon-visibility";
import { isLegacyFaNavIcon, NavMenuGlyph } from "@/features/navigation/components/header/NavMenuGlyph";
import { createDefaultWorkspace } from "@/features/navigation/defaults";
import { buildHeaderRootPresentation } from "@/features/navigation/header-root-attributes";

test("resolveNavIconVisibility defaults all breakpoints on", () => {
  const v = resolveNavIconVisibility({});
  assert.deepEqual(v, { mobile: true, tablet: true, desktop: true });
  assert.equal(shouldMountMobileNavIcons(v), true);
});

test("resolveNavIconVisibility legacy mobile off also turns tablet off when tablet unset", () => {
  const v = resolveNavIconVisibility({ mobileNavShowIcons: false });
  assert.deepEqual(v, { mobile: false, tablet: false, desktop: true });
  assert.equal(shouldMountMobileNavIcons(v), false);
});

test("resolveNavIconVisibility tablet can override legacy mobile fallback", () => {
  const v = resolveNavIconVisibility({
    mobileNavShowIcons: false,
    tabletNavShowIcons: true,
  });
  assert.deepEqual(v, { mobile: false, tablet: true, desktop: true });
  assert.equal(shouldMountMobileNavIcons(v), true);
});

test("resolveNavIconVisibility desktop can be disabled independently", () => {
  const v = resolveNavIconVisibility({ desktopNavShowIcons: false });
  assert.deepEqual(v, { mobile: true, tablet: true, desktop: false });
});

test("navIconVisibilityDataAttributes emit true/false strings", () => {
  assert.deepEqual(
    navIconVisibilityDataAttributes({ mobile: true, tablet: false, desktop: true }),
    {
      "data-nav-icons-mobile": "true",
      "data-nav-icons-tablet": "false",
      "data-nav-icons-desktop": "true",
    },
  );
});

test("buildHeaderRootPresentation includes nav icon visibility attributes", () => {
  const workspace = createDefaultWorkspace();
  workspace.settings = {
    ...workspace.settings,
    mobileNavShowIcons: false,
    tabletNavShowIcons: true,
    desktopNavShowIcons: false,
  };

  const presentation = buildHeaderRootPresentation({ workspace, sticky: true });
  assert.equal(presentation.dataAttributes["data-nav-icons-mobile"], "false");
  assert.equal(presentation.dataAttributes["data-nav-icons-tablet"], "true");
  assert.equal(presentation.dataAttributes["data-nav-icons-desktop"], "false");
});

test("isLegacyFaNavIcon detects FA class suffixes only", () => {
  assert.equal(isLegacyFaNavIcon("fa-star"), true);
  assert.equal(isLegacyFaNavIcon("fa-chevron-right"), true);
  assert.equal(isLegacyFaNavIcon("search"), false);
  assert.equal(isLegacyFaNavIcon("home"), false);
});

test("resolveNavIconBreakpoint maps width bands", () => {
  assert.equal(resolveNavIconBreakpoint(390), "mobile");
  assert.equal(resolveNavIconBreakpoint(640), "mobile");
  assert.equal(resolveNavIconBreakpoint(641), "tablet");
  assert.equal(resolveNavIconBreakpoint(968), "tablet");
  assert.equal(resolveNavIconBreakpoint(969), "desktop");
});

test("shouldShowNavIconsAtBreakpoint respects visibility map", () => {
  const v = { mobile: false, tablet: true, desktop: false };
  assert.equal(shouldShowNavIconsAtBreakpoint(v, "mobile"), false);
  assert.equal(shouldShowNavIconsAtBreakpoint(v, "tablet"), true);
  assert.equal(shouldShowNavIconsAtBreakpoint(v, "desktop"), false);
});
