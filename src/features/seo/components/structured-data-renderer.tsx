import type { SchemaGraph } from "@/features/seo/platform/schema-pipeline/types";

export function serializeSchemaGraph(graph: SchemaGraph): string {
  return JSON.stringify(graph);
}

export function StructuredDataRenderer({ graph }: { graph: SchemaGraph }) {
  if (!graph["@graph"].length) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeSchemaGraph(graph) }}
    />
  );
}
