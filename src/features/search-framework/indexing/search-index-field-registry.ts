import { getLocalizedField } from "@/lib/utils";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import type { SearchIndexFieldKey } from "@/features/search-framework/indexing/search-index-field-keys";
import {
  fieldFacetEnabled,
  fieldWeight,
  isFieldActive,
} from "@/features/search-framework/indexing/search-index-profile";
import {
  extractFacetValues,
  extractSearchableAttributeText,
  type SearchableFieldDefinition,
} from "@/features/search-framework/schema/search-field-schema";
import {
  flattenJsonToText,
  normalizeTags,
  stringifyIndexValue,
} from "@/features/search-framework/indexing/search-text-utils";
import type {
  SearchIndexBuildContext,
  SearchIndexFieldSlice,
  SearchIndexSeoSnapshot,
} from "@/features/search-framework/indexing/search-index-types";
import { isCustomFieldKey } from "@/features/search-framework/indexing/search-index-field-keys";

export type SearchIndexFieldExtractor = (
  ctx: SearchIndexBuildContext,
  key: SearchIndexFieldKey
) => SearchIndexFieldSlice | null;

const standardExtractors: Record<string, SearchIndexFieldExtractor> = {
  title(ctx) {
    const t = getLocalizedField(ctx.source, "title", ctx.providerContext.urlPrefix);
    if (!t) return null;
    return {
      key: "title",
      text: t,
      weight: fieldWeight(ctx.profile, "title"),
      asTitle: true,
    };
  },

  name(ctx) {
    const attrs = ctx.source.attributes ?? {};
    const fromAttr =
      stringifyIndexValue(attrs.name) ||
      stringifyIndexValue(attrs.productTitle) ||
      stringifyIndexValue(attrs.displayName);
    const t =
      fromAttr || getLocalizedField(ctx.source, "title", ctx.providerContext.urlPrefix);
    if (!t) return null;
    return { key: "name", text: t, weight: fieldWeight(ctx.profile, "name") };
  },

  slug(ctx) {
    const slug = ctx.source.slug?.trim();
    if (!slug) return null;
    return { key: "slug", text: slug, weight: fieldWeight(ctx.profile, "slug") };
  },

  summary(ctx) {
    const t = getLocalizedField(ctx.source, "excerpt", ctx.providerContext.urlPrefix);
    if (!t) return null;
    return { key: "summary", text: t, weight: fieldWeight(ctx.profile, "summary") };
  },

  description(ctx) {
    const t = getLocalizedField(ctx.source, "description", ctx.providerContext.urlPrefix);
    if (!t) return null;
    return { key: "description", text: t, weight: fieldWeight(ctx.profile, "description") };
  },

  content(ctx) {
    const parts: string[] = [];
    const desc = getLocalizedField(ctx.source, "description", ctx.providerContext.urlPrefix);
    if (desc) parts.push(desc);
    if (ctx.source.blocks) {
      parts.push(flattenJsonToText(ctx.source.blocks));
    }
    const text = parts.filter(Boolean).join("\n").trim();
    if (!text) return null;
    return { key: "content", text, weight: fieldWeight(ctx.profile, "content") };
  },

  tags(ctx) {
    const tags = [
      ...normalizeTags(ctx.source.tags),
      ...normalizeTags(ctx.source.attributes?.tags),
      ...normalizeTags(ctx.source.metadata?.tags),
    ];
    const unique = [...new Set(tags)];
    if (!unique.length) return null;
    const facet = fieldFacetEnabled(ctx.profile, "tags") ? { tags: unique } : undefined;
    return {
      key: "tags",
      text: unique.join(" "),
      weight: fieldWeight(ctx.profile, "tags"),
      facet,
    };
  },

  categories(ctx) {
    const cats = [
      ...(ctx.source.categories ?? []),
      ...normalizeTags(ctx.source.attributes?.categories),
      ...normalizeTags(ctx.source.attributes?.category),
    ];
    const unique = [...new Set(cats.filter(Boolean))];
    if (!unique.length) return null;
    const facet = fieldFacetEnabled(ctx.profile, "categories")
      ? { categories: unique }
      : undefined;
    return {
      key: "categories",
      text: unique.join(" "),
      weight: fieldWeight(ctx.profile, "categories"),
      facet,
    };
  },

  collections(ctx) {
    const col = ctx.source.collection;
    if (!col) return null;
    const name = getLocalizedField(
      { titleEn: col.nameEn, titleAr: col.nameAr },
      "title",
      ctx.providerContext.urlPrefix
    );
    const parts = [name, col.slug].filter(Boolean);
    const facet = fieldFacetEnabled(ctx.profile, "collections")
      ? { collectionSlug: col.slug }
      : undefined;
    return {
      key: "collections",
      text: parts.join(" "),
      weight: fieldWeight(ctx.profile, "collections"),
      facet,
    };
  },

  custom_fields(ctx) {
    const text = extractSearchableAttributeText(
      ctx.source.attributes ?? {},
      ctx.fieldSchema
    );
    if (!text) return null;
    const facet = extractFacetValues(ctx.source.attributes ?? {}, ctx.fieldSchema);
    return {
      key: "custom_fields",
      text,
      weight: fieldWeight(ctx.profile, "custom_fields"),
      facet: Object.keys(facet).length ? facet : undefined,
    };
  },

  seo_fields(ctx) {
    const text = extractSeoText(ctx.source.seo, ctx.providerContext.urlPrefix);
    if (!text) return null;
    return {
      key: "seo_fields",
      text,
      weight: fieldWeight(ctx.profile, "seo_fields"),
    };
  },

  metadata(ctx) {
    const meta = ctx.source.metadata;
    if (!meta || !Object.keys(meta).length) return null;
    const text = flattenJsonToText(meta, 6000);
    if (!text) return null;
    return { key: "metadata", text, weight: fieldWeight(ctx.profile, "metadata") };
  },
};

