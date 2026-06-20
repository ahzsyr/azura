import type { SeoMeta } from "@prisma/client";
import type { SearchIndexFieldKey } from "@/features/search-framework/indexing/search-index-field-keys";
import type { ResolvedSearchIndexProfile } from "@/features/search-framework/indexing/search-index-profile";
import type { SearchableFieldDefinition } from "@/features/search-framework/schema/search-field-schema";
import type { SearchProviderContext } from "@/features/search-framework/providers/search-provider";

import type { LocalizedValueMap } from "@/features/translation/types";

export type SearchIndexCollectionRef = {
  id: string;
  slug: string;
  name: LocalizedValueMap;
};

export type SearchIndexSeoSnapshot = {
  title?: LocalizedValueMap;
  description?: LocalizedValueMap;
  focusKeywords?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: LocalizedValueMap;
};

export type ContentItemSearchSource = {
  id: string;
  slug: string | null;
  title: LocalizedValueMap;
  excerpt?: LocalizedValueMap;
  description: LocalizedValueMap;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  blocks?: unknown;
  status?: string;
  isVisible?: boolean;
  routePrefix?: string | null;
  contentTypeSlug?: string;
  fieldSchema?: unknown;
  /** Pre-resolved searchable field definitions (avoids double resolution in composer). */
  resolvedFieldSchema?: SearchableFieldDefinition[];
  searchEnabled?: boolean;
  searchBoost?: number;
  adminConfig?: unknown;
  indexProfile?: ResolvedSearchIndexProfile;
  collection?: SearchIndexCollectionRef | null;
  seo?: SearchIndexSeoSnapshot | null;
  tags?: string[];
  categories?: string[];
  isFeatured?: boolean;
  publishedAt?: Date | string | null;
};

export type SearchIndexBuildContext = {
  providerContext: SearchProviderContext;
  profile: ResolvedSearchIndexProfile;
  fieldSchema: SearchableFieldDefinition[];
  source: ContentItemSearchSource;
};

export type SearchIndexFieldSlice = {
  key: SearchIndexFieldKey;
  text: string;
  weight: number;
  facet?: Record<string, string | string[]>;
  /** Prefer this string as document title when set. */
  asTitle?: boolean;
};

export type ComposedSearchIndexPayload = {
  title: string;
  body: string;
  facets: Record<string, string | string[] | number | boolean>;
  /** Per-field indexed text (debugging, extensions, future ranking). */
  fieldSlices: SearchIndexFieldSlice[];
  profileVersion: number;
};

export const SEARCH_INDEX_PROFILE_VERSION = 1;
