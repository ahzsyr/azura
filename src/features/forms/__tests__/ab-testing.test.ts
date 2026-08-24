import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectAbVariant, getActiveAbTest, applyAbVariantToRaw } from "@/features/forms/lib/ab-testing";
import type { FormAbTest } from "@/features/forms/types";

describe("ab testing", () => {
  const test: FormAbTest = {
    id: "t1",
    name: "CTA test",
    enabled: true,
    variants: [
      { id: "a", name: "Control", weight: 50 },
      { id: "b", name: "Variant B", weight: 50 },
    ],
  };

  it("selects a variant deterministically", () => {
    const first = selectAbVariant(test, "visitor-1");
    const again = selectAbVariant(test, "visitor-1");
    assert.equal(first?.id, again?.id);
  });

  it("returns active test when enabled", () => {
    assert.equal(getActiveAbTest([test])?.id, "t1");
    assert.equal(getActiveAbTest([{ ...test, enabled: false }]), undefined);
  });

  it("applies schema patch to raw definition", () => {
    const raw = { nodes: [{ kind: "binding", bindingId: "email" }], bindings: [] };
    const patched = applyAbVariantToRaw(raw, {
      id: "b",
      name: "B",
      weight: 50,
      schemaPatch: { bindings: [{ bindingId: "email" }] },
    });
    assert.deepEqual(patched.bindings, [{ bindingId: "email" }]);
  });
});
