import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  stickyCtaPropsSchema,
  leadFormPropsSchema,
  contactFormBuilderPropsSchema,
  multiStepFormPropsSchema,
  newsletterSignupPropsSchema,
  downloadGatePropsSchema,
} from "@/features/builder/blocks/conversion/schemas/conversion-blocks";

describe("conversion-block-schemas", () => {
  it("parses all six block defaults", () => {
    assert.ok(stickyCtaPropsSchema.parse({}));
    assert.ok(leadFormPropsSchema.parse({}));
    assert.ok(contactFormBuilderPropsSchema.parse({}));
    assert.ok(multiStepFormPropsSchema.parse({}));
    assert.ok(newsletterSignupPropsSchema.parse({}));
    assert.ok(downloadGatePropsSchema.parse({}));
  });

  it("newsletter double opt-in defaults on", () => {
    assert.equal(newsletterSignupPropsSchema.parse({}).doubleOptIn, true);
  });

  it("multi-step save and resume defaults on", () => {
    assert.equal(multiStepFormPropsSchema.parse({}).saveAndResume, true);
  });

  it("preserves localized trust item label suffixes", () => {
    const parsed = contactFormBuilderPropsSchema.parse({
      trustItems: [{ id: "t1", label: "", labelEn: "Fast reply", labelAr: "رد سريع" }],
    });
    const item = parsed.trustItems[0] as Record<string, unknown>;
    assert.equal(item.labelEn, "Fast reply");
    assert.equal(item.labelAr, "رد سريع");
  });
});
