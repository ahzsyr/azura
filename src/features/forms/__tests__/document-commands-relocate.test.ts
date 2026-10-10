import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDocumentCommand,
  createInitialHistory,
  isRelocateRejected,
  planRelocate,
  resolveDropIndex,
  resolveIntoIndex,
} from "@/platform/schema-ui/designer/document-commands";
import { designerCanvasMarker } from "@/platform/schema-ui/layout/designer-canvas";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { SchemaNode } from "@/platform/schema-ui/schema/schema-node";

function binding(id: string): SchemaNode {
  return { kind: "binding", bindingId: id };
}

function section(id: string, children: SchemaNode[]): SchemaNode {
  return { kind: "layout", type: "section", id, props: { title: id }, children };
}

function document(nodes: SchemaNode[]): SchemaDocument {
  return { definitionVersion: 2, nodes, bindings: [] };
}

function ids(nodes: SchemaNode[]): string[] {
  return nodes.map((node) => (node.kind === "binding" ? node.bindingId : node.id));
}

describe("relocate drop index", () => {
  it("moves a field below another field, adjusting for removal", () => {
    const index = resolveDropIndex({
      edge: "after",
      rowIndex: 2,
      sameParent: true,
      sourceIndex: 0,
    });
    assert.equal(index, 2);
    const state = createInitialHistory(document([binding("a"), binding("b"), binding("c")]));
    const next = applyDocumentCommand(state, {
      type: "RelocateNode",
      selection: { type: "binding", id: "a" },
      targetParentId: null,
      index: index!,
    });
    assert.deepEqual(ids(next.document.nodes), ["b", "c", "a"]);
    assert.equal(next.past.length, 1);
  });

  it("moves a field above another field", () => {
    const index = resolveDropIndex({
      edge: "before",
      rowIndex: 0,
      sameParent: true,
      sourceIndex: 2,
    });
    assert.equal(index, 0);
    const state = createInitialHistory(document([binding("a"), binding("b"), binding("c")]));
    const next = applyDocumentCommand(state, {
      type: "RelocateNode",
      selection: { type: "binding", id: "c" },
      targetParentId: null,
      index: index!,
    });
    assert.deepEqual(ids(next.document.nodes), ["c", "a", "b"]);
  });

  it("treats a same-position drop as a no-op", () => {
    assert.equal(
      resolveDropIndex({ edge: "before", rowIndex: 1, sameParent: true, sourceIndex: 1 }),
      null,
    );
    assert.equal(
      resolveIntoIndex({ childCount: 3, sameParent: true, sourceIndex: 2 }),
      null,
    );
  });
});

describe("relocate into containers", () => {
  it("moves a field into an empty section and back to the root", () => {
    const start = createInitialHistory(
      document([binding("a"), section("contact", [])]),
    );
    const into = planRelocate({
      nodes: start.document.nodes,
      selection: { type: "binding", id: "a" },
      sourceParentId: null,
      sourceIndex: 0,
      targetParentId: "contact",
      into: true,
      childCount: 0,
    });
    assert.ok(into);
    const nested = applyDocumentCommand(start, into);
    const contact = nested.document.nodes.find((node) => node.kind === "layout" && node.id === "contact");
    assert.equal(contact?.kind, "layout");
    if (contact?.kind === "layout") {
      assert.deepEqual(ids(contact.children), ["a"]);
    }
    assert.deepEqual(ids(nested.document.nodes), ["contact"]);

    const back = planRelocate({
      nodes: nested.document.nodes,
      selection: { type: "binding", id: "a" },
      sourceParentId: "contact",
      sourceIndex: 0,
      targetParentId: null,
      edge: "before",
      rowIndex: 0,
    });
    assert.ok(back);
    const restored = applyDocumentCommand(nested, back);
    assert.deepEqual(ids(restored.document.nodes), ["a", "contact"]);
  });

  it("rejects dropping a section into its own child without recording history", () => {
    const nodes = [section("outer", [section("inner", [binding("a")])])];
    assert.equal(isRelocateRejected(nodes, "outer", "inner"), true);
    const planned = planRelocate({
      nodes,
      selection: { type: "node", id: "outer" },
      sourceParentId: null,
      sourceIndex: 0,
      targetParentId: "inner",
      into: true,
      childCount: 1,
    });
    assert.equal(planned, null);

    const state = createInitialHistory(document(nodes));
    const next = applyDocumentCommand(state, {
      type: "RelocateNode",
      selection: { type: "node", id: "outer" },
      targetParentId: "inner",
      index: 0,
    });
    assert.equal(next, state);
    assert.equal(next.past.length, 0);
    assert.equal(next.document.nodes[0]?.kind, "layout");
  });
});

describe("designer canvas marker", () => {
  it("is omitted unless designer mode is on", () => {
    assert.equal(designerCanvasMarker(false), undefined);
    assert.equal(designerCanvasMarker(undefined), undefined);
    assert.equal(designerCanvasMarker(true), "");
  });
});
