import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

/** Merge AI-generated document: keep existing bindings, append new ones from generated. */
export function mergeSchemaDocuments(base: SchemaDocument, generated: SchemaDocument): SchemaDocument {
  const existingIds = new Set(base.bindings.map((b) => b.bindingId));
  const newBindings = generated.bindings.filter((b) => !existingIds.has(b.bindingId));
  const newNodes = generated.nodes.filter((n) => {
    if (n.kind === "binding") return !existingIds.has(n.bindingId);
    return true;
  });
  if (newBindings.length === 0 && generated.bindings.length > 0) {
    const remapped = generated.bindings.map((b) => {
      const bindingId = existingIds.has(b.bindingId)
        ? `${b.bindingId}-${crypto.randomUUID().slice(0, 4)}`
        : b.bindingId;
      existingIds.add(bindingId);
      return { ...b, bindingId };
    });
    return {
      ...base,
      bindings: [...base.bindings, ...remapped],
      nodes: [
        ...base.nodes,
        {
          kind: "layout",
          type: "section",
          id: `ai-section-${Date.now()}`,
          props: { title: "Suggested" },
          children: remapped.map((b) => ({ kind: "binding" as const, bindingId: b.bindingId })),
        },
      ],
    };
  }
  return {
    ...base,
    bindings: [...base.bindings, ...newBindings],
    nodes: [
      ...base.nodes,
      ...(newNodes.length
        ? [
            {
              kind: "layout" as const,
              type: "section",
              id: `ai-section-${Date.now()}`,
              props: { title: "Suggested" },
              children: newNodes,
            },
          ]
        : []),
    ],
  };
}
