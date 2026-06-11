import type {
  ComposedSearchIndexPayload,
  SearchIndexBuildContext,
} from "@/features/search-framework/indexing/search-index-types";

export type SearchIndexExtension = {
  id: string;
  /** Lower runs first (default 100). */
  priority?: number;
  apply: (ctx: SearchIndexBuildContext, payload: ComposedSearchIndexPayload) => void | Promise<void>;
};

class SearchIndexExtensionRegistry {
  private extensions: SearchIndexExtension[] = [];

  register(extension: SearchIndexExtension): void {
    const existing = this.extensions.findIndex((e) => e.id === extension.id);
    if (existing >= 0) this.extensions[existing] = extension;
    else this.extensions.push(extension);
  }

  unregister(id: string): void {
    this.extensions = this.extensions.filter((e) => e.id !== id);
  }

  async runAll(ctx: SearchIndexBuildContext, payload: ComposedSearchIndexPayload): Promise<void> {
    const sorted = [...this.extensions].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100)
    );
    for (const ext of sorted) {
      await ext.apply(ctx, payload);
    }
  }

  list(): SearchIndexExtension[] {
    return [...this.extensions];
  }
}

export const searchIndexExtensionRegistry = new SearchIndexExtensionRegistry();
