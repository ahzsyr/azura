import type { SeoMeta } from "@prisma/client";

export type SeoExecutionSource =
  | "manual"
  | "publish"
  | "bulk"
  | "autofill"
  | "ai"
  | "cron"
  | "migration"
  | "api";

export type SeoExecutionTrigger =
  | "page_save"
  | "seo_save"
  | "translation_update"
  | "slug_change"
  | "bulk_fill"
  | "autofill"
  | "assistant"
  | "audit"
  | "scheduled";

export type SeoExecutionMode = "preview" | "dry_run" | "commit";

export type SeoExecutionContext = {
  entityType: string;
  entityId: string;
  locale: string;
  userId?: string;
  source: SeoExecutionSource;
  trigger: SeoExecutionTrigger;
  mode: SeoExecutionMode;
  correlationId: string;
  metadata?: Record<string, unknown>;
};

export type ContentSignals = Readonly<{
  h1Count: number;
  h2Count: number;
  wordCount: number;
  paragraphCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  internalLinkCount: number;
  externalLinkCount: number;
  hasFaq: boolean;
  hasCta: boolean;
  hasTable: boolean;
  hasList: boolean;
}>;

export type ContentSnapshot = Readonly<{
  id: string;
  entityType: string;
  entityId: string;
  localeCode: string;
  title: string;
  headings: ReadonlyArray<Readonly<{ level: number; text: string }>>;
  paragraphs: ReadonlyArray<string>;
  tables: ReadonlyArray<ReadonlyArray<string>>;
  images: ReadonlyArray<Readonly<{ src: string; alt?: string }>>;
  links: Readonly<{ internal: ReadonlyArray<string>; external: ReadonlyArray<string> }>;
  faq: ReadonlyArray<Readonly<{ question: string; answer: string }>>;
  products: ReadonlyArray<Readonly<Record<string, unknown>>>;
  language: string;
  signals: ContentSignals;
  capturedAt: string;
}>;

export type ProvenanceStep = Readonly<{
  label: string;
  detail?: string;
}>;

export type ProvenanceChain = ReadonlyArray<ProvenanceStep>;

export type FieldProvenance = Readonly<Record<string, ProvenanceChain>>;

export type SeoSuggestion = Readonly<{
  metaTitle?: string;
  metaDescription?: string;
  focusKeywords?: string;
  jsonLd?: unknown;
  canonicalUrl?: string;
  robots?: string;
  ogTitle?: string;
  ogImageUrl?: string;
  twitterCard?: string;
  source: "template" | "rule" | "ai" | "hybrid" | "manual" | "rule-based";
  provenance: FieldProvenance;
}>;

export type ValidationViolation = Readonly<{
  id: string;
  field?: string;
  severity: "critical" | "warn" | "info";
  message: string;
}>;

export type ValidationResult = Readonly<{
  score: number;
  violations: ReadonlyArray<ValidationViolation>;
  fieldScores: Readonly<Record<string, number>>;
}>;

export type RuleViolation = Readonly<{
  ruleId: string;
  message: string;
  severity: "critical" | "warn" | "info";
}>;

export type RuleResult = Readonly<{
  violations: ReadonlyArray<RuleViolation>;
  recommendations: ReadonlyArray<string>;
}>;

export type SeoRecommendation = Readonly<{
  id: string;
  severity: "critical" | "warn" | "info";
  message: string;
  suggestedFix?: Partial<SeoSuggestion>;
  actions: ReadonlyArray<"fix" | "autoFix" | "ignore">;
  derivedFrom: ReadonlyArray<"validation" | "rules" | "signals">;
}>;

export type SeoSimulation = Readonly<{
  currentScore: number;
  projectedScore: number;
  delta: number;
  acceptedRecommendationIds: ReadonlyArray<string>;
  estimates: ReadonlyArray<Readonly<{ label: string; impact: number }>>;
}>;

export type ValidationInput = Readonly<{
  snapshot: ContentSnapshot;
  suggestion?: SeoSuggestion;
  currentMeta?: SeoMeta | null;
}>;

export type RecommendationInput = Readonly<{
  snapshot: ContentSnapshot;
  validation: ValidationResult;
  rules: RuleResult;
  currentMeta?: SeoMeta | null;
}>;

