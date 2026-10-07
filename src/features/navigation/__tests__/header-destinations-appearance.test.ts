import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { headerWorkspaceSchema } from "@/schemas/navigation";
import {
  buildSourceFamilies,
  optionsForLeaf,
  resolveSourceTarget,
} from "@/features/navigation/source-families";
import type { HeaderBuilderCatalog, MenuItem } from "@/features/navigation/types";
import {
  resolveEffectiveChildDisplayType,
  resolveMegaMenu,
} from "@/features/navigation/mega-menu-resolver";
import { contentItemPublicPath } from "@/features/content/content-admin-paths";

function emptyCatalog(partial: Partial<HeaderBuilderCatalog> = {}): HeaderBuilderCatalog {
  const contentTypes = partial.contentTypes ?? [];
  const base: HeaderBuilderCatalog = {
    pages: [],
    collections: [],
    brands: [],
    tags: [],
    products: [],
    posts: [],
    contentByType: {},
    contentTypes,
    sourceFamilies: buildSourceFamilies(contentTypes),
  };
  const merged = { ...base, ...partial };
  if (!partial.sourceFamilies) {
    merged.sourceFamilies = buildSourceFamilies(merged.contentTypes);
  }
  return merged;
}

describe("header source families (dynamic destinations)", () => {
  it("does not invent organization/site page leaves", () => {
    const families = buildSourceFamilies([]);
    assert.ok(families.every((section) => section.id === "pages" || section.id === "catalog"));
    const leaves = families.flatMap((s) => s.children ?? []);
    assert.ok(leaves.every((leaf) => leaf.leafKind !== ("sitePage" as string)));
  });

  it("only includes enabled content-type leaves under catalog", () => {
    const families = buildSourceFamilies([
      { slug: "offerings", name: "Services", routePrefix: "services" },
      { slug: "solutions", name: "Solutions", routePrefix: "solutions" },
    ]);
    const catalog = families.find((s) => s.id === "catalog");
    const ids = (catalog?.children ?? []).map((c) => c.id);
    assert.ok(ids.includes("catalog-services"));
    assert.ok(ids.includes("catalog-ct-solutions"));
    assert.ok(!ids.includes("catalog-products"));
    assert.ok(!ids.includes("catalog-packages"));
  });

  it("optionsForLeaf never invents missing page slugs", () => {
    const catalog = emptyCatalog({
      pages: [{ slug: "about", title: "About", status: "PUBLISHED", kind: "cms" }],
    });
    const leaf = catalog.sourceFamilies[0]?.children?.find((c) => c.leafKind === "pages");
    assert.ok(leaf);
    const opts = optionsForLeaf(catalog, leaf!);
    assert.deepEqual(
      opts.map((o) => o.value),
      ["about"],
    );
  });

  it("resolveSourceTarget builds content-type URLs via contentItemPublicPath", () => {
    const catalog = emptyCatalog({
      contentTypes: [{ slug: "offerings", name: "Services", routePrefix: "services" }],
      contentByType: {
        offerings: [{ slug: "managed-wifi", name: "Managed WiFi" }],
      },
    });
    const leaf = catalog.sourceFamilies
      .find((s) => s.id === "catalog")
      ?.children?.find((c) => c.leafKind === "offerings");
    assert.ok(leaf);
    const target = resolveSourceTarget(catalog, leaf!, "managed-wifi");
    assert.equal(target?.type, "link");
    assert.equal(
      target?.url,
      contentItemPublicPath("services", "offerings", "managed-wifi"),
    );
  });
});

describe("mega menu child appearance schema", () => {
  it("remaps legacy link/featured/product and keeps megaMenuImageUrl", () => {
    const item: MenuItem = {
      id: "c1",
      type: "product",
      label: "Widget",
      placement: "both",
      children: [],
      productId: "widget",
      megaMenuChildDisplayType: "product" as never,
      megaMenuImageUrl: "/custom.jpg",
    };
    const parent: MenuItem = {
      id: "p1",
      type: "link",
      label: "Shop",
      placement: "both",
      children: [item],
      url: "/products",
    };
    const parsed = headerWorkspaceSchema.parse({
      version: 1,
      menusDatabase: {
        mainMenu: { name: "Main Menu", items: [parent], globalApply: "Both" },
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
    });
    const child = (parsed.menusDatabase as { mainMenu: { items: MenuItem[] } }).mainMenu.items[0]
      .children[0];
    assert.equal(child.megaMenuChildDisplayType, "card");
    assert.equal(child.megaMenuImageUrl, "/custom.jpg");
  });

  it("resolves per-item list/icon/image/card appearances in v2 panels", () => {
    const listChild: MenuItem = {
      id: "c-list",
      type: "page",
      label: "About",
      placement: "both",
      children: [],
      pageId: "about",
      megaMenuChildDisplayType: "list",
    };
    const iconChild: MenuItem = {
      id: "c-icon",
      type: "collection",
      label: "Cats",
      placement: "both",
      children: [],
      collectionId: "cats",
      megaMenuChildDisplayType: "icon",
      icon: "search",
    };
    const imageChild: MenuItem = {
      id: "c-image",
      type: "product",
      label: "Cam",
      placement: "both",
      children: [],
      productId: "cam",
      megaMenuChildDisplayType: "image",
      imageUrl: "/cam.jpg",
    };
    const cardChild: MenuItem = {
      id: "c-card",
      type: "link",
      label: "Service",
      placement: "both",
      children: [],
      url: "/services/wifi",
      megaMenuChildDisplayType: "card",
      megaMenuImageUrl: "/svc.jpg",
    };
    const parent: MenuItem = {
      id: "p",
      type: "link",
      label: "Explore",
      placement: "both",
      url: "#",
      children: [listChild, iconChild, imageChild, cardChild],
      megaMenuType: "panel",
      megaMenu: {
        version: 2,
        panels: [
          {
            id: "panel-1",
            layout: "cards",
            childIds: ["c-list", "c-icon", "c-image", "c-card"],
          },
        ],
        navigation: { enabled: false, items: [] },
      },
    };

    assert.equal(resolveEffectiveChildDisplayType(listChild, "cards"), "list");
    assert.equal(resolveEffectiveChildDisplayType(iconChild, "cards"), "icon");
    assert.equal(resolveEffectiveChildDisplayType(imageChild, "cards"), "image");
    assert.equal(resolveEffectiveChildDisplayType(cardChild, "cards"), "card");

    const view = resolveMegaMenu(parent, "en");
    assert.equal(view.isV2, true);
    const appearances = view.panels[0]?.children.map((c) => c.appearance);
    assert.deepEqual(appearances, ["list", "icon", "image", "card"]);
  });
});
