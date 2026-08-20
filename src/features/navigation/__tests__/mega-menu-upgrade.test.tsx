import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { headerWorkspaceSchema } from "@/schemas/navigation";
import type { HeaderWorkspace, MenuItem } from "@/features/navigation/types";
import { resolveMegaMenuChildDisplayType, resolveMegaMenuConfig, resolveMegaMenu } from "@/features/navigation/mega-menu-resolver";
import { initMegaFormState, megaFormToPersistedConfig, clampMegaColumns, addNavPanelPair, removeNavPanelPair, buildSidebarScaffold } from "@/features/navigation/mega-menu-form";
import { validateMegaMenuV2Config } from "@/features/navigation/mega-menu-validate";
import { megaMenuPresetService } from "@/features/navigation/mega-menu-presets";
import { MegaMenuSurface } from "@/features/navigation/components/header/MegaMenu/MegaMenuSurface";
import { MegaMenuCarousel } from "@/features/navigation/components/header/MegaMenu/MegaMenuCarousel";

function childMenuItem(partial: Partial<MenuItem> & Pick<MenuItem, "id" | "type" | "label">): MenuItem {
  return {
    placement: "both",
    children: [],
    ...partial,
  };
}

function baseWorkspaceWithItems(items: MenuItem[]): HeaderWorkspace {
  return {
    version: 1,
    menusDatabase: {
      mainMenu: {
        name: "Main Menu",
        items,
        globalApply: "Both",
      },
    },
    activeMenuKey: "mainMenu",
    branding: {
      logoMode: "text",
      logoText: "AZ",
      logoImageLightUrl: "",
      logoImageDarkUrl: "",
      brandName: "Brand",
      tagline: "Tagline",
      showTagline: true,
      areaStyle: "default",
      brandLayoutMobile: "logo-and-text",
      brandLayoutDesktop: "logo-and-text",
    },
    headerActions: [],
    settings: {
      headerStyle: "normal-compact",
      menuType: "dropdown",
      mobileType: "hamburger",
      headerDesktopMode: "sticky",
    },
  };
}

