import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  publicPathFromEntityPageKey,
  resolveNoIndexPaths,
} from "../noindex-paths";

describe("noindex path resolution", () => {
  it("maps static keys through the registry (including videos) and ignores non-noindex rows", () => {
    const paths = resolveNoIndexPaths([
      { pageKey: "videos", entityType: null, entityId: null, robots: "noindex, follow" },
      { pageKey: "about", entityType: null, entityId: null, robots: "index, follow" },
      { pageKey: null, entityType: null, entityId: null, robots: null },
    ]);
    assert.deepEqual([...paths], ["/videos"]);
  });

  it("maps entity pageKeys for products, brands, categories, and tags", () => {
    const paths = resolveNoIndexPaths([
      { pageKey: "product:widget", entityType: null, entityId: null, robots: "noindex" },
      { pageKey: "brand:acme", entityType: null, entityId: null, robots: "noindex" },
      { pageKey: "category:routers", entityType: null, entityId: null, robots: "noindex" },
      { pageKey: "tag:wireless", entityType: null, entityId: null, robots: "noindex" },
    ]);
    assert.deepEqual(
      [...paths].sort(),
      ["/brands/acme", "/categories/routers", "/products/widget", "/tags/wireless"].sort(),
    );
  });

  it("maps wired CMS pages to their clean public URL", () => {
    const paths = resolveNoIndexPaths([
      {
        pageKey: null,
        entityType: null,
        entityId: null,
        robots: "noindex",
        cmsPage: { slug: "about" },
      },
      {
        pageKey: null,
        entityType: null,
        entityId: null,
        robots: "noindex",
        cmsPage: { slug: "legacy-page" },
      },
      {
        pageKey: null,
        entityType: null,
        entityId: null,
        robots: "noindex",
        post: { slug: "hello" },
      },
    ]);
    assert.deepEqual([...paths].sort(), ["/about", "/blog/hello", "/pages/legacy-page"].sort());
  });

  it("uses the same content-item prefix as the sitemap", () => {
    const paths = resolveNoIndexPaths(
      [
        {
          pageKey: null,
          entityType: "CONTENT_ITEM",
          entityId: "item-1",
          robots: "noindex",
        },
      ],
      [
        {
          id: "item-1",
          slug: "widget",
          contentType: { routePrefix: "products", slug: "catalog-items" },
        },
      ],
    );
    assert.deepEqual([...paths], ["/products/widget"]);
  });

  it("normalizes pageKey prefixes individually", () => {
    assert.equal(publicPathFromEntityPageKey("product:widget"), "/products/widget");
    assert.equal(publicPathFromEntityPageKey("unknown:widget"), null);
  });
});
