import type { SearchEntityType } from "@prisma/client";
import type { SearchContentKind } from "@/capabilities/search/engine/types";
import type { SearchProvider } from "@/capabilities/search/engine/providers/search-provider";
import { BUILTIN_SEARCH_PROVIDERS } from "@/capabilities/search/engine/providers/builtin-providers";
import { CATALOG_SEARCH_PROVIDERS } from "@/capabilities/search/engine/providers/catalog-providers";
import { PORTAL_SEARCH_PROVIDERS } from "@/capabilities/search/engine/providers/portal-providers";
import {
  entityTypeToKind,
  kindFromMetadata,
  kindToEntityType,
} from "@/capabilities/search/engine/schema/kind-map";

export class SearchRegistry {
  private readonly byKind = new Map<SearchContentKind, SearchProvider>();
  private readonly byEntityType = new Map<SearchEntityType, SearchProvider>();

  constructor() {
    for (const provider of [...BUILTIN_SEARCH_PROVIDERS, ...CATALOG_SEARCH_PROVIDERS, ...PORTAL_SEARCH_PROVIDERS]) {
      this.register(provider);
    }
  }

  register(provider: SearchProvider): void {
    this.byKind.set(provider.kind, provider);
    this.byEntityType.set(provider.entityType, provider);
  }

  getByKind(kind: SearchContentKind): SearchProvider | undefined {
    return this.byKind.get(kind);
  }

  getByEntityType(entityType: SearchEntityType): SearchProvider | undefined {
    return this.byEntityType.get(entityType);
  }

  listProviders(): SearchProvider[] {
    return Array.from(this.byKind.values());
  }

  listKinds(): SearchContentKind[] {
    return Array.from(this.byKind.keys());
  }

  listEntityTypes(): SearchEntityType[] {
    return Array.from(this.byEntityType.keys());
  }

  resolveEntityTypes(input: {
    entityTypes?: SearchEntityType[];
    kinds?: SearchContentKind[];
  }): SearchEntityType[] | undefined {
    const fromKinds =
      input.kinds?.map((k) => kindToEntityType(k)).filter((t): t is SearchEntityType => !!t) ??
      [];
    const merged = new Set<SearchEntityType>([...(input.entityTypes ?? []), ...fromKinds]);
    if (!input.entityTypes?.length && !input.kinds?.length) return undefined;
    return Array.from(merged);
  }

  kindForEntityType(entityType: SearchEntityType, metadata?: unknown): SearchContentKind {
    return (
      kindFromMetadata(metadata) ??
      this.getByEntityType(entityType)?.kind ??
      entityTypeToKind(entityType)
    );
  }
}

/** Singleton registry — extend via `searchRegistry.register()` at app bootstrap. */
export const searchRegistry = new SearchRegistry();
