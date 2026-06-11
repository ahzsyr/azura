import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pricingPropsSchema } from "@/features/pricing-plans/schemas/pricing-blocks";

describe("pricing block schema", () => {
  it("defaults to packages source for backward compatibility", () => {
    const p = pricingPropsSchema.parse({});
    assert.equal(p.source, "packages");
    assert.equal(p.layout, "cards");
    assert.equal(p.showBillingToggle, true);
  });

  it("parses plan set mode", () => {
    const p = pricingPropsSchema.parse({
      source: "planSet",
      planSetSlug: "saas",
      defaultBillingPeriod: "yearly",
    });
    assert.equal(p.source, "planSet");
    assert.equal(p.planSetSlug, "saas");
    assert.equal(p.defaultBillingPeriod, "yearly");
  });
});
