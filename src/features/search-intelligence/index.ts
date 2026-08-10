/**
 * Search Intelligence Platform
 *
 * Shared entity graph and intelligence modules consumed by SEO, AI, and Search.
 * SEO remains a delivery channel — it does not own the graph.
 */

export type * from "./types";

export {
  createSearchIntelligencePlatform,
  getSearchIntelligencePlatform,
  resetSearchIntelligencePlatformForTests,
} from "./platform";
export type { SearchIntelligencePlatform, SearchIntelligencePlatformOptions } from "./platform";

export * from "./entity-graph";
export {
  createSchemaPipeline,
  validateSchemaGraph,
  schemaGraphFingerprint,
} from "./schema";
export type { SchemaBuildResult, SchemaGraph, SchemaValidationIssue } from "./schema";
export { createSchemaVersionRegistry } from "./schema/version-registry";
export type { SchemaVersionRegistry } from "./schema/version-registry";
export {
  buildGraphBackedSchema,
  organizationSchemaFields,
  resolveOrganizationFromGraph,
} from "./schema/graph-consumer";
// seo-bridge and seo-consumer are server-oriented — import from dedicated paths:
// `@/features/search-intelligence/schema/seo-bridge`
// `@/features/search-intelligence/seo-consumer`
export {
  runStaticAnalysis,
  runContinuousCrawlAnalysis,
  createTechnicalSeoIssueStore,
} from "./technical-seo";
export type { StaticAnalysisInput, CrawlProbeResult } from "./technical-seo";
export { createIndexationLifecycleService } from "./indexing";
export {
  recommendInternalLinks,
  computeGraphMetrics,
  summarizeLinkHealth,
} from "./internal-linking";
export {
  buildTopicClusters,
  detectContentGaps,
  detectCannibalization,
} from "./content-intelligence";
export { scorePageAudit } from "./ai";
export type { AiAuditSignals, PageAuditScore } from "./ai";
export { scoreAuthority, detectNapDrift } from "./authority";
export type { AuthoritySignals, NapSnapshot, AuthorityReport } from "./authority";
export { correlatePerformanceToOutcomes, listSlowPages } from "./performance";
export type { CwvSample, SeoOutcomeSample, PerformanceCorrelation } from "./performance";
export { createConnectorFramework, CONNECTOR_DEFINITIONS } from "./integrations";
export type { ConnectorId, ConnectorFramework } from "./integrations";
export { buildAnalyticsDashboard } from "./analytics";
export { createAuditLog } from "./observability";
export { createRevisionStore } from "./versioning";
export { createEnterpriseControls } from "./enterprise";
export type { EnterpriseControls } from "./enterprise";
export {
  createOperationsEngine,
  createQueueAdapter,
  OPERATION_DEFINITIONS,
  DEFAULT_APPROVAL_POLICY,
  summarizeQueue,
} from "./operations";
export type {
  OperationsEngine,
  OperationDefinition,
  ExecutionRecord,
  RiskLevel,
  ApprovalPolicyConfig,
  ImpactSimulation,
} from "./operations";
export { createAutomationEngine } from "./automation";
export type { AutomationEngine, AutomationRule } from "./automation";
export { simulateSearchImpact } from "./impact";
export {
  buildCommandCenter,
  buildCommandCenterAsync,
  buildKnowledgeReadinessChecklist,
  buildUrlInspector,
  buildSerpPreview,
} from "./workspaces";
export { buildActionCenterVm } from "./action-center";
