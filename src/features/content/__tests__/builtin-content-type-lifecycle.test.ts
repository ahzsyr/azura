import test from "node:test";
import assert from "node:assert/strict";
import {
  collectRetiredBuiltinSlugs,
  markReplacedBuiltinSlug,
  preserveBuiltinRetirement,
  shouldCreateBuiltinType,
} from "@/features/content/content-type.registry";

test("renaming offerings to services prevents builtin offerings from being recreated", () => {
  const existing = [
    { slug: "products", adminConfig: {} },
    { slug: "services", adminConfig: markReplacedBuiltinSlug({}, "offerings") },
  ];
  assert.equal(shouldCreateBuiltinType("offerings", existing), false);
  assert.equal(shouldCreateBuiltinType("products", existing), false);
  assert.equal(shouldCreateBuiltinType("listings", existing), true);
});

test("a type named services occupies the offerings builtin alias", () => {
  assert.equal(shouldCreateBuiltinType("offerings", [{ slug: "services", adminConfig: {} }]), false);
  assert.equal(shouldCreateBuiltinType("offerings", [{ slug: "projects", adminConfig: {} }]), true);
});

test("deleted builtin slugs stay retired on sibling types", () => {
  const stamped = markReplacedBuiltinSlug({ inquiryEnabled: true }, "offerings");
  const retired = collectRetiredBuiltinSlugs([{ slug: "products", adminConfig: stamped }]);
  assert.equal(retired.has("offerings"), true);
  assert.equal(shouldCreateBuiltinType("offerings", [{ slug: "products", adminConfig: stamped }]), false);
});

test("preserveBuiltinRetirement keeps origin metadata across form saves", () => {
  const stored = markReplacedBuiltinSlug({}, "offerings");
  const merged = preserveBuiltinRetirement(stored, { inquiryEnabled: true });
  assert.equal(merged.originBuiltinSlug, "offerings");
  assert.deepEqual(merged.retiredBuiltinSlugs, ["offerings"]);
  assert.equal(merged.inquiryEnabled, true);
});
