import type { SourceRecord } from "./types";
import {
  createInMemoryEntityStore,
  createGraphQueryService,
  createGraphTraversalService,
  createNormalizationPipeline,
  createPolicyEngine,
  companyInfoToSourceRecords,
  propertyMeta,
  readPropertyValue,
  type CompanySourceInput,
} from "./entity-graph";
import { createSchemaVersionRegistry } from "./schema/version-registry";
import { createSchemaPipeline } from "./schema";
import {
  createTechnicalSeoIssueStore,
  runStaticAnalysis,
  runContinuousCrawlAnalysis,
  type StaticAnalysisInput,
  type CrawlProbeResult,
} from "./technical-seo";
import { createIndexationLifecycleService } from "./indexing";
import { recommendInternalLinks, computeGraphMetrics } from "./internal-linking";
import { detectContentGaps, detectCannibalization, buildTopicClusters } from "./content-intelligence";
import { scorePageAudit, type AiAuditSignals } from "./ai";
import { scoreAuthority, type AuthoritySignals, type NapSnapshot } from "./authority";
import { correlatePerformanceToOutcomes, type CwvSample, type SeoOutcomeSample } from "./performance";
import { createConnectorFramework } from "./integrations";
import { buildAnalyticsDashboard } from "./analytics";
import { createAuditLog } from "./observability";
import { createRevisionStore } from "./versioning";
import {
  createOperationsEngine,
  createQueueAdapter,
  type OperationRequest,
} from "./operations";
import { createAutomationEngine } from "./automation";
import { simulateSearchImpact } from "./impact";
import {
  buildCommandCenterAsync,
  buildKnowledgeReadinessChecklist,
  buildUrlInspector,
  buildSerpPreview,
} from "./workspaces";
import { buildActionCenterVm } from "./action-center";
import { nowIso } from "./entity-graph/factory";

export type SearchIntelligencePlatformOptions = {
  siteOrigin?: string;
};