describe("mega menu upgrade schema", () => {
  it("accepts megaMenuType icon + iconLayout", () => {
    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Products",
      placement: "both",
      children: [],
      megaMenuType: "icon",
      megaMenu: {
        iconLayout: {
          iconSize: "lg",
          columns: 4,
          alignment: "center",
          iconPosition: "left",
          showDescriptions: false,
          showBadges: true,
          spacing: "compact",
        },
      },
    };
    assert.doesNotThrow(() => headerWorkspaceSchema.parse(baseWorkspaceWithItems([parent])));
  });

  it("persists non-default iconLayout via mega form helpers", () => {
    const item: MenuItem = {
      id: "p",
      type: "link",
      label: "P",
      placement: "both",
      children: [],
      megaMenuType: "icon",
      megaMenu: { iconLayout: { columns: 8, showBadges: false } },
    };
    const form = initMegaFormState(item);
    assert.equal(form.iconLayout.columns, 8);
    assert.equal(form.iconLayout.showBadges, false);
    const persisted = megaFormToPersistedConfig(form);
    assert.equal(persisted?.iconLayout?.columns, 8);
    assert.equal(persisted?.iconLayout?.showBadges, false);
    assert.equal(persisted?.iconLayout?.iconSize, undefined);
  });

  it("accepts icon layout columns from 1 through 12", () => {
    for (const columns of [1, 5, 6, 8, 12] as const) {
      const parent: MenuItem = {
        id: "p",
        type: "link",
        label: "Products",
        placement: "both",
        children: [],
        megaMenuType: "icon",
        megaMenu: { iconLayout: { columns } },
      };
      assert.doesNotThrow(() => headerWorkspaceSchema.parse(baseWorkspaceWithItems([parent])));
    }
  });

  it("accepts gridColumns and columnCount from 1 through 12", () => {
    for (const n of [1, 5, 8, 12] as const) {
      const gridParent: MenuItem = {
        id: "g",
        type: "link",
        label: "Grid",
        placement: "both",
        children: [],
        megaMenuType: "grid",
        megaMenu: { gridColumns: n },
      };
      const columnsParent: MenuItem = {
        id: "c",
        type: "link",
        label: "Columns",
        placement: "both",
        children: [],
        megaMenuType: "columns",
        megaMenu: { columnCount: n },
      };
      assert.doesNotThrow(() => headerWorkspaceSchema.parse(baseWorkspaceWithItems([gridParent, columnsParent])));
      assert.equal(clampMegaColumns(n), n);
    }
    assert.equal(clampMegaColumns(0), 1);
    assert.equal(clampMegaColumns(99), 12);
  });

  it("accepts megaMenuChildDisplayType + width/height", () => {
    const child = childMenuItem({
      id: "c1",
      type: "collection",
      label: "Brands",
      imageUrl: "/brands.jpg",
      megaMenuChildDisplayType: "card",
      icon: "search",
    });

    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [child],
      megaMenuType: "grid",
      megaMenu: { width: "sm", height: "md", dropdownShowIcons: true },
    };

    const ws = baseWorkspaceWithItems([parent]);
    assert.doesNotThrow(() => headerWorkspaceSchema.parse(ws));
  });

  it("rejects invalid megaMenuChildDisplayType", () => {
    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [
      childMenuItem({
        id: "c1",
        type: "collection",
        label: "Brands",
        megaMenuChildDisplayType: "nope" as unknown as "automatic" | "link" | "card",
      }),
      ],
      megaMenuType: "grid",
    };

    const ws = baseWorkspaceWithItems([parent]);
    assert.throws(() => headerWorkspaceSchema.parse(ws));
  });

  it("rejects out-of-range custom width/height", () => {
    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [],
      megaMenuType: "grid",
      megaMenu: {
        width: "custom",
        customWidth: -10,
        height: "custom",
        customHeight: 5000,
      },
    };

    const ws = baseWorkspaceWithItems([parent]);
    assert.throws(() => headerWorkspaceSchema.parse(ws));
  });

  it("remains permissive for unknown megaMenu properties", () => {
    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [],
      megaMenuType: "grid",
      megaMenu: {
        width: "sm",
        // should be allowed via passthrough
        unknownProp: { a: 1 },
      },
    };

    const ws = baseWorkspaceWithItems([parent]);
    assert.doesNotThrow(() => headerWorkspaceSchema.parse(ws));
  });
});

describe("mega menu resolver", () => {
  it("card/link explicit displayType override automatic detection", () => {
    const child: MenuItem = childMenuItem({
      id: "c1",
      type: "collection",
      label: "Brands",
      imageUrl: "/brands.jpg",
      megaMenuChildDisplayType: "link",
    });

    assert.equal(resolveMegaMenuChildDisplayType(child, "grid"), "link");
  });

  it("automatic uses existing visual-card detection behavior", () => {
    const child: MenuItem = childMenuItem({
      id: "c1",
      type: "collection",
      label: "Brands",
      imageUrl: "/brands.jpg",
      megaMenuChildDisplayType: "automatic",
    });

    assert.equal(resolveMegaMenuChildDisplayType(child, "grid"), "card");
  });

  it("clamps custom width/height in resolver", () => {
    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [],
      megaMenu: {
        width: "custom",
        customWidth: -10,
        height: "custom",
        customHeight: 50000,
      },
    };

    const resolved = resolveMegaMenuConfig(parent, "grid");
    assert.match(resolved.cssVariables["--mega-menu-width"] ?? "", /px$/);
    assert.equal(resolved.cssVariables["--mega-menu-overflow-y"], "auto");
    assert.equal(resolved.cssVariables["--mega-menu-max-height"], "1200px");
  });
});

