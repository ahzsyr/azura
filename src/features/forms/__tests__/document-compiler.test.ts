import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileRuntimeDefinition } from "@/features/forms/compiler";
import {
  loadDocumentFromRaw,
  serializeDocumentEnvelope,
  wrapDocumentEnvelope,
  DOCUMENT_ENVELOPE_VERSION,
} from "@/features/forms/lib/document-envelope";
import { resolveReceiverEmails } from "@/features/forms/lib/resolve-receiver-emails";
import {
  applyDocumentCommand,
  createInitialHistory,
  createInsertBindingCommand,
  undoDocument,
  redoDocument,
} from "@/platform/schema-ui/designer/document-commands";
import { createEmptySchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import { initializeSchemaUiPlatform, resetSchemaUiPlatformForTests } from "@/platform/schema-ui/init-platform";
import { propertyRegistry } from "@/platform/schema-ui/registry/property-registry";
import { createLayoutNode, createContentNode } from "@/platform/schema-ui/layout/layout-engine";
import { buildZodSchemaFromTemplate } from "@/features/forms/lib/build-zod-schema";

describe("document envelope", () => {
  it("round-trips versioned authoring without losing layout nodes", () => {
    const document = createEmptySchemaDocument();
    document.nodes = [
      createContentNode("heading", { text: "Contact Us", level: 2 }),
      createLayoutNode("section", { title: "Personal" }, [
        { kind: "binding", bindingId: "email" },
      ]),
    ];
    document.bindings = [
      {
        bindingId: "email",
        componentType: "emailField",
        version: 1,
        presentation: { label: "Email" },
        behavior: { required: true },
        data: {},
      },
    ];

    const envelope = serializeDocumentEnvelope(
      wrapDocumentEnvelope(document, {
        notifications: { receiverEmails: ["a@b.com"], sendToSubmitter: false },
      }),
    );

    assert.equal((envelope as { version: number }).version, DOCUMENT_ENVELOPE_VERSION);

    const loaded = loadDocumentFromRaw(envelope);
    assert.equal(loaded.document.nodes.length, 2);
    assert.equal(loaded.document.nodes[0]?.kind, "content");
    assert.equal(loaded.document.bindings[0]?.bindingId, "email");
    assert.deepEqual(loaded.extensions.notifications?.receiverEmails, ["a@b.com"]);

    // Stable IDs survive serialize → load
    const headingId = (document.nodes[0] as { id: string }).id;
    assert.equal((loaded.document.nodes[0] as { id: string }).id, headingId);
  });
});

describe("resolveReceiverEmails", () => {
  it("prefers receiverEmails over legacy fields", () => {
    assert.deepEqual(
      resolveReceiverEmails({
        notifications: {
          receiverEmails: ["new@example.com"],
          adminEmails: ["old@example.com"],
          sendToSubmitter: false,
        },
        destinations: [{ type: "email", emails: ["dest@example.com"] }],
      }),
      ["new@example.com"],
    );
  });

  it("falls back to adminEmails then destination emails without mutating", () => {
    assert.deepEqual(
      resolveReceiverEmails({
        notifications: {
          receiverEmails: [],
          adminEmails: ["legacy@example.com"],
          sendToSubmitter: false,
        },
      }),
      ["legacy@example.com"],
    );
    assert.deepEqual(
      resolveReceiverEmails({
        destinations: [{ type: "email", emails: ["dest@example.com"] }],
      }),
      ["dest@example.com"],
    );
  });
});

describe("compileRuntimeDefinition", () => {
  it("compiles fields, options, and workflow one-way", () => {
    const document = createEmptySchemaDocument();
    document.bindings = [
      {
        bindingId: "service",
        componentType: "selectField",
        version: 1,
        presentation: { label: "Service" },
        behavior: { required: true },
        data: {
          options: [
            { value: "sales", label: "Sales" },
            { value: "support", label: "Support" },
          ],
        },
      },
    ];
    document.nodes = [{ kind: "binding", bindingId: "service" }];
    document.steps = [{ id: "s1", title: "One", bindingIds: ["service"] }];

    const runtime = compileRuntimeDefinition(document, {
      notifications: { receiverEmails: ["ops@example.com"], sendToSubmitter: true },
      webhooks: [{ url: "https://hooks.example.com", events: ["submit"] }],
    });

    assert.equal(runtime.fields.length, 1);
    assert.equal(runtime.fields[0]?.id, "service");
    assert.equal(runtime.fields[0]?.type, "select");
    assert.equal(runtime.fields[0]?.options?.length, 2);
    assert.equal(runtime.steps?.[0]?.fieldIds[0], "service");
    assert.equal(runtime.notifications?.receiverEmails?.[0], "ops@example.com");
    assert.equal(runtime.webhooks?.[0]?.url, "https://hooks.example.com");
  });

  it("keeps submission payload field ids stable across recompile", () => {
    const document = createEmptySchemaDocument();
    document.bindings = [
      {
        bindingId: "name",
        componentType: "textField",
        version: 1,
        presentation: { label: "Name" },
        behavior: { required: true },
        data: {},
      },
      {
        bindingId: "email",
        componentType: "emailField",
        version: 1,
        presentation: { label: "Email" },
        behavior: { required: true },
        data: {},
      },
    ];
    document.nodes = [
      { kind: "binding", bindingId: "name" },
      { kind: "binding", bindingId: "email" },
    ];

    const a = compileRuntimeDefinition(document);
    const b = compileRuntimeDefinition(document);
    assert.deepEqual(
      a.fields.map((f) => f.id),
      b.fields.map((f) => f.id),
    );

    const schema = buildZodSchemaFromTemplate(a);
    const payload = schema.parse({ name: "Ada", email: "ada@example.com" });
    assert.deepEqual(Object.keys(payload).sort(), ["email", "name"]);
  });
});

describe("document commands + history", () => {
  it("supports insert, delete, undo, redo", () => {
    resetSchemaUiPlatformForTests();
    initializeSchemaUiPlatform();

    let state = createInitialHistory(createEmptySchemaDocument());
    const insert = createInsertBindingCommand("textField");
    assert.ok(insert);
    state = applyDocumentCommand(state, insert!);
    assert.equal(state.document.bindings.length, 1);
    assert.equal(state.past.length, 1);

    const bindingId = state.document.bindings[0]!.bindingId;
    state = applyDocumentCommand(state, {
      type: "DeleteNode",
      selection: { type: "binding", id: bindingId },
    });
    assert.equal(state.document.bindings.length, 0);

    state = undoDocument(state);
    assert.equal(state.document.bindings.length, 1);

    state = redoDocument(state);
    assert.equal(state.document.bindings.length, 0);
  });

  it("wraps selection in a section with stable child binding id", () => {
    resetSchemaUiPlatformForTests();
    initializeSchemaUiPlatform();

    let state = createInitialHistory(createEmptySchemaDocument());
    const insert = createInsertBindingCommand("emailField");
    state = applyDocumentCommand(state, insert!);
    const bindingId = state.document.bindings[0]!.bindingId;

    state = applyDocumentCommand(state, {
      type: "WrapNodes",
      selection: { type: "binding", id: bindingId },
      wrapType: "section",
    });

    assert.equal(state.document.nodes[0]?.kind, "layout");
    assert.equal((state.document.nodes[0] as { type: string }).type, "section");
    assert.equal(state.document.bindings[0]?.bindingId, bindingId);
  });
});

describe("registry / selectField", () => {
  it("resolves selectField after SchemaUi platform init", () => {
    resetSchemaUiPlatformForTests();
    initializeSchemaUiPlatform();
    const manifest = propertyRegistry.get("selectField");
    assert.ok(manifest);
    assert.equal(manifest!.id, "selectField");
    const groups = propertyRegistry.getPropertyGroups("selectField");
    assert.ok(groups.some((g) => g.fields.some((f) => f.key === "options")));
  });
});
