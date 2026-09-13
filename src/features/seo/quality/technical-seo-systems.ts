/**
 * Compatibility wrappers that split technical SEO into:
 * - publish-time static analysis
 * - nightly continuous crawl
 * while preserving the shared issue model.
 */
import {
  createTechnicalSeoIssueStore,
  runContinuousCrawlAnalysis,
  runStaticAnalysis,
  type CrawlProbeResult,
  type StaticAnalysisInput,
} from "@/features/search-intelligence/technical-seo";
import type { SearchIntelligenceIssue } from "@/features/search-intelligence/types";

const sharedStore = createTechnicalSeoIssueStore();

export function analyzeAtPublishTime(pages: StaticAnalysisInput[]): SearchIntelligenceIssue[] {
  const issues = pages.flatMap((page) => runStaticAnalysis(page));
  sharedStore.upsertMany(issues);
  return issues;
}

export function analyzeNightlyCrawl(probes: CrawlProbeResult[]): SearchIntelligenceIssue[] {
  const issues = runContinuousCrawlAnalysis(probes);
  sharedStore.upsertMany(issues);
  return issues;
}

export function listTechnicalSeoIssues(): SearchIntelligenceIssue[] {
  return sharedStore.list();
}

export function resolveTechnicalSeoIssue(id: string): boolean {
  return sharedStore.resolve(id);
}

export { sharedStore as technicalSeoIssueStore };
