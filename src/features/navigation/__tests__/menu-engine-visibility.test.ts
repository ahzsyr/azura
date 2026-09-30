import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { HeaderWorkspace, MenuItem } from "@/features/navigation/types";
import {
  filterMenuItemsForSurface,
  isMenuItemLiveVisible,
  resolveMenuForSurface,
} from "@/features/navigation/menu-engine";

function linkItem(
  partial: Partial<MenuItem> & Pick<MenuItem, "id" | "label">,
): MenuItem {
  return {
    type: "link",
    placement: "both",
    url: `/${partial.id}`,
    children: [],
    visibility: "visible",
    ...partial,
  };
}

function workspaceWithItems(items: MenuItem[]): HeaderWorkspace {
  return {
    version: 1,
    activeMenuKey: "mainMenu",
    menusDatabase: {
      mainMenu: { name: "Main", globalApply: "Both", items },
    },
    branding: {} as HeaderWorkspace["branding"],
    headerActions: [],
    settings: {} as HeaderWorkspace["settings"],
  };
}

describe("menu item live visibility", () => {
  it("treats unset visibility as visible", () => {
    assert.equal(isMenuItemLiveVisible(linkItem({ id: "a", label: "A", visibility: undefined })), true);
  });

  it("excludes hidden and draft items", () => {
    assert.equal(isMenuItemLiveVisible(linkItem({ id: "h", label: "H", visibility: "hidden" })), false);
    assert.equal(isMenuItemLiveVisible(linkItem({ id: "d", label: "D", visibility: "draft" })), false);
  });

  it("excludes scheduled items until start time", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    assert.equal(
      isMenuItemLiveVisible(linkItem({ id: "s", label: "Soon", visibility: "scheduled", scheduledAt: future })),
      false,
    );
    assert.equal(
      isMenuItemLiveVisible(linkItem({ id: "s2", label: "Ready", visibility: "scheduled", scheduledAt: past })),
      true,
    );
  });
});

describe("filterMenuItemsForSurface", () => {
  it("drops hidden nested items from flyouts and mobile nav", () => {
    const items = [
      linkItem({
        id: "products",
        label: "Products",
        children: [
          linkItem({ id: "wifi", label: "WiFi" }),
          linkItem({ id: "legacy", label: "Legacy", visibility: "hidden" }),
          linkItem({ id: "draft-kit", label: "Draft kit", visibility: "draft" }),
        ],
      }),
    ];

    const desktop = filterMenuItemsForSurface(items, "desktop");
    assert.equal(desktop.length, 1);
    assert.deepEqual(
      desktop[0]?.children.map((c) => c.id),
      ["wifi"],
    );

    const mobile = filterMenuItemsForSurface(items, "mobile");
    assert.deepEqual(
      mobile[0]?.children.map((c) => c.id),
      ["wifi"],
    );
  });

  it("drops a hidden parent and all of its children", () => {
    const items = [
      linkItem({
        id: "hidden-parent",
        label: "Hidden",
        visibility: "hidden",
        children: [linkItem({ id: "child", label: "Child" })],
      }),
      linkItem({ id: "about", label: "About" }),
    ];

    const filtered = filterMenuItemsForSurface(items, "desktop");
    assert.deepEqual(
      filtered.map((i) => i.id),
      ["about"],
    );
  });

  it("does not show mobile-only children in the desktop flyout", () => {
    const items = [
      linkItem({
        id: "more",
        label: "More",
        children: [
          linkItem({ id: "desktop-only", label: "Desktop", placement: "desktop" }),
          linkItem({ id: "mobile-only", label: "Mobile", placement: "mobile" }),
        ],
      }),
    ];

    const desktop = filterMenuItemsForSurface(items, "desktop");
    assert.deepEqual(
      desktop[0]?.children.map((c) => c.id),
      ["desktop-only"],
    );
    const mobile = filterMenuItemsForSurface(items, "mobile");
    assert.deepEqual(
      mobile[0]?.children.map((c) => c.id),
      ["mobile-only"],
    );
  });
});

describe("resolveMenuForSurface", () => {
  it("hides nested items from live header and mobile navigation", () => {
    const workspace = workspaceWithItems([
      linkItem({
        id: "services",
        label: "Services",
        children: [
          linkItem({ id: "wifi", label: "WiFi" }),
          linkItem({ id: "hidden-service", label: "Internal", visibility: "hidden" }),
        ],
      }),
    ]);

    const desktop = resolveMenuForSurface(workspace, "desktop");
    const mobile = resolveMenuForSurface(workspace, "mobile");
    assert.deepEqual(
      desktop[0]?.children.map((c) => c.label),
      ["WiFi"],
    );
    assert.deepEqual(
      mobile[0]?.children.map((c) => c.label),
      ["WiFi"],
    );
  });

  it("still excludes hidden items when placement is ignored", () => {
    const workspace = workspaceWithItems([
      linkItem({ id: "visible", label: "Visible" }),
      linkItem({ id: "hidden", label: "Hidden", visibility: "hidden" }),
    ]);

    const items = resolveMenuForSurface(workspace, "desktop", false);
    assert.deepEqual(
      items.map((i) => i.id),
      ["visible"],
    );
  });
});
