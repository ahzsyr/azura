import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildZodSchemaFromTemplate, evaluateConditional } from "@/features/forms/lib/build-zod-schema";
import { scoreSubmission } from "@/features/forms/lib/scoring";
import { signWebhookPayload } from "@/features/forms/lib/webhooks";
import { formTemplateDefinitionSchema } from "@/features/forms/schemas/form-definition";
import {
  stickyCtaPropsSchema,
  leadFormPropsSchema,
  downloadGatePropsSchema,
} from "@/features/builder/blocks/conversion/schemas/conversion-blocks";

describe("formTemplateDefinitionSchema", () => {
  it("parses empty definition", () => {
    const def = formTemplateDefinitionSchema.parse({});
    assert.equal(def.fields.length, 0);
  });
});

describe("buildZodSchemaFromTemplate", () => {
  it("validates required email", () => {
    const schema = buildZodSchemaFromTemplate({
      fields: [{ id: "email", type: "email", labelEn: "Email", labelAr: "", required: true }],
    });
    assert.throws(() => schema.parse({}));
    assert.doesNotThrow(() => schema.parse({ email: "a@b.com" }));
  });
});

describe("evaluateConditional", () => {
  it("shows field when condition matches", () => {
    const field = {
      id: "company",
      type: "text" as const,
      labelEn: "Company",
      labelAr: "",
      required: false,
      conditional: { fieldId: "type", operator: "equals" as const, value: "business", action: "show" as const },
    };
    const hidden = evaluateConditional(field, { type: "personal" });
    assert.equal(hidden.visible, false);
    const shown = evaluateConditional(field, { type: "business" });
    assert.equal(shown.visible, true);
  });
});

describe("scoreSubmission", () => {
  it("adds points when field matches", () => {
    const score = scoreSubmission(
      { fields: [], scoringRules: [{ fieldId: "company", match: "acme", points: 15 }] },
      { company: "ACME Corp" },
    );
    assert.equal(score, 15);
  });
});

describe("signWebhookPayload", () => {
  it("returns stable hmac hex", () => {
    const a = signWebhookPayload('{"a":1}', "secret");
    const b = signWebhookPayload('{"a":1}', "secret");
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });
});

describe("conversion block schemas", () => {
  it("stickyCta defaults", () => {
    const p = stickyCtaPropsSchema.parse({});
    assert.equal(p.variant, "bar");
    assert.equal(p.trigger, "scrollPercent");
  });

  it("leadForm defaults", () => {
    const p = leadFormPropsSchema.parse({});
    assert.equal(p.templateId, "");
  });

  it("downloadGate defaults", () => {
    const p = downloadGatePropsSchema.parse({});
    assert.equal(p.unlockMethod, "formTemplate");
    assert.equal(p.expiryHours, 72);
  });
});
