/**
 * Phase 2 mobile-nav accessibility tests.
 *
 * Tests that the MobileNavOverlay component:
 *   1. Gives the search <input> an accessible name.
 *   2. Uses proper ARIA roles for the Radix Tabs panel (tablist / tab / tabpanel).
 *
 * The component uses DialogPrimitive.Content which requires a DialogPrimitive.Root
 * context.  We wrap with an open Root so forceMount renders the content in the
 * static HTML snapshot.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MobileNavOverlay } from "@/features/navigation/components/header/MobileMenu/MobileMenuPreview";
import type { MenuItem } from "@/features/navigation/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(
  id: string,
  label: string,
  children: MenuItem[] = [],
): MenuItem {
  return {
    id,
    type: "link",
    label,
    placement: "both",
    children,
  };
}

const baseProps = {
  items: [] as MenuItem[],
  actions: [],
  onClose: () => {},
  localeCode: "en",
  showIcons: false,
  showArrows: false,
} as const;

function renderOverlay(jsx: React.ReactElement): string {
  // DialogPrimitive.Root open=true so Radix context is active;
  // forceMount inside MobileNavOverlay ensures Content renders in SSR regardless.
  return renderToStaticMarkup(
    <DialogPrimitive.Root open>{jsx}</DialogPrimitive.Root>,
  );
}

// ---------------------------------------------------------------------------
// Search accessible name
// ---------------------------------------------------------------------------

describe("mobile nav search: accessible name", () => {
  it("search input carries aria-label='Search'", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="search" {...baseProps} />,
    );
    assert.ok(
      html.includes('aria-label="Search"'),
      "input should have aria-label=\"Search\"",
    );
  });

  it("search input has a matching visually-hidden <label>", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="search" {...baseProps} />,
    );
    assert.ok(
      html.includes('<label') && html.includes("sr-only"),
      "should render a <label class='sr-only'> for the search input",
    );
  });

  it("placeholder is still present as a hint alongside the explicit label", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="search" {...baseProps} />,
    );
    assert.ok(
      html.includes('placeholder="Search'),
      "placeholder should remain as a secondary hint",
    );
  });
});

// ---------------------------------------------------------------------------
// Tabs ARIA roles (Radix Tabs)
// ---------------------------------------------------------------------------

describe("mobile nav tabs: ARIA roles from Radix Tabs", () => {
  const items: MenuItem[] = [
    makeItem("products", "Products", [makeItem("c1", "Routers")]),
    makeItem("support", "Support", [makeItem("c2", "Docs")]),
  ];

  it("tabs list has role='tablist'", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="tabs" {...baseProps} items={items} />,
    );
    assert.ok(html.includes('role="tablist"'), "tabs bar must be role=tablist");
  });

  it("each trigger has role='tab'", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="tabs" {...baseProps} items={items} />,
    );
    const count = (html.match(/role="tab"/g) ?? []).length;
    assert.equal(count, 2, "should render one role=tab per tab item");
  });

  it("active tab panel has role='tabpanel'", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="tabs" {...baseProps} items={items} />,
    );
    assert.ok(html.includes('role="tabpanel"'), "active panel must be role=tabpanel");
  });

  it("falls back to a single 'Menu' tab when no items have children", () => {
    const flat: MenuItem[] = [makeItem("a", "Alpha"), makeItem("b", "Beta")];
    const html = renderOverlay(
      <MobileNavOverlay type="tabs" {...baseProps} items={flat} />,
    );
    // Single synthetic tab rendered
    const tabCount = (html.match(/role="tab"/g) ?? []).length;
    assert.equal(tabCount, 1, "should render a single fallback Menu tab");
    assert.ok(html.includes(">Menu<"), "fallback tab label should be 'Menu'");
  });

  it("tabs bar has mnav-tabs-bar class for visual styling", () => {
    const html = renderOverlay(
      <MobileNavOverlay type="tabs" {...baseProps} items={items} />,
    );
    assert.ok(
      html.includes('class="mnav-tabs-bar"') || html.includes("mnav-tabs-bar"),
      "TabsList should carry the mnav-tabs-bar CSS class",
    );
  });
});
