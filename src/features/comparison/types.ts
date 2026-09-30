export type ToggleCompareResult = "added" | "removed" | "full";

export type ComparisonMode = "table" | "cards" | "hybrid";

export type ComparisonAttributeOverride = {
  key: string;
  labelEn?: string;
  labelAr?: string;
  compareOrder?: number;
  compareGroup?: string;
  highlightDifferences?: boolean;
};

export type ComparisonAttribute = {
  id: string;
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  category?: string;
  highlight?: boolean;
};

export type ComparisonSettings = {
  enabled: boolean;
  maxItems: number;
  comparisonMode: ComparisonMode;
  attributes?: ComparisonAttributeOverride[];
  /** Display priority when multiple types have selections (lower = higher in hub) */
  comparisonPriority?: number;
};

export type ContentTypeComparisonConfig = {
  isComparable: boolean;
  /** Optional hub grouping label */
  comparisonGroup?: string;
  comparisonPriority?: number;
  comparisonSettings: ComparisonSettings;
};

export type CompareFieldMeta = {
  key: string;
  field: import("@/features/content/types").ContentFieldDefinition;
  labelEn: string;
  labelAr?: string;
  compareOrder: number;
  compareGroup: string;
  highlightDifferences: boolean;
};

export type CompareRowEntry =
  | { type: "group"; group: string }
  | {
      type: "row";
      key: string;
      group: string;
      label: string;
      values: (string | null)[];
      differs: boolean;
      highlightDifferences: boolean;
    };

export type CompareItemSnapshot = {
  id: string;
  contentTypeSlug: string;
  slug: string | null;
  /** Default-locale canonical title (EntityTranslation-backed when present). */
  title?: string;
  /** @deprecated Use compareItemTitle / getLocalizedField */
  titleEn: string;
  /** @deprecated Use compareItemTitle / getLocalizedField */
  titleAr: string;
  translations?: import("@prisma/client").EntityTranslation[];
  href: string;
  imageUrl: string | null;
  attributes: Record<string, unknown>;
};

export type CompareViewMode = "all" | "differences" | "hideEqual";

export type CompareSelectionBucket = {
  contentTypeSlug: string;
  contentTypeId: string;
  labelPluralEn: string;
  labelPluralAr: string;
  routePrefix: string | null;
  itemIds: string[];
  maxItems: number;
};

export type ComparableTypeMeta = {
  id: string;
  slug: string;
  labelPluralEn: string;
  labelPluralAr: string;
  routePrefix: string | null;
  maxItems: number;
  comparisonMode: ComparisonMode;
};
