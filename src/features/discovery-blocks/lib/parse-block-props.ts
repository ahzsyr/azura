import {
  advancedFiltersPropsSchema,
  categoryExplorerPropsSchema,
  recentlyViewedPropsSchema,
  relatedContentPropsSchema,
  searchBlockPropsSchema,
} from "@/features/discovery-blocks/schemas/discovery-blocks";

export function parseSearchBlockProps(raw: Record<string, unknown>) {
  return searchBlockPropsSchema.parse(raw);
}

export function parseAdvancedFiltersProps(raw: Record<string, unknown>) {
  return advancedFiltersPropsSchema.parse(raw);
}

export function parseCategoryExplorerProps(raw: Record<string, unknown>) {
  return categoryExplorerPropsSchema.parse(raw);
}

export function parseRelatedContentProps(raw: Record<string, unknown>) {
  return relatedContentPropsSchema.parse(raw);
}

export function parseRecentlyViewedProps(raw: Record<string, unknown>) {
  return recentlyViewedPropsSchema.parse(raw);
}
