import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeFormHealthReport } from "@/features/forms/lib/form-health-score";
import { documentToSchemaPatch } from "@/features/forms/lib/ab-patch";
import { applySchemaPatch } from "@/features/forms/lib/ab-testing";
import { interpolateMergeTags } from "@/features/forms/lib/merge-tags";
import { expandReusableBlock, insertReusableBlock } from "@/features/forms/blocks/reusable-blocks";
import { mergeSchemaDocuments } from "@/features/forms/lib/merge-schema-documents";
import { wrapDocumentEnvelope, serializeDocumentEnvelope, loadDocumentFromRaw } from "@/features/forms/lib/document-envelope";
import { compileRuntimeDefinition } from "@/features/forms/compiler";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

const emptyDoc: SchemaDocument = { definitionVersion: 2, nodes: [], bindings: [] };

describe("phase2 health score", () => {
  it("scores empty form low-ish and labeled", () => {
    const report = computeFormHealthReport(emptyDoc, {});
    assert.equal(report.dimensions.length, 4);
    assert.ok(report.overall <= 100);
  });
});

describe("phase2 ab patch", () => {
  it("round-trips patch apply", () => {
    const base: SchemaDocument = {
      definitionVersion: 2,
      bindings: [
        {
          bindingId: "a",
          componentType: "textField",
          version: 1,
          presentation: { label: "A" },
          behavior: {},
          data: {},
        },
      ],
      nodes: [{ kind: "binding", bindingId: "a" }],
    };
    const variant: SchemaDocument = {
      ...base,
      bindings: [
        {
          bindingId: "a",
          componentType: "textField",
          version: 1,
          presentation: { label: "B variant" },
          behavior: {},
          data: {},
        },
      ],
    };
    const patch = documentToSchemaPatch(variant);
    const applied = applySchemaPatch(base, {
      bindings: patch!.bindings as SchemaDocument["bindings"],
      nodes: patch!.nodes as SchemaDocument["nodes"],
    });
    assert.equal(String(applied.bindings[0]?.presentation.label), "B variant");
  });
});

describe("phase2 merge tags", () => {
  it("interpolates tokens", () => {
    assert.equal(interpolateMergeTags("Hi {{name}}", { name: "Ali" }), "Hi Ali");
  });
});

describe("phase2 reusable blocks", () => {
  it("expands contact block", () => {
    const frag = expandReusableBlock("contact");
    assert.ok(frag.bindings.length >= 3);
    const next = insertReusableBlock(emptyDoc, "gdpr");
    assert.equal(next.bindings.length, 1);
  });
});

describe("phase2 designer comments meta ignored by compile", () => {
  it("preserves meta and compile ignores it", () => {
    const envelope = wrapDocumentEnvelope(
      emptyDoc,
      {},
      {
        designerComments: [
          {
            id: "1",
            targetType: "binding",
            targetId: "x",
            author: "Ali",
            body: "note",
            resolved: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    );
    const serialized = serializeDocumentEnvelope(envelope);
    const loaded = loadDocumentFromRaw(serialized);
    assert.equal(loaded.meta.designerComments?.length, 1);
    const compiled = compileRuntimeDefinition(loaded.document, loaded.extensions);
    assert.ok(!("designerComments" in compiled));
  });
});

describe("phase2 micro ai merge", () => {
  it("appends new bindings", () => {
    const base: SchemaDocument = {
      definitionVersion: 2,
      bindings: [
        {
          bindingId: "email",
          componentType: "emailField",
          version: 1,
          presentation: { label: "Email" },
          behavior: {},
          data: {},
        },
      ],
      nodes: [{ kind: "binding", bindingId: "email" }],
    };
    const generated: SchemaDocument = {
      definitionVersion: 2,
      bindings: [
        {
          bindingId: "phone",
          componentType: "phoneField",
          version: 1,
          presentation: { label: "Phone" },
          behavior: {},
          data: {},
        },
      ],
      nodes: [{ kind: "binding", bindingId: "phone" }],
    };
    const merged = mergeSchemaDocuments(base, generated);
    assert.equal(merged.bindings.length, 2);
  });
});
