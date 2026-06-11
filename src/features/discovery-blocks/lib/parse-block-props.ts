import { safeParseProps } from "@/lib/zod/safe-parse-props";
import {
  advancedFiltersPropsSchema,
  categoryExplorerPropsSchema,
  recentlyViewedPropsSchema,
  relatedContentPropsSchema,
  searchBlockPropsSchema,
} from "@/features/discovery-blocks/schemas/discovery-blocks";

const DEFAULT_SEARCH_BLOCK = searchBlockPropsSchema.parse({});
const DEFAULT_ADVANCED_FILTERS = advancedFiltersPropsSchema.parse({});
const DEFAULT_CATEGORY_EXPLORER = categoryExplorerPropsSchema.parse({});
const DEFAULT_RELATED_CONTENT = relatedContentPropsSchema.parse({});
const DEFAULT_RECENTLY_VIEWED = recentlyViewedPropsSchema.parse({});

export function parseSearchBlockProps(raw: Record<string, unknown>) {
  return safeParseProps(
    searchBlockPropsSchema,
    raw,
    DEFAULT_SEARCH_BLOCK,
    "parseSearchBlockProps",
  );
}

export function parseAdvancedFiltersProps(raw: Record<string, unknown>) {
  return safeParseProps(
    advancedFiltersPropsSchema,
    raw,
    DEFAULT_ADVANCED_FILTERS,
    "parseAdvancedFiltersProps",
  );
}

export function parseCategoryExplorerProps(raw: Record<string, unknown>) {
  return safeParseProps(
    categoryExplorerPropsSchema,
    raw,
    DEFAULT_CATEGORY_EXPLORER,
    "parseCategoryExplorerProps",
  );
}

export function parseRelatedContentProps(raw: Record<string, unknown>) {
  return safeParseProps(
    relatedContentPropsSchema,
    raw,
    DEFAULT_RELATED_CONTENT,
    "parseRelatedContentProps",
  );
}

export function parseRecentlyViewedProps(raw: Record<string, unknown>) {
  return safeParseProps(
    recentlyViewedPropsSchema,
    raw,
    DEFAULT_RECENTLY_VIEWED,
    "parseRecentlyViewedProps",
  );
}