const customExtractors = new Map<string, SearchIndexFieldExtractor>();

export class SearchIndexFieldRegistry {
  private readonly extra = new Map<SearchIndexFieldKey, SearchIndexFieldExtractor>();

  register(key: SearchIndexFieldKey, extractor: SearchIndexFieldExtractor): void {
    this.extra.set(key, extractor);
  }

  extract(ctx: SearchIndexBuildContext, key: SearchIndexFieldKey): SearchIndexFieldSlice | null {
    if (isCustomFieldKey(key)) {
      return this.extractCustom(ctx, key);
    }
    const custom = this.extra.get(key) ?? customExtractors.get(key);
    if (custom) return custom(ctx, key);
    const standard = standardExtractors[key as string];
    if (standard) return standard(ctx, key);
    return null;
  }

  extractAll(ctx: SearchIndexBuildContext): SearchIndexFieldSlice[] {
    const slices: SearchIndexFieldSlice[] = [];
    for (const key of ctx.profile.activeKeys) {
      if (!isFieldActive(ctx.profile, key)) continue;
      const slice = this.extract(ctx, key);
      if (slice?.text.trim()) slices.push(slice);
    }
    return slices;
  }

  private extractCustom(
    ctx: SearchIndexBuildContext,
    key: `custom:${string}`
  ): SearchIndexFieldSlice | null {
    const attrKey = key.slice("custom:".length);
    const raw = (ctx.source.attributes ?? {})[attrKey];
    const text = stringifyIndexValue(raw);
    if (!text) return null;
    const facet =
      fieldFacetEnabled(ctx.profile, key) || fieldFacetEnabled(ctx.profile, "custom_fields")
        ? { [attrKey]: text }
        : undefined;
    return {
      key,
      text,
      weight: fieldWeight(ctx.profile, key),
      facet,
    };
  }
}

export const searchIndexFieldRegistry = new SearchIndexFieldRegistry();

function extractSeoText(seo: SearchIndexSeoSnapshot | null | undefined, urlPrefix: string): string {
  if (!seo) return "";
  const title = getLocalizedField(
    {
      titleEn: seo.titleEn ?? "",
      titleAr: seo.titleAr ?? "",
    },
    "title",
    urlPrefix
  );
  const description = getLocalizedField(
    {
      descriptionEn: seo.descriptionEn ?? "",
      descriptionAr: seo.descriptionAr ?? "",
    },
    "description",
    urlPrefix
  );
  const og = getLocalizedField(
    {
      titleEn: seo.ogTitleEn ?? "",
      titleAr: seo.ogTitleAr ?? "",
    },
    "title",
    urlPrefix
  );
  return [title, description, og, seo.focusKeywords, seo.canonicalUrl].filter(Boolean).join("\n");
}

