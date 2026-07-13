import type { DataSourceDefinition } from "./types";
import type { DataSourceClientMeta } from "../types";

/** Strip non-serializable fields (query fns, list helpers) for Client Components. */
export function toClientSourceMeta(source: DataSourceDefinition): DataSourceClientMeta {
  return {
    id: source.id,
    storage: source.storage,
    category: source.category,
    displayName: source.displayName,
    adminHref: source.adminHref,
    deploymentNavItemId: source.deploymentNavItemId,
    capabilities: { ...source.capabilities },
    prismaModelName: source.prismaModelName,
    note: source.note,
    namespace: source.namespace,
    description: source.description,
    jsonCategory: source.jsonCategory,
  };
}

export function toClientSourceMetaList(sources: DataSourceDefinition[]): DataSourceClientMeta[] {
  return sources.map(toClientSourceMeta);
}
