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
});