export type SimulationInput = Readonly<{
  current: ValidationResult;
  acceptedRecommendationIds: string[];
  suggestions?: Partial<SeoSuggestion>[];
  recommendations?: SeoRecommendation[];
}>;

export type AutomationRunResult = Readonly<{
  pipelineId: string;
  correlationId: string;
  snapshot?: ContentSnapshot;
  suggestion?: SeoSuggestion;
  validation?: ValidationResult;
  rules?: RuleResult;
  recommendations?: SeoRecommendation[];
  persisted: boolean;
  events: ReadonlyArray<string>;
}>;

export type ResolvedSeoSnapshot = Readonly<{
  entityType: string;
  entityId: string;
  localeCode: string;
  suggestion: SeoSuggestion;
  validation: ValidationResult;
  generatedAt: string;
  sourceVersion: string;
}>;

export type KnowledgeEntry = Readonly<{
  id: string;
  category: "guideline" | "organization" | "industry" | "country";
  title: string;
  body: string;
}>;

export type KnowledgeContext = Readonly<{
  entries: ReadonlyArray<KnowledgeEntry>;
}>;

export type ResolvedTemplate = Readonly<{
  id: string;
  pattern: string;
  resolved: string;
}>;

export type SeoStrategyDefinition = Readonly<{
  id: string;
  label: string;
  ruleIds: ReadonlyArray<string>;
  templateIds: ReadonlyArray<string>;
  schemaTypes: ReadonlyArray<string>;
  validationWeights?: Readonly<Record<string, number>>;
}>;

export type SeoSchemaDefinition = Readonly<{
  id: string;
  type: string;
  factory: (ctx: Record<string, unknown>) => Record<string, unknown>;
}>;

export type SeoEngineLayer = "content" | "intelligence" | "governance" | "automation";

export type SeoEngine = Readonly<{
  id: string;
  layer: SeoEngineLayer;
  execute: (ctx: SeoExecutionContext, input: unknown) => Promise<unknown>;
}>;

export type ContentAnalyzer = Readonly<{
  id: string;
  analyze: (
    ctx: SeoExecutionContext,
    draft: ContentSnapshotDraft
  ) => Promise<Partial<ContentSnapshotDraft>>;
}>;

export type ContentSnapshotDraft = {
  title: string;
  headings: Array<{ level: number; text: string }>;
  paragraphs: string[];
  tables: string[][];
  images: Array<{ src: string; alt?: string }>;
  links: { internal: string[]; external: string[] };
  faq: Array<{ question: string; answer: string }>;
  products: Record<string, unknown>[];
  language: string;
  metadata?: Record<string, unknown>;
};

export type * from "./entity-descriptor";
export type * from "./change-set";
export type * from "./autofill";
export type * from "./entity-provider";

export type SeoRule = Readonly<{
  id: string;
  entityTypes?: ReadonlyArray<string>;
  when?: (snapshot: ContentSnapshot) => boolean;
  requires?: ReadonlyArray<string>;
  message: string;
  severity: "critical" | "warn" | "info";
}>;

export type SeoValidator = Readonly<{
  id: string;
  validate: (input: ValidationInput) => ValidationViolation[];
}>;

export type SeoTemplate = Readonly<{
  id: string;
  entityTypes?: ReadonlyArray<string>;
  field: keyof Pick<SeoSuggestion, "metaTitle" | "metaDescription" | "ogTitle">;
  pattern: string;
}>;

export type SeoGenerationProvider = Readonly<{
  id: string;
  generate: (input: {
    ctx: SeoExecutionContext;
    snapshot: ContentSnapshot;
    rules: RuleResult;
    templates: ResolvedTemplate[];
    knowledge: KnowledgeContext;
    current?: Partial<SeoSuggestion>;
  }) => Promise<SeoSuggestion>;
}>;

export type PipelineStep =
  | { kind: "capability"; capability: "analysis" | "generation" | "validation" | "publishing"; onCritical?: "halt" | "continue" }
  | { kind: "service"; service: "recommendations" }
  | { kind: "gate"; gate: "approval"; requiredWhen?: { source?: SeoExecutionSource } }
  | { kind: "event"; event: "submit" };

export type PipelineDefinition = Readonly<{
  id: string;
  trigger?: SeoExecutionTrigger;
  steps: ReadonlyArray<PipelineStep>;
}>;
