import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignmentFromCategoryIds } from "../product-category-assignment";

const OPTIONS = [
  { id: "c-net", slug: "networking", name: "Networking" },
  { id: "c-wifi", slug: "wifi", name: "Wi-Fi" },
  { id: "c-routers", slug: "routers", name: "Routers" },
];

describe("assignmentFromCategoryIds", () => {
  it("keeps order, drops unknown ids, and derives labels", () => {
    const next = assignmentFromCategoryIds(["c-wifi", "missing", "c-net", "c-wifi"], OPTIONS);
    assert.deepEqual(next.categoryIds, ["c-wifi", "c-net"]);
    assert.deepEqual(next.categories, ["Wi-Fi", "Networking"]);
    assert.equal(next.category, "Wi-Fi");
  });

  it("returns empty assignment when nothing is selected", () => {
    const next = assignmentFromCategoryIds([], OPTIONS);
    assert.deepEqual(next, { categoryIds: [], categories: [], category: "" });
  });
});