describe("mega menu rendering", () => {
  it("renders a card caption icon when displayType=card", () => {
    const item: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [
        childMenuItem({
          id: "c1",
          type: "collection",
          label: "Brands",
          imageUrl: "/brands.jpg",
          megaMenuChildDisplayType: "card",
          icon: "search",
        }),
      ],
      megaMenuType: "grid",
      megaMenu: { width: "sm", height: "auto" },
    };

    const html = renderToStaticMarkup(
      <MegaMenuSurface item={item} menuType="grid" localeCode="en" isOpen />,
    );

    assert.ok(html.includes("hb-mega-card--visual"));
    assert.ok(html.includes("hb-mega-card__caption"));
    assert.ok(html.includes("hb-nav-icon")); // Icon component className
    assert.match(html, /--mega-menu-width:\s*640px/);
  });

  it("renders normal link/text when displayType=link (even if visual auto would match)", () => {
    const item: MenuItem = {
      id: "p",
      type: "link",
      label: "Parent",
      placement: "both",
      children: [
        childMenuItem({
          id: "c1",
          type: "collection",
          label: "Brands",
          imageUrl: "/brands.jpg",
          megaMenuChildDisplayType: "link",
          icon: "search",
        }),
      ],
      megaMenuType: "grid",
      megaMenu: { width: "sm", height: "auto" },
    };

    const html = renderToStaticMarkup(
      <MegaMenuSurface item={item} menuType="grid" localeCode="en" isOpen />,
    );

    assert.ok(html.includes("hb-mega-card--text"));
    assert.ok(!html.includes("hb-mega-card--visual"));
    assert.ok(!html.includes("hb-mega-card__caption"));
  });

  it("renders icon layout from parent megaMenuType=icon using child MenuItem.icon", () => {
    const item: MenuItem = {
      id: "p",
      type: "link",
      label: "Products",
      placement: "both",
      children: [
        childMenuItem({
          id: "c1",
          type: "page",
          label: "Routers",
          icon: "search",
          badgeText: "New",
          pageId: "routers",
        }),
        childMenuItem({
          id: "c2",
          type: "page",
          label: "Switches",
          icon: "fa-network-wired",
          pageId: "switches",
        }),
      ],
      megaMenuType: "icon",
      megaMenu: {
        iconLayout: {
          iconSize: "md",
          columns: 3,
          alignment: "end",
          showBadges: true,
          showDescriptions: true,
        },
        childDescriptions: { c1: "Enterprise routers" },
      },
    };

    const ws = baseWorkspaceWithItems([item]);
    assert.doesNotThrow(() => headerWorkspaceSchema.parse(ws));

    const html = renderToStaticMarkup(
      <MegaMenuSurface item={item} menuType="icon" localeCode="en" isOpen />,
    );

    assert.ok(html.includes('data-mega-menu="icon"'));
    assert.ok(html.includes('data-icon-align="end"'));
    assert.ok(html.includes("hb-icon-layout-item"));
    assert.ok(html.includes("minmax(5.5rem, max-content)"));
    assert.ok(html.includes("Routers"));
    assert.ok(html.includes("Switches"));
    assert.ok(html.includes("hb-icon-layout-item__badge"));
    assert.ok(html.includes("Enterprise routers"));
    // Sibling parent without icon layout must remain unchanged path — grid still works
    const gridParent: MenuItem = {
      ...item,
      id: "p2",
      megaMenuType: "grid",
      megaMenu: { gridColumns: 3 },
    };
    const gridHtml = renderToStaticMarkup(
      <MegaMenuSurface item={gridParent} menuType="grid" localeCode="en" isOpen />,
    );
    assert.ok(gridHtml.includes('data-mega-menu="grid"'));
    assert.ok(!gridHtml.includes('data-mega-menu="icon"'));
  });
});

