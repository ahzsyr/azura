import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { HeaderWorkspace, MenuItem } from "@/features/navigation/types";
import {
  shouldPreferStoredMenuImageUrl,
  stripLinkedMenuImagesFromWorkspace,
  usesLinkedMenuImageSource,
} from "@/features/navigation/mega-menu-linked-images";
import type { Collection } from "@/features/collections/types";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { resolveCollectionImages } from "@/features/collections/collection-navigation";

function menuItem(partial: Partial<MenuItem> & Pick<MenuItem, "id" | "type" | "label">): MenuItem {
  return {
    placement: "both",
    children: [],
    ...partial,
  };
}

function workspaceWithItems(items: MenuItem[]): HeaderWorkspace {
  return {
    menusDatabase: {
      main: { key: "main", label: "Main", items },
    },
    activeMenuKey: "main",
    branding: {} as HeaderWorkspace["branding"],
    headerActions: [],
    settings: {} as HeaderWorkspace["settings"],
  };
}

function getCollectionImageUrlFromMap(
  slug: string,
  bySlug: Map<string, Collection>,
): string | undefined {
  const col = bySlug.get(slug);
  if (!col) return undefined;
  const media = resolveCollectionImages(col, bySlug);
  return media.coverImage ?? media.iconImage;
}

describe("usesLinkedMenuImageSource", () => {
  it("returns true for catalog-linked visual card types", () => {
    assert.equal(usesLinkedMenuImageSource("brand"), true);
    assert.equal(usesLinkedMenuImageSource("collection"), true);
    assert.equal(usesLinkedMenuImageSource("packageCategory"), true);
    assert.equal(usesLinkedMenuImageSource("product"), true);
    assert.equal(usesLinkedMenuImageSource("package"), true);
  });

  it("returns false for manual and text-only menu types", () => {
    assert.equal(usesLinkedMenuImageSource("image"), false);
    assert.equal(usesLinkedMenuImageSource("link"), false);
    assert.equal(usesLinkedMenuImageSource("page"), false);
    assert.equal(usesLinkedMenuImageSource("tag"), false);
    assert.equal(usesLinkedMenuImageSource("post"), false);
  });
});

describe("shouldPreferStoredMenuImageUrl", () => {
  it("prefers stored imageUrl for manual image items", () => {
    assert.equal(
      shouldPreferStoredMenuImageUrl({
        type: "image",
        imageUrl: "/manual/promo.jpg",
      }),
      true,
    );
  });

  it("does not prefer stored imageUrl for linked catalog items", () => {
    assert.equal(
      shouldPreferStoredMenuImageUrl({
        type: "brand",
        imageUrl: "/stale/banner.jpg",
      }),
      false,
    );
    assert.equal(
      shouldPreferStoredMenuImageUrl({
        type: "product",
        imageUrl: "/stale/product.jpg",
      }),
      false,
    );
  });
});

describe("stripLinkedMenuImagesFromWorkspace", () => {
  it("removes imageUrl from linked flyout children but keeps manual image items", () => {
    const ws = workspaceWithItems([
      menuItem({
        id: "brands",
        type: "link",
        label: "Brands",
        children: [
          menuItem({
            id: "brand-a",
            type: "brand",
            label: "Brand A",
            brandSlug: "brand-a",
            imageUrl: "/old/banner.jpg",
          }),
          menuItem({
            id: "manual",
            type: "image",
            label: "Promo",
            imageUrl: "/manual/promo.jpg",
          }),
        ],
      }),
    ]);

    const stripped = stripLinkedMenuImagesFromWorkspace(ws);
    const children = stripped.menusDatabase.main.items[0].children ?? [];
    assert.equal(children[0].imageUrl, undefined);
    assert.equal(children[1].imageUrl, "/manual/promo.jpg");
  });

  it("strips linked imageUrl from nested menu trees", () => {
    const ws = workspaceWithItems([
      menuItem({
        id: "product-a",
        type: "product",
        label: "Product A",
        productId: "widget",
        imageUrl: "/old/product.jpg",
      }),
    ]);

    const stripped = stripLinkedMenuImagesFromWorkspace(ws);
    assert.equal(stripped.menusDatabase.main.items[0].imageUrl, undefined);
  });
});

describe("linked collection image resolution", () => {
  it("resolves collection images from the provided collection map", () => {
    const collections: Collection[] = [
      {
        id: "c1",
        slug: "networking",
        name: "Networking",
        description: "",
        conditions: { match: "all", rules: [] },
        coverImage: "/collections/networking/cover.jpg",
        iconImage: "/collections/networking/icon.jpg",
        visible: true,
      },
    ];
    const bySlug = collectionMapFromList(collections);

    const url = getCollectionImageUrlFromMap("networking", bySlug);
    assert.equal(url, "/collections/networking/cover.jpg");
  });
});