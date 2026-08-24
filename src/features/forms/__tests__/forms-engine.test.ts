import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildZodSchemaFromTemplate, evaluateConditional } from "@/features/forms/lib/build-zod-schema";
import { scoreSubmission } from "@/features/forms/lib/scoring";
import { signWebhookPayload } from "@/features/forms/lib/webhook-sign";
import { resolveSubmissionEntityRefs } from "@/features/forms/lib/pipeline";
import { matchesRoutingRule } from "@/features/forms/lib/routing";
import { formTemplateDefinitionSchema } from "@/features/forms/schemas/form-definition";
import {
  stickyCtaPropsSchema,
  leadFormPropsSchema,
  downloadGatePropsSchema,
} from "@/features/builder/blocks/conversion/schemas/conversion-blocks";
import {
  checkFormSubmitRateLimit,
  isHoneypotTriggered,
  resetFormSubmitRateLimitsForTests,
} from "@/features/forms/platform/handlers/spam-handler";
import { submissionsToCsv } from "@/features/forms/submission-csv";

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

describe("resolveSubmissionEntityRefs", () => {
  it("reads pipeline defaults from template definition", () => {
    const refs = resolveSubmissionEntityRefs({
      fields: [],
      pipeline: {
        pipelineType: "lead",
        defaultAssigneeId: "user-1",
        defaultTags: ["vip", "web"],
      },
    });
    assert.equal(refs.pipelineType, "lead");
    assert.equal(refs.assigneeId, "user-1");
    assert.deepEqual(refs.tags, ["vip", "web"]);
  });

  it("applies first matching routing rule", () => {
    const refs = resolveSubmissionEntityRefs(
      {
        fields: [],
        pipeline: { pipelineType: "default" },
        routingRules: [
          { id: "r1", condition: 'country == "UAE"', pipelineType: "dubai", tags: ["uae"] },
        ],
      },
      { values: { country: "UAE" }, score: 5 },
    );
    assert.equal(refs.pipelineType, "dubai");
    assert.deepEqual(refs.tags, ["uae"]);
  });
});

describe("matchesRoutingRule", () => {
  it("evaluates expression conditions", () => {
    assert.equal(
      matchesRoutingRule({ id: "r", condition: "score >= 10" }, { score: 15 }),
      true,
    );
    assert.equal(
      matchesRoutingRule({ id: "r", condition: "score >= 10" }, { score: 5 }),
      false,
    );
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

describe("spam honeypot and rate limit", () => {
  it("detects filled honeypot", () => {
    assert.equal(isHoneypotTriggered(""), false);
    assert.equal(isHoneypotTriggered("   "), false);
    assert.equal(isHoneypotTriggered(undefined), false);
    assert.equal(isHoneypotTriggered("http://spam"), true);
  });

  it("rate limits after max attempts", () => {
    resetFormSubmitRateLimitsForTests();
    const ip = "test-ip-forms-engine";
    for (let i = 0; i < 10; i++) {
      assert.equal(checkFormSubmitRateLimit(ip), true);
    }
    assert.equal(checkFormSubmitRateLimit(ip), false);
    resetFormSubmitRateLimitsForTests();
  });
});

describe("server conditionals in Zod", () => {
  it("strips hidden fields and skips their required rules", () => {
    const schema = buildZodSchemaFromTemplate(
      {
        fields: [
          { id: "type", type: "text", label: "Type", required: true },
          {
            id: "company",
            type: "text",
            label: "Company",
            required: true,
            conditional: {
              fieldId: "type",
              operator: "equals",
              value: "business",
              action: "show",
            },
          },
        ],
      },
      { type: "personal" },
    );
    const parsed = schema.parse({ type: "personal", company: "" }) as Record<string, unknown>;
    assert.equal(parsed.type, "personal");
    assert.equal("company" in parsed, false);
  });

  it("requires dynamically required fields", () => {
    const schema = buildZodSchemaFromTemplate(
      {
        fields: [
          { id: "type", type: "text", label: "Type", required: true },
          {
            id: "company",
            type: "text",
            label: "Company",
            required: false,
            conditional: {
              fieldId: "type",
              operator: "equals",
              value: "business",
              action: "require",
            },
          },
        ],
      },
      { type: "business" },
    );
    assert.throws(() => schema.parse({ type: "business", company: "" }));
    assert.doesNotThrow(() => schema.parse({ type: "business", company: "Acme" }));
  });
});

describe("submissionsToCsv", () => {
  it("flattens payload keys into columns", () => {
    const csv = submissionsToCsv([
      {
        id: "1",
        templateName: "Contact",
        status: "NEW",
        score: 5,
        assigneeId: "u1",
        tags: ["vip"],
        locale: "en",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        payload: { email: "a@b.com", name: "Ann" },
      },
    ]);
    assert.match(csv, /"email"/);
    assert.match(csv, /"a@b.com"/);
    assert.match(csv, /"Contact"/);
  });
});
