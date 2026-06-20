import type { SearchEntityType } from "@prisma/client";
import type { PublicAutocompleteConfig } from "@/features/search/settings/search-autocomplete-config";

export type AutocompleteHit = {
  id?: string;
  entityId?: string;
  title: string;
  snippet?: string;
  urlPath: string;
  adminPath?: string;
  entityType: SearchEntityType;
  kind?: string;
  contentTypeSlug?: string;
  score?: number;
  facets?: Record<string, string | string[] | number | boolean>;
};

export type AutocompletePayload = {
  popular: string[];
  trending: string[];
  suggestions: AutocompleteHit[];
  results: AutocompleteHit[];
  grouped?: Record<string, AutocompleteHit[]>;
  relatedTerms?: string[];
};

export type SearchDiscoveryPayload = {
  entityTypes: import("@prisma/client").SearchEntityType[];
  entityLabels: Record<
    import("@prisma/client").SearchEntityType,
    { en: string; ar: string }
  >;
  contentTypes: { slug: string; label?: string; labelEn?: string; labelAr?: string }[];
  config?: import("@/features/search/settings/public-search-config").PublicSearchConfig;
  autocomplete?: PublicAutocompleteConfig;
};
