import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBreadcrumbs } from "@/config/admin-nav";

describe("admin chrome breadcrumbs", () => {
  it("uses nav group and section for content hub", () => {
    const crumbs = getBreadcrumbs("/admin/content");
    assert.deepEqual(
      crumbs.map((crumb) => crumb.label),
      ["Admin", "Content Builder", "Catalog", "Content"],
    );
    assert.equal(crumbs[1]?.href, "/admin/content-builder");
    assert.equal(crumbs[3]?.href, undefined);
  });

  it("keeps extra content type segments after the nav item", () => {
    const crumbs = getBreadcrumbs("/admin/content/listings/new");
    assert.deepEqual(
      crumbs.map((crumb) => crumb.label),
      ["Admin", "Content Builder", "Catalog", "Content", "Properties", "New"],
    );
  });

  it("exposes sibling destinations for chrome dropdowns", () => {
    const crumbs = getBreadcrumbs("/admin/products");
    const catalog = crumbs.find((crumb) => crumb.label === "Catalog");
    const page = crumbs.find((crumb) => crumb.label === "Products");
    assert.ok((catalog?.options?.length ?? 0) > 1);
    assert.ok(page?.options?.some((option) => option.label === "Content" && option.href === "/admin/content"));
  });
});
