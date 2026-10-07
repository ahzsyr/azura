import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  searchBlockPropsSchema,
  advancedFiltersPropsSchema,
  categoryExplorerPropsSchema,
  relatedContentPropsSchema,
  recentlyViewedPropsSchema,
} from "@/features/builder/blocks/discovery/schemas/discovery-blocks";
import {
  pushRecentlyViewed,
  getRecentlyViewed,
  clearRecentlyViewed,
} from "@/features/builder/blocks/discovery/lib/recently-viewed.storage";
import { SearchEntityType } from "@prisma/client";

describe("discovery block schemas", () => {
  it("parses searchBlock defaults", () => {
    const p = searchBlockPropsSchema.parse({});
    assert.equal(p.layout, "inline");
    assert.equal(p.resultsMode, "dropdown");
    assert.equal(p.panelMode, "command");
  });

  it("parses advancedFilters scope", () => {
    const p = advancedFiltersPropsSchema.parse({ scope: "search" });
    assert.equal(p.scope, "search");
    assert.equal(p.syncUrl, true);
  });

  it("parses categoryExplorer source", () => {
    const p = categoryExplorerPropsSchema.parse({ source: "postCategories" });
    assert.equal(p.source, "postCategories");
    assert.equal(p.scope, "PRODUCT");
    assert.equal(p.pageSize, 12);
    assert.equal(p.enablePagination, true);
  });

  it("upgrades legacy collections source to categories", () => {
    const p = categoryExplorerPropsSchema.parse({ source: "collections" });
    assert.equal(p.source, "categories");
  });

  it("parses categoryExplorer pagination off as truncate mode", () => {
    const p = categoryExplorerPropsSchema.parse({
      pageSize: 6,
      enablePagination: false,
    });
    assert.equal(p.pageSize, 6);
    assert.equal(p.enablePagination, false);
  });

  it("parses relatedContent defaults for content items", () => {
    const p = relatedContentPropsSchema.parse({});
    assert.deepEqual(p.entityTypes, [SearchEntityType.CONTENT_ITEM]);
    assert.equal(p.badge, "");
    assert.equal(p.cardVariant, "default");
    assert.equal(p.layout, "grid");
    assert.equal(p.columns, 3);
    assert.equal(p.showArrows, true);
    assert.equal(p.limit, 6);
  });

  it("parses relatedContent legacy product display props for compatibility", () => {
    const p = relatedContentPropsSchema.parse({
      entityTypes: [
        SearchEntityType.CATALOG_PRODUCT,
        SearchEntityType.POST,
        SearchEntityType.CONTENT_ITEM,
      ],
      showPrice: false,
      showRating: false,
      showStock: false,
      showCompare: false,
      cardVariant: "image-overlay",
      badge: "Related",
    });
    assert.ok(p.entityTypes.includes(SearchEntityType.CATALOG_PRODUCT));
    assert.equal(p.showPrice, false);
    assert.equal(p.cardVariant, "image-overlay");
    assert.equal(p.badge, "Related");
    assert.notEqual(p.layout as string, "slider");
  });

  it("parses recentlyViewed", () => {
    const p = recentlyViewedPropsSchema.parse({ limit: 4 });
    assert.equal(p.limit, 4);
    assert.equal(p.excludeCurrentPage, true);
  });
});

describe("recently-viewed.storage", () => {
  const locale = "test-locale-storage";
  const store: Record<string, string> = {};

  it("dedupes and limits entries", () => {
    const g = globalThis as typeof globalThis & { localStorage?: Storage };
    g.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: () => null,
      length: 0,
    } as Storage;

    clearRecentlyViewed(locale);
    pushRecentlyViewed(
      locale,
      {
        entityType: SearchEntityType.CATALOG_PRODUCT,
        entityId: "a",
        title: "Product A",
        urlPath: "/en/products/a",
      },
      { maxItems: 5 }
    );
    pushRecentlyViewed(locale, {
      entityType: SearchEntityType.CATALOG_PRODUCT,
      entityId: "a",
      title: "Product A updated",
      urlPath: "/en/products/a",
    });
    pushRecentlyViewed(locale, {
      entityType: SearchEntityType.POST,
      entityId: "b",
      title: "Post B",
      urlPath: "/en/blog/b",
    });
    const items = getRecentlyViewed(locale, 10);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, "Post B");
    assert.equal(items[1].title, "Product A updated");
    clearRecentlyViewed(locale);
  });
});
