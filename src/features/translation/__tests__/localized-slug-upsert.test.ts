import assert from "node:assert/strict";
import test from "node:test";
import { planLocalizedSlugUpsert } from "@/features/translation/localized-slug-upsert";

test("noop when entity already owns the slug", () => {
  const row = { id: "s1", entityId: "p1" };
  assert.deepEqual(planLocalizedSlugUpsert("p1", row, row), { type: "noop" });
});

test("create when neither unique key exists", () => {
  assert.deepEqual(planLocalizedSlugUpsert("p1", null, null), { type: "create" });
});

test("update slug when entity has a different slug", () => {
  assert.deepEqual(planLocalizedSlugUpsert("p1", { id: "s1", entityId: "p1" }, null), {
    type: "update-slug",
    id: "s1",
  });
});

test("reassign orphaned slug row to the new product id", () => {
  assert.deepEqual(planLocalizedSlugUpsert("p2", null, { id: "s1", entityId: "p-old" }), {
    type: "reassign",
    id: "s1",
  });
});

test("take over slug owned by another entity and drop this entity's old slug", () => {
  assert.deepEqual(
    planLocalizedSlugUpsert("p2", { id: "s-old", entityId: "p2" }, { id: "s-taken", entityId: "p1" }),
    { type: "takeover", keepId: "s-taken", deleteId: "s-old" },
  );
});
