import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runSchemaMigrations } from "@/platform/schema-ui/schema/migrations";
import { expressionEngine } from "@/platform/schema-ui/expressions/evaluator";
import { discoverManifests, resetPlatformRegistryForTests } from "@/platform/schema-ui/manifests/discover";
import { schemaRegistry } from "@/platform/schema-ui/registry/schema-registry";
import { mergeFormDefinitionWithSchema, formDefinitionToSchemaDocument } from "@/features/forms/adapters/schema-document.adapter";
import { StateMachine, FORM_LIFECYCLE_MACHINE } from "@/platform/schema-ui/state-machine/state-machine";
import { inboxProjection, operationalAnalyticsProjection } from "@/platform/schema-ui/events/projections";
import { interactionEventStore } from "@/platform/schema-ui/events/event-store";
import { createInteractionEvent } from "@/platform/schema-ui/events/event-bus";
import { generateSchemaFromPrompt } from "@/platform/schema-ui/ai/schema-generator";
import { listMarketplaceTemplates } from "@/platform/schema-ui/marketplace/template-marketplace";

describe("schema migrations v1 to v2", () => {
  it("migrates legacy field list to nodes and bindings", () => {
    const doc = runSchemaMigrations({
      fields: [
        { id: "email", type: "email", label: "Email", required: true },
        { id: "name", type: "text", label: "Name", required: true },
      ],
    });
    assert.equal(doc.definitionVersion, 2);
    assert.equal(doc.bindings.length, 2);
    assert.equal(doc.nodes.length, 2);
    assert.equal(doc.bindings[0].componentType, "emailField");
  });
});

describe("expression engine", () => {
  it("evaluates IF function", () => {
    const result = expressionEngine.evaluate('IF(country == "UAE", "Arabic", "English")', {
      country: "UAE",
    });
    assert.equal(result, "Arabic");
  });

  it("evaluates MUL function", () => {
    const result = expressionEngine.evaluate("MUL(quantity, price)", { quantity: 3, price: 10 });
    assert.equal(result, 30);
  });
});

describe("manifest discovery", () => {
  it("registers built-in binding components", () => {
    resetPlatformRegistryForTests();
    const manifests = discoverManifests();
    assert.ok(manifests.some((m) => m.id === "textField"));
    assert.ok(manifests.some((m) => m.id === "emailField"));
    assert.ok(schemaRegistry.getComponent("textField"));
  });
});

describe("forms schema adapter", () => {
  it("round-trips v1 definition through schema document", () => {
    const v1 = {
      fields: [{ id: "email", type: "email" as const, label: "Email", required: true }],
    };
    const schema = formDefinitionToSchemaDocument(v1);
    const { form } = mergeFormDefinitionWithSchema(schema);
    assert.equal(form.fields[0].id, "email");
    assert.equal(form.fields[0].type, "email");
  });
});

describe("state machine", () => {
  it("transitions form lifecycle on submit", () => {
    const sm = new StateMachine(FORM_LIFECYCLE_MACHINE);
    assert.equal(sm.getState(), "draft");
    sm.transition("firstInteraction");
    assert.equal(sm.getState(), "started");
    sm.transition("stepAdvance");
    assert.equal(sm.getState(), "inProgress");
    sm.transition("submit");
    assert.equal(sm.getState(), "submitted");
  });
});

describe("event projections", () => {
  it("builds inbox from submitted events", async () => {
    interactionEventStore.clear();
    await interactionEventStore.append(
      createInteractionEvent("sub-1", "interaction.created", { schemaId: "tpl-1" }),
    );
    await interactionEventStore.append(
      createInteractionEvent("sub-1", "interaction.submitted", {
        schemaId: "tpl-1",
        payload: { email: "a@b.com" },
        score: 10,
      }),
    );
    const items = inboxProjection.getItems();
    assert.equal(items.length, 1);
    assert.equal(items[0].score, 10);
  });

  it("computes operational metrics", () => {
    const metrics = operationalAnalyticsProjection.compute();
    assert.ok(metrics.submissions >= 0);
  });
});

describe("ai schema generator", () => {
  it("generates RFQ schema from prompt", async () => {
    const doc = await generateSchemaFromPrompt({ prompt: "Create an RFQ form" });
    assert.ok(doc.bindings.length >= 4);
    assert.ok(doc.steps?.length);
  });
});

describe("marketplace", () => {
  it("lists internal templates", () => {
    const templates = listMarketplaceTemplates();
    assert.ok(templates.some((t) => t.id === "contact"));
    assert.ok(templates.some((t) => t.id === "rfq"));
  });
});
