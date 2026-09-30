import assert from "node:assert/strict";
import test from "node:test";
import { validateTemplateId } from "@/features/products/layout-templates/registry";

test("absent assignment fields resolve to default template id", () => {
  assert.equal(validateTemplateId(undefined), "default");
  assert.equal(validateTemplateId(null), "default");
  assert.equal(validateTemplateId(""), "default");
});
