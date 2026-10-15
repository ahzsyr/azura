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
  resolveChildCardMedia,
  resolveEffectiveChildDisplayType,
  resolveMegaMenu,
} from "@/features/navigation/mega-menu-resolver";
import { contentItemPublicPath } from "@/features/content/content-admin-paths";
import { sourceDisplayOptionsForItem } from "@/features/navigation/menu-item-appearance";

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
    assert.equal(resolveEffectiveChildDisplayType(cardChild, "cards"), "image");

    const view = resolveMegaMenu(parent, "en");
    assert.equal(view.isV2, true);
    const appearances = view.panels[0]?.children.map((c) => c.appearance);
    assert.deepEqual(appearances, ["list", "icon", "image", "image"]);
    assert.deepEqual(
      view.panels[0]?.children.map((c) => c.cardMedia),
      [null, null, "image", "image"],
    );
  });

  it("keeps a photo card when an item also has an icon", () => {
    const child: MenuItem = {
      id: "drafting",
      type: "link",
      label: "Drafting",
      placement: "both",
      children: [],
      url: "/drafting",
      icon: "pen-tool",
      imageUrl: "/drafting.jpg",
      megaMenuChildDisplayType: "card",
      megaMenuCardMedia: "image",
    };
    assert.equal(resolveEffectiveChildDisplayType(child, "cards"), "image");
    assert.equal(resolveChildCardMedia(child, "image"), "image");

    const iconCard: MenuItem = { ...child, id: "icon-card", megaMenuCardMedia: "icon" };
    assert.equal(resolveEffectiveChildDisplayType(iconCard, "cards"), "icon");
    assert.equal(resolveChildCardMedia(iconCard, "icon"), null);

    const iconsOnly: MenuItem = {
      ...child,
      id: "icons-only",
      megaMenuChildDisplayType: "icon",
      megaMenuCardMedia: undefined,
      iconImageUrl: "/drafting-logo.png",
      photoUrl: "/drafting-cover.jpg",
    };
    assert.equal(resolveEffectiveChildDisplayType(iconsOnly, "cards"), "icon");
    assert.equal(resolveChildCardMedia(iconsOnly, "icon"), null);

    const automaticWithImage: MenuItem = {
      ...child,
      id: "auto",
      megaMenuChildDisplayType: undefined,
      megaMenuCardMedia: undefined,
      iconImageUrl: "/drafting-logo.png",
      photoUrl: "/drafting-cover.jpg",
    };
    assert.equal(resolveEffectiveChildDisplayType(automaticWithImage, "links"), "image");
    assert.equal(resolveChildCardMedia(automaticWithImage, "image"), "image");

    const photoOnly = resolveMegaMenu(
      {
        ...child,
        id: "photo-parent",
        children: [
          {
            ...iconsOnly,
            id: "photo-child",
            megaMenuChildDisplayType: "image",
            megaMenuCardMedia: "image",
          },
        ],
      },
      "en",
    );
    const photoChild = photoOnly.children[0];
    assert.equal(photoChild?.appearance, "image");
    assert.equal(photoChild?.photoUrl, "/drafting-cover.jpg");
    assert.equal(photoChild?.iconImageUrl, "/drafting-logo.png");
    assert.equal(photoChild?.image, "/drafting-cover.jpg");

    const iconOnlyView = resolveMegaMenu(
      {
        ...child,
        id: "icon-parent",
        children: [iconsOnly],
      },
      "en",
    );
    const iconViewChild = iconOnlyView.children[0];
    assert.equal(iconViewChild?.appearance, "icon");
    assert.equal(iconViewChild?.iconImageUrl, "/drafting-logo.png");
    assert.equal(iconViewChild?.cardMedia, null);

    const textOnlyView = resolveMegaMenu(
      {
        ...child,
        id: "text-parent",
        children: [automaticWithImage],
      },
      "en",
    );
    assert.equal(textOnlyView.children[0]?.appearance, "image");
    assert.equal(textOnlyView.children[0]?.photoUrl, "/drafting-cover.jpg");
    assert.equal(textOnlyView.children[0]?.cardMedia, "image");
  });

  it("uses the appearance chosen for the destination, and text only when that is selected", () => {
    const service: MenuItem = {
      id: "svc",
      type: "link",
      label: "Drafting",
      placement: "both",
      children: [],
      url: "/services/drafting",
      sourceDisplay: "image",
      sourceImageUrl: "/services/drafting-cover.jpg",
    };
    const brand: MenuItem = {
      id: "brand",
      type: "brand",
      label: "MikroTik",
      placement: "both",
      children: [],
      brandSlug: "mikrotik",
      sourceDisplay: "logo",
      sourceLogoUrl: "/brands/mikrotik/logo.png",
      sourceImageUrl: "/brands/mikrotik/banner.jpg",
    };
    const category: MenuItem = {
      id: "indoor",
      type: "collection",
      label: "Indoor",
      placement: "both",
      children: [],
      collectionId: "indoor",
      sourceDisplay: "icon",
      icon: "wifi",
      sourceImageUrl: "/categories/indoor-cover.jpg",
    };
    const textOnly: MenuItem = {
      ...brand,
      id: "text",
      sourceDisplay: "none",
    };

    assert.equal(resolveEffectiveChildDisplayType(service, "grid"), "image");
    assert.equal(resolveEffectiveChildDisplayType(brand, "grid"), "icon");
    assert.equal(resolveEffectiveChildDisplayType(category, "grid"), "icon");
    assert.equal(resolveEffectiveChildDisplayType(textOnly, "grid"), "list");

    const view = resolveMegaMenu(
      {
        id: "products",
        type: "link",
        label: "Products",
        placement: "both",
        url: "/products",
        children: [category],
      },
      "en",
    );
    assert.equal(view.children[0]?.appearance, "icon");
    assert.equal(view.children[0]?.icon, "wifi");
    assert.equal(view.children[0]?.sourceDisplay, "icon");
  });

  it("offers only the assets the destination actually has", () => {
    const catalog = emptyCatalog({
      brands: [{ slug: "unifi", name: "Unifi", logoUrl: "/brands/unifi.svg" }],
      contentTypes: [{ slug: "companies", name: "Companies", routePrefix: "companies" }],
      contentByType: {
        companies: [
          {
            slug: "edgewood",
            name: "Edgewood",
            logoUrl: "/companies/edgewood-logo.svg",
            imageUrl: "/companies/edgewood-cover.jpg",
          },
        ],
      },
    });

    const brand = sourceDisplayOptionsForItem(
      {
        type: "brand",
        label: "Unifi",
        brandSlug: "unifi",
        children: [],
        id: "unifi",
        placement: "both",
      },
      catalog,
    );
    assert.deepEqual(
      brand.map((option) => option.value),
      ["none", "logo"],
    );

    const company = sourceDisplayOptionsForItem(
      {
        type: "link",
        label: "Edgewood",
        url: "/companies/edgewood",
        children: [],
        id: "edgewood",
        placement: "both",
      },
      catalog,
    );
    assert.deepEqual(
      company.map((option) => option.value),
      ["none", "logo", "image"],
    );
  });
});
