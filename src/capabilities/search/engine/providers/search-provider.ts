import type { SearchEntityType } from "@prisma/client";
import type {
  SearchContentKind,
  SearchIndexRecord,
  SearchVisibility,
} from "@/capabilities/search/engine/types";

export type SearchProviderContext = {
  urlPrefix: string;
  /** Locale code from indexer (e.g. en-us). */
  code: string;
};

export type SearchProviderDefinition<TSource = unknown> = {
  /** Stable logical kind (e.g. content_item, post). */
  kind: SearchContentKind;
  /** Prisma SearchEntityType stored in SearchDocument. */
  entityType: SearchEntityType;
  defaultVisibility: SearchVisibility;
  defaultBoost: number;
  /** Whether the source should be indexed. */
  shouldIndex(source: TSource): boolean;
  /** Build one or more index records for a locale. */
  buildRecords(source: TSource, ctx: SearchProviderContext): SearchIndexRecord[];
};

export interface SearchProvider<TSource = unknown> extends SearchProviderDefinition<TSource> {
  readonly id: string;
}

export function defineSearchProvider<TSource>(
  def: SearchProviderDefinition<TSource> & { id?: string }
): SearchProvider<TSource> {
  return {
    id: def.id ?? def.kind,
    ...def,
  };
}