describe("mega menu v2 sidebar/panel", () => {
  function v2SidebarParent(): MenuItem {
    const c1 = childMenuItem({ id: "c1", type: "link", label: "Simple", url: "/simple", icon: "sparkles" });
    const c2 = childMenuItem({ id: "c2", type: "link", label: "Large", url: "/large" });
    const c3 = childMenuItem({ id: "c3", type: "product", label: "Enterprise", productId: "ent", imageUrl: "/p.jpg" });
    const panelHow = "panel-how";
    const panelProd = "panel-prod";
    return {
      id: "start",
      type: "link",
      label: "Start Here",
      placement: "both",
      children: [c1, c2, c3],
      megaMenuType: "sidebar",
      megaMenu: {
        version: 2,
        surfaceWidth: "container",
        alignment: "center",
        navigation: {
          enabled: true,
          width: 220,
          items: [
            { id: "nav-how", label: "How It Works?", panelId: panelHow },
            { id: "nav-prod", label: "Switching", panelId: panelProd },
          ],
        },
        panels: [
          {
            id: panelHow,
            label: "How It Works?",
            layout: "cards",
            columns: 3,
            childIds: ["c1", "c2"],
          },
          {
            id: panelProd,
            label: "Switching",
            layout: "productGrid",
            columns: 4,
            childIds: ["c3"],
          },
        ],
        childDescriptions: { c1: "Easy setup" },
      },
    };
  }

  it("accepts v2 sidebar schema", () => {
    assert.doesNotThrow(() => headerWorkspaceSchema.parse(baseWorkspaceWithItems([v2SidebarParent()])));
  });

  it("does not treat sidebar as v2 without version: 2", () => {
    const parent = v2SidebarParent();
    parent.megaMenu = { ...(parent.megaMenu ?? {}), version: undefined };
    const view = resolveMegaMenu(parent, "en");
    assert.equal(view.isV2, false);
  });

  it("rejects duplicate child assignment across panels", () => {
    const parent = v2SidebarParent();
    parent.megaMenu!.panels![1].childIds = ["c1", "c3"];
    const issues = validateMegaMenuV2Config(parent, parent.megaMenu!);
    assert.ok(issues.some((i) => i.code === "duplicate_child_assignment"));
  });

  it("rejects navigation pointing at unknown panel", () => {
    const parent = v2SidebarParent();
    parent.megaMenu!.navigation!.items[0].panelId = "missing";
    const issues = validateMegaMenuV2Config(parent, parent.megaMenu!);
    assert.ok(issues.some((i) => i.code === "unknown_panel_id"));
  });

  it("form round-trips v2 navigation/panels/surface", () => {
    const parent = v2SidebarParent();
    const form = initMegaFormState(parent);
    assert.equal(form.version, 2);
    assert.equal(form.navigationEnabled, true);
    assert.equal(form.panels.length, 2);
    assert.equal(form.surfaceWidth, "container");
    form.alignment = "left";
    form.panels[0].carousel = { enabled: true, arrows: true };
    form.panels[0].featured = { childId: "c1", ctaLabel: "Learn More" };
    form.panels[0].columnGroups = [
      { id: "g1", heading: "Cloud", childIds: ["c1"], ctaLabel: "All" },
    ];
    const persisted = megaFormToPersistedConfig(form);
    assert.equal(persisted?.version, 2);
    assert.equal(persisted?.alignment, "left");
    assert.equal(persisted?.navigation?.enabled, true);
    assert.equal(persisted?.panels?.[0]?.carousel?.enabled, true);
    assert.equal(persisted?.panels?.[0]?.featured?.childId, "c1");
    assert.equal(persisted?.panels?.[0]?.columnGroups?.[0]?.heading, "Cloud");

    const roundTrip = initMegaFormState({
      ...parent,
      megaMenu: persisted,
    });
    assert.equal(roundTrip.version, 2);
    assert.equal(roundTrip.alignment, "left");
    assert.equal(roundTrip.panels[0].carousel?.enabled, true);
    assert.equal(roundTrip.panels[0].featured?.childId, "c1");
    assert.equal(roundTrip.panels[0].columnGroups?.[0]?.heading, "Cloud");
    assert.deepEqual(roundTrip.panels[0].childIds, ["c1", "c2"]);
  });

  it("resolveMegaMenu builds view model for sidebar", () => {
    const view = resolveMegaMenu(v2SidebarParent(), "en");
    assert.equal(view.isV2, true);
    assert.equal(view.type, "sidebar");
    assert.ok(view.navigation?.enabled);
    assert.equal(view.panels.length, 2);
    assert.equal(view.activePanelId, "panel-how");
    assert.ok(view.cssVars["--mega-menu-rail-width"]);
    assert.equal(view.panels[0].children.length, 2);
    assert.equal(view.panels[0].children[0].displayType, "card");
  });

  it("renders sidebar rail + panel without breaking v1 dropdown", () => {
    const sidebar = v2SidebarParent();
    const html = renderToStaticMarkup(
      <MegaMenuSurface item={sidebar} menuType="sidebar" localeCode="en" isOpen />,
    );
    assert.ok(html.includes('data-mega-menu="sidebar"'));
    assert.ok(html.includes("hb-mega-v2-sidebar"));
    assert.ok(html.includes("How It Works?"));
    assert.ok(html.includes("Simple"));

    const dropdown: MenuItem = {
      id: "d",
      type: "link",
      label: "Help",
      placement: "both",
      megaMenuType: "dropdown",
      children: [childMenuItem({ id: "x", type: "link", label: "Docs", url: "/docs" })],
    };
    const dropHtml = renderToStaticMarkup(
      <MegaMenuSurface item={dropdown} menuType="dropdown" localeCode="en" isOpen />,
    );
    assert.ok(dropHtml.includes('data-mega-menu="dropdown"'));
    assert.ok(dropHtml.includes("Docs"));
    assert.ok(!dropHtml.includes("hb-mega-v2-sidebar"));
  });

  it("renders panel productGrid without rail", () => {
    const child = childMenuItem({
      id: "p1",
      type: "product",
      label: "Professional",
      productId: "pro",
      imageUrl: "/pro.jpg",
      badgeText: "NEW",
    });
    const item: MenuItem = {
      id: "switching",
      type: "link",
      label: "Switching",
      placement: "both",
      children: [child],
      megaMenuType: "panel",
      megaMenu: {
        version: 2,
        surfaceWidth: "container",
        panels: [
          {
            id: "panel-main",
            layout: "productGrid",
            columns: 6,
            childIds: ["p1"],
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      <MegaMenuSurface item={item} menuType="panel" localeCode="en" isOpen />,
    );
    assert.ok(html.includes('data-mega-menu="panel"'));
    assert.ok(html.includes("hb-mega-v2-product"));
    assert.ok(html.includes("Professional"));
    assert.ok(!html.includes("hb-mega-v2-sidebar"));
  });

  it("v1 grid/mixed/columns/tabbed/icon still render their data attributes", () => {
    const child = childMenuItem({ id: "c", type: "link", label: "Item", url: "/i" });
    for (const type of ["grid", "mixed", "columns", "tabbed", "icon"] as const) {
      const item: MenuItem = {
        id: type,
        type: "link",
        label: type,
        placement: "both",
        children: [child],
        megaMenuType: type,
        megaMenu:
          type === "icon"
            ? { iconLayout: { columns: 2 } }
            : type === "mixed"
              ? { mixed: { left: { title: "L" }, right: { title: "R" } } }
              : type === "tabbed"
                ? { tabs: [{ id: "t1", label: "Tab", childIds: ["c"] }] }
                : { gridColumns: 3, columnCount: 3 },
      };
      const html = renderToStaticMarkup(
        <MegaMenuSurface item={item} menuType={type} localeCode="en" isOpen />,
      );
      assert.ok(html.includes(`data-mega-menu="${type}"`), `expected ${type}`);
      assert.ok(!html.includes("hb-mega-v2-sidebar"));
    }
  });

  it("presets generate ordinary v2 config without preset id", () => {
    const built = megaMenuPresetService.build("unifi-start-here");
    assert.ok(built);
    assert.equal(built!.megaMenuType, "sidebar");
    assert.equal(built!.megaMenu.version, 2);
    assert.equal(built!.megaMenu.navigation?.items?.length, 4);
    assert.equal(built!.megaMenu.panels?.length, 4);
    assert.ok(built!.children.length);
    assert.equal((built!.megaMenu as { presetId?: string }).presetId, undefined);
  });

  it("addNavPanelPair and removeNavPanelPair keep nav.panelId aligned with panels", () => {
    const base = initMegaFormState(null);
    const withPair = addNavPanelPair(base, "New Section", "featured");
    assert.equal(withPair.navigationItems.length, 1);
    assert.equal(withPair.panels.length, 1);
    assert.equal(withPair.navigationItems[0].panelId, withPair.panels[0].id);

    const withTwo = addNavPanelPair(withPair, "Second", "iconGrid");
    assert.equal(withTwo.navigationItems.length, 2);
    assert.equal(withTwo.panels.length, 2);
    for (const nav of withTwo.navigationItems) {
      assert.ok(withTwo.panels.some((p) => p.id === nav.panelId));
    }

    const removed = removeNavPanelPair(withTwo, withTwo.panels[0].id);
    assert.equal(removed.navigationItems.length, 1);
    assert.equal(removed.panels.length, 1);
    assert.equal(removed.navigationItems[0].panelId, removed.panels[0].id);
  });

  it("childCtaLabels round-trips and maps to view model ctaLabel", () => {
    const parent = v2SidebarParent();
    parent.megaMenu!.childCtaLabels = { c1: "View All" };
    const form = initMegaFormState(parent);
    assert.equal(form.childCtaLabels.c1, "View All");
    const persisted = megaFormToPersistedConfig(form);
    assert.equal(persisted?.childCtaLabels?.c1, "View All");

    const view = resolveMegaMenu(parent, "en");
    const childVm = view.panels[0].children.find((c) => c.id === "c1");
    assert.equal(childVm?.ctaLabel, "View All");
    assert.equal(childVm?.subtitle, "Easy setup");
  });

  it("buildSidebarScaffold creates 4 paired sections", () => {
    const scaffold = buildSidebarScaffold(true);
    assert.equal(scaffold.navigationItems.length, 4);
    assert.equal(scaffold.panels.length, 4);
    assert.equal(scaffold.navigationItems[0].label, "How It Works?");
    assert.equal(scaffold.panels[0].layout, "iconGrid");
    assert.equal(scaffold.panels[1].layout, "featured");
    assert.equal(scaffold.panels[1].carousel?.enabled, true);
    assert.equal(scaffold.panels[3].layout, "mixed");
    for (const nav of scaffold.navigationItems) {
      assert.ok(scaffold.panels.some((p) => p.id === nav.panelId));
    }
  });

  it("unifi-start-here preset validates as v2 sidebar with 4 sections", () => {
    const built = megaMenuPresetService.build("unifi-start-here");
    assert.ok(built);
    const parent: MenuItem = {
      id: "start",
      type: "link",
      label: "Start Here",
      placement: "both",
      children: built!.children,
      megaMenuType: built!.megaMenuType,
      megaMenu: built!.megaMenu,
    };
    assert.equal(validateMegaMenuV2Config(parent, built!.megaMenu).length, 0);
    assert.equal(built!.megaMenu.navigation?.items?.length, 4);
    assert.equal(built!.megaMenu.panels?.length, 4);
  });

  it("unifi-switching preset is panel productGrid with separate subtitle and Compare All CTA", () => {
    const built = megaMenuPresetService.build("unifi-switching");
    assert.ok(built);
    assert.equal(built!.megaMenuType, "panel");
    assert.equal(built!.megaMenu.panels?.[0]?.layout, "productGrid");
    assert.equal(built!.megaMenu.panels?.[0]?.columns, 6);
    assert.equal(built!.megaMenu.navigation?.items?.length ?? 0, 0);

    const overview = built!.children[0];
    assert.equal(built!.megaMenu.childDescriptions?.[overview.id], "Scale-ready with full-feature switching.");
    assert.equal(built!.megaMenu.childCtaLabels?.[overview.id], "Compare All");

    const parent: MenuItem = {
      id: "switching",
      type: "link",
      label: "Switching",
      placement: "both",
      children: built!.children,
      megaMenuType: "panel",
      megaMenu: built!.megaMenu,
    };
    const view = resolveMegaMenu(parent, "en");
    const overviewVm = view.panels[0].children.find((c) => c.id === overview.id);
    assert.equal(overviewVm?.subtitle, "Scale-ready with full-feature switching.");
    assert.equal(overviewVm?.ctaLabel, "Compare All");
  });

  it("MegaMenuCarousel renders prev and next arrow buttons on left and right", () => {
    const html = renderToStaticMarkup(
      <MegaMenuCarousel enabled arrows>
        <div>slide</div>
      </MegaMenuCarousel>,
    );
    assert.ok(html.includes('aria-label="Previous"'));
    assert.ok(html.includes('aria-label="Next"'));
    assert.ok(html.includes("hb-mega-v2-carousel__arrow--prev"));
    assert.ok(html.includes("hb-mega-v2-carousel__arrow--next"));
  });
});

