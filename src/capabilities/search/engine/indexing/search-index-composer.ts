import type { SearchProviderContext } from "@/capabilities/search/engine/providers/search-provider";
import { resolveSearchIndexProfile } from "@/capabilities/search/engine/indexing/search-index-profile";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import type { SearchableFieldDefinition } from "@/capabilities/search/engine/schema/search-field-schema";
import { searchIndexFieldRegistry } from "@/capabilities/search/engine/indexing/search-index-field-registry";
import { searchIndexExtensionRegistry } from "@/capabilities/search/engine/indexing/search-index-extensions";
import type {
  ComposedSearchIndexPayload,
  ContentItemSearchSource,
  SearchIndexBuildContext,
} from "@/capabilities/search/engine/indexing/search-index-types";
import { SEARCH_INDEX_PROFILE_VERSION } from "@/capabilities/search/engine/indexing/search-index-types";
import { resolveIndexTitle } from "@/capabilities/search/lib/resolve-index-title";

export class SearchIndexComposer {
  buildContentItemContext(
    source: ContentItemSearchSource,
    providerContext: SearchProviderContext
  ): SearchIndexBuildContext {
    const fieldSchema =
      source.resolvedFieldSchema ??
      (resolveFieldSchema(
        { fieldSchema: source.fieldSchema ?? [] },
        source.contentTypeSlug ?? ""
      ) as SearchableFieldDefinition[]);

    const profile =
      source.indexProfile ??
      resolveSearchIndexProfile(source.adminConfig, fieldSchema);

    return {
      providerContext,
      profile,
      fieldSchema,
      source,
    };
  }

  async composeContentItem(
    source: ContentItemSearchSource,
    providerContext: SearchProviderContext
  ): Promise<ComposedSearchIndexPayload> {
    const ctx = this.buildContentItemContext(source, providerContext);
    return this.compose(ctx);
  }

  async compose(ctx: SearchIndexBuildContext): Promise<ComposedSearchIndexPayload> {
    const slices = searchIndexFieldRegistry.extractAll(ctx);

    let title = "";
    for (const slice of slices) {
      if (slice.asTitle && slice.text.length > title.length) {
        title = slice.text;
      }
    }
    if (!title) {
      const titleSlice = slices.find((s) => s.key === "title" || s.key === "name");
      title = titleSlice?.text ?? slices[0]?.text ?? "";
    }
    const slug = typeof ctx.source.slug === "string" ? ctx.source.slug : ctx.source.id;
    title = resolveIndexTitle(title, slug, {
      entityType: "CONTENT_ITEM",
      entityId: ctx.source.id,
      locale: ctx.providerContext.urlPrefix,
    });

    const bodyParts: { text: string; weight: number }[] = [];
    const facets: Record<string, string | string[]> = {};

    for (const slice of slices) {
      if (slice.key === "title" && slice.text === title) {
        /* title also in body lightly */
        bodyParts.push({ text: slice.text, weight: slice.weight * 0.5 });
        continue;
      }
      if (slice.asTitle && slice.text === title) continue;
      bodyParts.push({ text: slice.text, weight: slice.weight });
      if (slice.facet) {
        for (const [k, v] of Object.entries(slice.facet)) {
          facets[k] = v;
        }
      }
    }

    bodyParts.sort((a, b) => b.weight - a.weight);
    const body = bodyParts
      .map((p) => p.text)
      .filter(Boolean)
      .join("\n")
      .trim();

    const payload: ComposedSearchIndexPayload = {
      title: title.trim(),
      body,
      facets,
      fieldSlices: slices,
      profileVersion: SEARCH_INDEX_PROFILE_VERSION,
    };

    await searchIndexExtensionRegistry.runAll(ctx, payload);
    return payload;
  }
}

export const searchIndexComposer = new SearchIndexComposer();

/** Merge composed payload into search document body with optional weight repeat for emphasis. */
export function composedPayloadToIndexText(payload: ComposedSearchIndexPayload): {
  title: string;
  body: string;
} {
  return { title: payload.title, body: payload.body };
}
