import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSimpleRuleExpression,
  compileFields,
  parseSimpleRuleExpression,
  ruleToConditional,
} from "@/features/forms/compiler/compile-fields";
import { analyzeFormHealth } from "@/features/forms/lib/form-health";
import { buildStarterPack } from "@/features/forms/starters";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

describe("compile-fields rules bridge", () => {
  it("parses simple expressions", () => {
    assert.deepEqual(parseSimpleRuleExpression('service === "sales"'), {
      fieldId: "service",
      operator: "equals",
      value: "sales",
    });
    assert.equal(buildSimpleRuleExpression("service", "equals", "sales"), 'service === "sales"');
  });

  it("compiles show/hide rules onto target fields", () => {
    const document: SchemaDocument = {
      definitionVersion: 2,
      bindings: [
        {
          bindingId: "service",
          componentType: "selectField",
          version: 1,
          presentation: { label: "Service" },
          behavior: {},
          data: { options: [{ value: "sales", label: "Sales" }] },
        },
        {
          bindingId: "budget",
          componentType: "textField",
          version: 1,
          presentation: { label: "Budget" },
          behavior: {},
          data: {},
        },
      ],
      nodes: [
        { kind: "binding", bindingId: "service" },
        { kind: "binding", bindingId: "budget" },
      ],
      rules: [
        {
          id: "r1",
          expression: 'service === "sales"',
          actions: [{ type: "show", bindingId: "budget" }],
        },
      ],
    };

    const fields = compileFields(document);
    const budget = fields.find((f) => f.id === "budget");
    assert.ok(budget?.conditional);
    assert.equal(budget?.conditional?.fieldId, "service");
    assert.equal(budget?.conditional?.action, "show");
    assert.equal(ruleToConditional(document.rules![0]!)?.operator, "equals");
  });
});

describe("form starters", () => {
  it("builds lead starter with layout", () => {
    const pack = buildStarterPack("lead");
    assert.ok(pack.document.bindings.length >= 3);
    assert.ok(pack.document.nodes.some((n) => n.kind === "layout"));
    assert.ok(pack.extensions.scoringRules?.length);
  });
});

describe("form health", () => {
  it("flags missing labels", () => {
    const issues = analyzeFormHealth({
      definitionVersion: 2,
      bindings: [
        {
          bindingId: "a",
          componentType: "textField",
          version: 1,
          presentation: { label: "" },
          behavior: {},
          data: {},
        },
      ],
      nodes: [{ kind: "binding", bindingId: "a" }],
    });
    assert.ok(issues.some((i) => i.message.includes("no label")));
  });
});
