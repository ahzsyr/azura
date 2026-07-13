import type { SeoChangeSet } from "./change-set";
import type { SeoEntityDescriptor } from "./entity-descriptor";
import type {
  ContentSnapshot,
  RuleResult,
  SeoRecommendation,
  SeoSuggestion,
  ValidationResult,
} from "../types";

export type GenerationProfile = Readonly<{
  id: string;
  label: string;
  strategyId?: string;
  providerId?: string;
  templateIds?: ReadonlyArray<string>;
  ruleIds?: ReadonlyArray<string>;
  options?: Readonly<Record<string, unknown>>;
}>;

export type SeoFieldDiff = Readonly<{
  field: string;
  current: string | null;
  suggested: string | null;
  changed: boolean;
  score?: number;
}>;

export type SeoDiffResult = Readonly<{
  fields: ReadonlyArray<SeoFieldDiff>;
  hasChanges: boolean;
}>;

export type SeoPreviewField = Readonly<{
  field: string;
  label: string;
  current: string | null;
  suggested: string | null;
  changed: boolean;
  severity?: "critical" | "warn" | "info";
  message?: string;
}>;

export type SeoPreviewModel = Readonly<{
  correlationId: string;
  descriptor: SeoEntityDescriptor;
  fields: ReadonlyArray<SeoPreviewField>;
  validation?: ValidationResult;
  score?: number;
}>;

export type AutoFillSuggestOptions = Readonly<{
  profileId?: string;
  applyMode?: import("./change-set").ApplyMode;
  origin?: import("./change-set").SeoChangeOrigin;
  descriptor?: SeoEntityDescriptor;
}>;

export type AutoFillSuggestionResult = Readonly<{
  correlationId: string;
  descriptor: SeoEntityDescriptor;
  snapshot: ContentSnapshot;
  suggestion: SeoSuggestion;
  diff: SeoDiffResult;
  previewModel: SeoPreviewModel;
  changeSet: SeoChangeSet;
  validation: ValidationResult;
  rules: RuleResult;
  recommendations: ReadonlyArray<SeoRecommendation>;
}>;

export type AutoFillCommitOptions = Readonly<{
  fieldSelection?: ReadonlyArray<string>;
}>;

export type AutoFillCommitResult = Readonly<{
  changeSet: SeoChangeSet;
  seoMetaId: string;
}>;

export type BulkTarget =
  | "products"
  | "brands"
  | "collections"
  | "categories"
  | "pages"
  | "posts"
  | "packages"
  | "static"
  | "all";

export type BulkEntityFilter = Readonly<{
  missingSeoOnly?: boolean;
  updatedSince?: string;
  brandSlug?: string;
  categorySlug?: string;
  search?: string;
  selectedIds?: ReadonlyArray<string>;
  localeCodes?: ReadonlyArray<string>;
  offset?: number;
  limit?: number;
}>;

export type BulkSegmentMeta = Readonly<{
  index: number;
  offset: number;
  limit: number;
  totalItems: number;
  segmentCount: number;
}>;

export type BulkCapability =
  | "autofill"
  | "validate"
  | "publish"
  | "redirect"
  | "ai"
  | "import";

export type BulkExecutionInput = Readonly<{
  capability: BulkCapability;
  target: BulkTarget;
  filter?: BulkEntityFilter;
  dryRun?: boolean;
  options?: Readonly<{
    profileId?: string;
    applyMode?: import("./change-set").ApplyMode;
    origin?: import("./change-set").SeoChangeOrigin;
    sampleSize?: number;
    concurrency?: number;
    segmentIndex?: number;
    segmentSize?: number;
  }>;
}>;

export type BulkExecutionResult = Readonly<{
  dryRun: false;
  totalMatched: number;
  processed: number;
  changed: number;
  skipped: number;
  failed: number;
  errors: ReadonlyArray<{ descriptor: SeoEntityDescriptor; message: string }>;
  segment?: BulkSegmentMeta;
}>;

export type BulkDryRunResult = Readonly<{
  dryRun: true;
  totalMatched: number;
  estimatedChanges: number;
  skipped: number;
  failed: number;
  sampleChangeSets: ReadonlyArray<SeoChangeSet>;
  warnings: ReadonlyArray<string>;
  segment?: BulkSegmentMeta;
}>;