export function createSearchIntelligencePlatform(options: SearchIntelligencePlatformOptions = {}) {
  const siteOrigin = options.siteOrigin ?? "https://example.com";
  const store = createInMemoryEntityStore();
  const query = createGraphQueryService(store);
  const traversal = createGraphTraversalService(store, query);
  const policy = createPolicyEngine();
  const normalization = createNormalizationPipeline({ store, policy });
  const schemaVersions = createSchemaVersionRegistry([
    { version: 1, enabled: true, shadowMode: true },
  ]);
  const schema = createSchemaPipeline({
    store,
    query,
    siteOrigin,
    versionFlags: schemaVersions.list(),
  });
  const issues = createTechnicalSeoIssueStore();
  const indexation = createIndexationLifecycleService();
  const connectors = createConnectorFramework();
  const auditLog = createAuditLog();
  const revisions = createRevisionStore();
  const operations = createOperationsEngine();
  const queue = createQueueAdapter(operations);
  const automation = createAutomationEngine(operations);

  operations.registerHandler("schema.rebuild", async () => {
    const result = await schema.buildFromGraph({
      pageUrl: `${siteOrigin}/`,
      pageTitle: "Homepage",
      locale: "en",
    });
    return { nodes: result.graph["@graph"].length, issues: result.issues.length };
  });
  operations.registerHandler("schema.validate", async () => {
    const result = await schema.buildFromGraph({
      pageUrl: `${siteOrigin}/`,
      pageTitle: "Homepage",
    });
    return { issues: result.issues };
  });
  operations.registerHandler("schema.publish", async () => {
    const enabled = schemaVersions.enable(1, { shadowMode: false });
    return { version: enabled.version, shadowMode: enabled.shadowMode };
  });
  operations.registerHandler("entity.edit", async (record) => {
    const publicId = String(record.payload.publicId ?? "");
    const entity = await store.entities.getByPublicId(publicId as never);
    if (!entity) throw new Error("Entity not found");
    const fields = (record.payload.fields ?? {}) as Record<string, unknown>;
    const next = { ...entity, properties: { ...entity.properties }, updatedAt: nowIso() };
    for (const [key, value] of Object.entries(fields)) {
      next.properties[key] = propertyMeta(value, "manual_admin", {
        editor: record.actor,
        verified: true,
      });
    }
    await store.entities.upsert(next);
    revisions.create({
      targetType: "entity",
      targetId: publicId,
      summary: "Entity edit",
      before: entity.properties,
      after: next.properties,
      actor: record.actor,
    });
    return { publicId, fields: Object.keys(fields) };
  });
  operations.registerHandler("entity.validate", async (record) => {
    const publicId = String(record.payload.publicId ?? record.targetId ?? "");
    const entity = publicId
      ? await store.entities.getByPublicId(publicId as never)
      : (await query.findByType("Organization"))[0];
    if (!entity) throw new Error("No entity to validate");
    const missing = ["name", "logo", "phone", "email", "address", "sameAs"].filter(
      (key) => readPropertyValue(entity, key) == null,
    );
    return { publicId: entity.publicId, missing, ok: missing.length === 0 };
  });
  operations.registerHandler("entity.merge", async (record) => {
    const fromId = String(record.payload.fromPublicId ?? "");
    const toId = String(record.payload.toPublicId ?? "");
    const from = await store.entities.getByPublicId(fromId as never);
    const to = await store.entities.getByPublicId(toId as never);
    if (!from || !to) throw new Error("Merge targets missing");
    const merged = {
      ...to,
      properties: { ...to.properties, ...from.properties },
      updatedAt: nowIso(),
    };
    await store.entities.upsert(merged);
    await store.entities.deleteByPublicId(fromId as never);
    return { kept: toId, removed: fromId };
  });
  operations.registerHandler("google.request_indexing", async (record) => {
    const url = String(record.payload.url ?? `${siteOrigin}/`);
    const { publishUrlToIndexingApi } = await import("@/features/seo/google-live/indexing-api");
    connectors.beginSync("indexing_api");
    try {
      const result = await publishUrlToIndexingApi(url, "URL_UPDATED");
      indexation.transition(url, "submitted", { note: "Requested via Indexing API" });
      connectors.completeSync("indexing_api", { submitted: 1 });
      return result;
    } catch (error) {
      connectors.fail("indexing_api", error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
  operations.registerHandler("page.inspect_url", async (record) => {
    const url = String(record.payload.url ?? `${siteOrigin}/`);
    const { inspectUrlWithSearchConsole } = await import("@/features/seo/google-live/url-inspection");
    return inspectUrlWithSearchConsole(url);
  });
  operations.registerHandler("linking.apply", async (record) => {
    const selected = (record.payload.links as Array<{ toPublicId: string }> | undefined) ?? [];
    return { applied: selected.length };
  });
  operations.registerHandler("ai.apply_metadata", async (record) => {
    return { applied: true, fields: record.payload.fields ?? ["title", "description"] };
  });
  operations.registerHandler("content.create_draft", async (record) => {
    return {
      draftId: `draft-${Date.now()}`,
      topic: record.payload.topic ?? "Untitled",
      status: "draft",
    };
  });
  operations.registerHandler("google.sync_business_profile", async () => {
    const { syncBusinessProfileLocations } = await import(
      "@/features/seo/google-live/business-profile"
    );
    connectors.beginSync("business_profile");
    try {
      const result = await syncBusinessProfileLocations();
      connectors.completeSync("business_profile", { synced: result.synced });
      return result;
    } catch (error) {
      connectors.fail("business_profile", error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
  operations.registerHandler("google.run_pagespeed", async (record) => {
    const { runPageSpeedInsights } = await import("@/features/seo/pagespeed/client");
    const url = String(record.payload.url ?? siteOrigin);
    const strategy =
      record.payload.strategy === "desktop" || record.payload.strategy === "mobile"
        ? record.payload.strategy
        : "mobile";
    connectors.beginSync("pagespeed");
    try {
      const result = await runPageSpeedInsights({ url, strategy });
      connectors.completeSync("pagespeed", { runs: 1 });
      return result;
    } catch (error) {
      connectors.fail("pagespeed", error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
  operations.registerHandler("sitemap.rebuild", async () => {
    const { rebuildSitemapWithDiff } = await import("./operations/sitemap-ops");
    return rebuildSitemapWithDiff(siteOrigin);
  });
  operations.registerHandler("impact.simulate", async (record) =>
    simulateSearchImpact({
      currentTitle: String(record.payload.currentTitle ?? ""),
      proposedTitle: String(record.payload.proposedTitle ?? ""),
      currentDescription: String(record.payload.currentDescription ?? ""),
      proposedDescription: String(record.payload.proposedDescription ?? ""),
      schemaValid: record.payload.schemaValid !== false,
      improvesKnowledgeSignals: Boolean(record.payload.improvesKnowledgeSignals),
      addsInternalLinks: Boolean(record.payload.addsInternalLinks),
    }),
  );

  const api = {
    store,
    query,
    traversal,
    policy,
    normalization,
    schema,
    schemaVersions,
    issues,
    indexation,
    connectors,
    auditLog,
    revisions,
    operations,
    queue,
    automation,
    siteOrigin,

    async ingestSourceRecords(records: SourceRecord[], actor?: string | null) {
      const results = await normalization.normalizeMany(records);
      auditLog.emit(
        "entity_upsert",
        {
          count: records.length,
          created: results.filter((r) => r.created).length,
          issueCount: results.reduce((sum, r) => sum + r.issues.length, 0),
        },
        actor,
      );
      return results;
    },

    async ingestCompanyProfile(company: CompanySourceInput | null | undefined, actor?: string | null) {
      const results = await api.ingestSourceRecords(
        companyInfoToSourceRecords(company, { editor: actor }),
        actor,
      );
      await automation.fire("company.updated", { targetLabel: company?.name }, actor);
      return results;
    },

    async buildSchema(input: {
      pageUrl: string;
      pageTitle: string;
      pageDescription?: string;
      locale?: string;
    }) {
      const result = await schema.buildFromGraph(input);
      auditLog.emit("schema_build", {
        pageUrl: input.pageUrl,
        issueCount: result.issues.length,
        version: result.version,
        shadowMode: result.shadowMode,
      });
      return result;
    },

    runPublishTimeAnalysis(pages: StaticAnalysisInput[]) {
      const found = pages.flatMap((page) => runStaticAnalysis(page));
      issues.upsertMany(found);
      auditLog.emit("crawler_run", { system: "static_analysis", count: found.length });
      return found;
    },

    runNightlyCrawl(probes: CrawlProbeResult[]) {
      const found = runContinuousCrawlAnalysis(probes);
      issues.upsertMany(found);
      auditLog.emit("crawler_run", { system: "continuous_crawl", count: found.length });
      return found;
    },

    async recommendLinks(publicId: Parameters<typeof recommendInternalLinks>[2]) {
      return recommendInternalLinks(query, store, publicId);
    },

    async metricsFor(publicId: Parameters<typeof computeGraphMetrics>[1]) {
      return computeGraphMetrics(store, publicId);
    },

    async contentIntelligence() {
      const entities = await store.entities.list();
      return {
        clusters: await buildTopicClusters(store),
        gaps: await detectContentGaps(store),
        cannibalization: detectCannibalization(entities),
      };
    },

    auditPage(page: StaticAnalysisInput, ai?: AiAuditSignals) {
      const result = scorePageAudit({ page, ai });
      issues.upsertMany(result.issues);
      auditLog.emit("ai_suggestion", {
        url: page.url,
        score: result.total,
        suggestions: result.suggestions,
      });
      return result;
    },

    authority(signals: AuthoritySignals, nap: NapSnapshot[] = []) {
      return scoreAuthority(signals, nap);
    },

    correlatePerformance(cwv: CwvSample[], outcomes: SeoOutcomeSample[]) {
      return correlatePerformanceToOutcomes(cwv, outcomes);
    },

    dashboard(input?: {
      audits?: ReturnType<typeof scorePageAudit>[];
      authority?: ReturnType<typeof scoreAuthority> | null;
      performance?: ReturnType<typeof correlatePerformanceToOutcomes>;
    }) {
      return buildAnalyticsDashboard({
        issues: issues.list(),
        connectors: connectors.listHealth(),
        audits: input?.audits,
        authority: input?.authority,
        performance: input?.performance,
      });
    },

    enqueueOperation(request: OperationRequest) {
      const record = operations.enqueue(request);
      auditLog.emit("auto_fix", {
        operationId: record.id,
        definitionId: record.definitionId,
        status: record.status,
      });
      return record;
    },

    async commandCenter() {
      return buildCommandCenterAsync({ platform: api, operations });
    },

    actionCenter() {
      return buildActionCenterVm(operations);
    },

    async knowledgeReadiness() {
      const orgs = await query.findByType("Organization");
      return buildKnowledgeReadinessChecklist(orgs[0] ?? null);
    },

    inspectUrl(url: string) {
      return buildUrlInspector(url);
    },

    serpPreview(input: { title: string; description: string; url: string; siteName?: string }) {
      return buildSerpPreview(input);
    },

    simulateImpact: simulateSearchImpact,

    createRevision: revisions.create,
    rollback(revisionId: string, actor?: string | null) {
      const result = revisions.rollback(revisionId);
      if (result) {
        auditLog.emit(
          "rollback",
          { revisionId, targetId: result.revision.targetId },
          actor,
        );
      }
      return result;
    },
  };

  return api;
}

export type SearchIntelligencePlatform = ReturnType<typeof createSearchIntelligencePlatform>;

let singleton: SearchIntelligencePlatform | null = null;

export function getSearchIntelligencePlatform(options?: SearchIntelligencePlatformOptions) {
  if (!singleton) {
    singleton = createSearchIntelligencePlatform(options);
  }
  return singleton;
}

export function resetSearchIntelligencePlatformForTests() {
  singleton = null;
}
