import type { SchemaDocument } from "../schema/schema-document";
import { LATEST_SCHEMA_VERSION } from "../schema/schema-document";
import { createBindingPair } from "../layout/layout-engine";
import type { SchemaNode } from "../schema/schema-node";
import type { ValueBinding } from "../schema/value-binding";

function bindingFromType(id: string, componentType: string, label: string, required = false) {
  const { binding, node } = createBindingPair(componentType, { label });
  const nextBinding: ValueBinding = {
    ...binding,
    bindingId: id,
    behavior: { ...binding.behavior, required },
  };
  const nextNode: SchemaNode = { kind: "binding", bindingId: id };
  return { binding: nextBinding, node: nextNode };
}

export function buildSchemaFromManifestIds(
  manifestIds: string[],
  steps?: Array<{ id: string; title: string; bindingIds: string[] }>,
): SchemaDocument {
  const bindings: ValueBinding[] = [];
  const nodes: SchemaNode[] = [];

  for (const manifestId of manifestIds) {
    const componentType = manifestId.endsWith("Field") ? manifestId : `${manifestId}Field`;
    const id = manifestId.replace(/Field$/, "");
    const label = id.charAt(0).toUpperCase() + id.slice(1);
    const { binding, node } = bindingFromType(
      id,
      componentType,
      label,
      id === "email" || id === "name",
    );
    bindings.push(binding);
    nodes.push(node);
  }

  return {
    definitionVersion: LATEST_SCHEMA_VERSION,
    nodes,
    bindings,
    steps,
  };
}
