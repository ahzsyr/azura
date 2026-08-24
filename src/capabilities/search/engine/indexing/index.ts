export {
  STANDARD_SEARCH_INDEX_FIELDS,
  type StandardSearchIndexFieldKey,
  type SearchIndexFieldKey,
  isCustomFieldKey,
  customFieldKeyFromSchema,
} from "./search-index-field-keys";

export {
  resolveSearchIndexProfile,
  isFieldActive,
  fieldWeight,
  fieldFacetEnabled,
  type ResolvedSearchIndexProfile,
  type SearchIndexFieldRule,
} from "./search-index-profile";

export {
  SearchIndexComposer,
  searchIndexComposer,
  composedPayloadToIndexText,
} from "./search-index-composer";

export {
  SearchIndexFieldRegistry,
  searchIndexFieldRegistry,
  type SearchIndexFieldExtractor,
} from "./search-index-field-registry";

export {
  searchIndexExtensionRegistry,
  type SearchIndexExtension,
} from "./search-index-extensions";

export type {
  ContentItemSearchSource,
  ComposedSearchIndexPayload,
  SearchIndexBuildContext,
  SearchIndexFieldSlice,
  SearchIndexSeoSnapshot,
  SEARCH_INDEX_PROFILE_VERSION,
} from "./search-index-types";

export {
  dbContentItemToSearchSource,
  enrichContentItemSearchSource,
  composeContentItemForLocale,
  loadSeoMapForItems,
  type ContentItemDbShape,
} from "./content-item-index-pipeline";

export {
  loadSeoForContentItem,
  loadSeoBatchForContentItems,
  seoMetaToSnapshot,
} from "./seo-index-loader";

export { flattenJsonToText, stringifyIndexValue, normalizeTags } from "./search-text-utils";
