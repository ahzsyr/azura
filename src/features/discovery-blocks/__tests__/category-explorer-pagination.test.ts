import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCategoryExplorerRoots,
  paginateCategoryExplorerFlat,
  paginateCategoryExplorerHierarchy,
} from "@/features/discovery-blocks/lib/category-explorer-pagination";
import type { CategoryExplorerNode } from "@/features/discovery-blocks/lib/category-sources";

const nodes: CategoryExplorerNode[] = [
  { slug: "a", name: "A", href: "/a" },
  { slug: "b", name: "B", href: "/b", parentSlug: "a" },
  { slug: "c", name: "C", href: "/c" },
  { slug: "d", name: "D", href: "/d" },
  { slug: "e", name: "E", href: "/e" },
];

describe("category-explorer-pagination", () => {
  it("paginates flat nodes", () => {
    const page1 = paginateCategoryExplorerFlat(nodes, 1, 2, true);
    assert.equal(page1.items.length, 2);
    assert.equal(page1.totalPages, 3);
    assert.equal(page1.enabled, true);

    const page2 = paginateCategoryExplorerFlat(nodes, 2, 2, true);
    assert.equal(page2.items[0]?.slug, "c");
  });

  it("truncates flat nodes when pagination disabled", () => {
    const result = paginateCategoryExplorerFlat(nodes, 1, 3, false);
    assert.equal(result.items.length, 3);
    assert.equal(result.enabled, false);
  });

  it("paginates hierarchy by root categories", () => {
    const roots = getCategoryExplorerRoots(nodes);
    assert.equal(roots.length, 4);

    const page1 = paginateCategoryExplorerHierarchy(nodes, 1, 2, true, null);
    assert.equal(page1.total, 4);
    assert.equal(page1.totalPages, 2);
    assert.ok(page1.visibleNodes.some((n) => n.slug === "b"));
    assert.equal(page1.visibleNodes.some((n) => n.slug === "e"), false);
  });
});
