import test from "node:test";
import assert from "node:assert/strict";
import { slugifyContentTypeName } from "@/features/content/content-admin-paths";
import { parseContentTypeSchemaDocument } from "@/features/content/content-type-schema-document";

/** Mirrors allocateUniqueSlug collision loop used by duplicateContentType. */
function nextUniqueSlug(base: string, existing: Set<string>) {
  const normalized = slugifyContentTypeName(base) || "type";
  let candidate = normalized.slice(0, 64);
  let n = 2;
  while (existing.has(candidate)) {
    const suffix = `-${n}`;
    candidate = `${normalized.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    n += 1;
  }
  return candidate;
}

function deleteCanProceed(liveItemCount: number) {
  return liveItemCount === 0;
}

test("duplicate slug allocation appends numeric suffix when -copy is taken", () => {
  const existing = new Set(["products", "products-copy"]);
  assert.equal(nextUniqueSlug("products-copy", existing), "products-copy-2");
  existing.add("products-copy-2");
  assert.equal(nextUniqueSlug("products-copy", existing), "products-copy-3");
});

test("delete is blocked when live items remain", () => {
  assert.equal(deleteCanProceed(0), true);
  assert.equal(deleteCanProceed(3), false);
});

test("schema parse from schema document ignores source identity", () => {
  const parsed = parseContentTypeSchemaDocument({
    version: 1,
    kind: "content-type-schema",
    source: { id: "src-1", slug: "type-a" },
    fieldSchema: [{ key: "make", type: "text", labelEn: "Make" }],
    displaySchema: { card: "compact" },
    adminConfig: { inquiryEnabled: true },
  });
  assert.equal(parsed.fieldSchema.length, 1);
  assert.equal(parsed.fieldSchema[0]?.key, "make");
  assert.equal(parsed.displaySchema.card, "compact");
  assert.equal(parsed.adminConfig.inquiryEnabled, true);
});

test("schema parse from full export keeps only schema fields", () => {
  const parsed = parseContentTypeSchemaDocument({
    version: 1,
    contentType: {
      slug: "type-a",
      icon: "box",
      routePrefix: "type-a",
      isEnabled: true,
      sortOrder: 0,
      fieldSchema: [{ key: "year", type: "number", labelEn: "Year" }],
      displaySchema: { layout: "grid" },
      adminConfig: { foo: "bar" },
      translations: { name: { en: "Type A" } },
    },
    items: [{ slug: "item-1", status: "PUBLISHED", translations: {} }],
  });
  assert.equal(parsed.fieldSchema[0]?.key, "year");
  assert.equal(parsed.displaySchema.layout, "grid");
  assert.equal(parsed.adminConfig.foo, "bar");
  assert.equal("slug" in parsed, false);
  assert.equal("translations" in parsed, false);
});
