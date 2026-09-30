import type { SchemaGraph, SchemaNode } from "@/features/seo/platform/schema-pipeline/types";

/** Google Indexing API is limited to these Schema.org types. */
export const INDEXING_API_ELIGIBLE_TYPES = ["JobPosting", "BroadcastEvent"] as const;

export type IndexingApiEligibleType = (typeof INDEXING_API_ELIGIBLE_TYPES)[number];

const ELIGIBLE = new Set<string>(INDEXING_API_ELIGIBLE_TYPES);

export class IndexingApiNotEligibleError extends Error {
  readonly code = "INDEXING_API_NOT_ELIGIBLE" as const;

  constructor(url: string) {
    super(
      `Google Indexing API skipped for ${url}: only JobPosting and BroadcastEvent pages are eligible. Use Search Console sitemap submission and IndexNow instead.`,
    );
    this.name = "IndexingApiNotEligibleError";
  }
}

function nodeTypes(node: SchemaNode): string[] {
  const type = node["@type"];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) {
    return type.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export function graphHasIndexingApiEligibleType(graph: SchemaGraph | null | undefined): boolean {
  const nodes = graph?.["@graph"];
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  return nodes.some((node) => nodeTypes(node).some((type) => ELIGIBLE.has(type)));
}
