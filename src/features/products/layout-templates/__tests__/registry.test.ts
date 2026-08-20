import assert from "node:assert/strict";
import test from "node:test";
import {
  listProductPageLayoutTemplates,
  validateTemplateId,
} from "@/features/products/layout-templates/registry";
import { provideOtherPages } from "@/features/pages/page-registry.providers";

test("listProductPageLayoutTemplates returns registered templates with labels", () => {
  const templates = listProductPageLayoutTemplates();
  const ids = templates.map((t) => t.id);
  assert.ok(ids.includes("default"));
  assert.ok(ids.includes("unifi"));
  assert.ok(templates.every((t) => t.label.length > 0));
});

test("validateTemplateId maps unifi and unknown ids", () => {
  assert.equal(validateTemplateId("unifi"), "unifi");
  assert.equal(validateTemplateId("nonexistent"), "default");
});

test("other page provider is a stub that returns no persisted rows", () => {
  const rows = provideOtherPages({
    cmsPages: [],
    collections: [],
    brandProfiles: [],
    site: {},
  });
  assert.deepEqual(rows, []);
});
