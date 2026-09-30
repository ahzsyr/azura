import type { SearchIntelligenceIssue } from "../types";

export type StaticAnalysisInput = {
  url: string;
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  h1s?: string[];
  imageAlts?: Array<{ src: string; alt?: string | null }>;
  wordCount?: number;
  internalLinks?: string[];
  noindex?: boolean;
};

export type CrawlProbeResult = {
  url: string;
  status: number | null;
  canonical?: string | null;
  redirectChain?: string[];
  inSitemap?: boolean;
  indexedHint?: boolean;
  hasStructuredData?: boolean;
  lcpMs?: number | null;
};

function issue(
  partial: Omit<SearchIntelligenceIssue, "detectedAt" | "system"> & { system?: SearchIntelligenceIssue["system"] },
): SearchIntelligenceIssue {
  return {
    ...partial,
    system: partial.system ?? "static_analysis",
    detectedAt: new Date().toISOString(),
  };
}

/** Publish-time deterministic checks. */
export function runStaticAnalysis(input: StaticAnalysisInput): SearchIntelligenceIssue[] {
  const issues: SearchIntelligenceIssue[] = [];
  const url = input.url;

  if (!input.title?.trim()) {
    issues.push(
      issue({
        id: `static-missing-title-${url}`,
        category: "technical",
        title: "Missing title",
        severity: "critical",
        message: `${url} is missing a title tag.`,
        url,
        autoFixEligible: true,
      }),
    );
  }

  if (!input.description?.trim()) {
    issues.push(
      issue({
        id: `static-missing-description-${url}`,
        category: "technical",
        title: "Missing description",
        severity: "warn",
        message: `${url} is missing a meta description.`,
        url,
        autoFixEligible: true,
      }),
    );
  } else if (input.description.trim().length < 50) {
    issues.push(
      issue({
        id: `static-short-description-${url}`,
        category: "content",
        title: "Description too short",
        severity: "info",
        message: `${url} description is under 50 characters.`,
        url,
        autoFixEligible: true,
      }),
    );
  }

  if (!input.canonical?.trim()) {
    issues.push(
      issue({
        id: `static-missing-canonical-${url}`,
        category: "technical",
        title: "Missing canonical",
        severity: "warn",
        message: `${url} is missing a canonical link.`,
        url,
        autoFixEligible: true,
      }),
    );
  }

  const h1s = input.h1s ?? [];
  if (h1s.length === 0) {
    issues.push(
      issue({
        id: `static-missing-h1-${url}`,
        category: "technical",
        title: "Missing H1",
        severity: "warn",
        message: `${url} has no H1.`,
        url,
      }),
    );
  } else if (h1s.length > 1) {
    issues.push(
      issue({
        id: `static-duplicate-h1-${url}`,
        category: "technical",
        title: "Duplicate H1",
        severity: "warn",
        message: `${url} has ${h1s.length} H1 elements.`,
        url,
      }),
    );
  }

  for (const image of input.imageAlts ?? []) {
    if (!image.alt?.trim()) {
      issues.push(
        issue({
          id: `static-missing-alt-${url}-${image.src}`,
          category: "technical",
          title: "Missing image alt",
          severity: "info",
          message: `Image ${image.src} on ${url} is missing alt text.`,
          url,
          autoFixEligible: true,
        }),
      );
    }
  }

  if ((input.wordCount ?? 0) > 0 && (input.wordCount ?? 0) < 80) {
    issues.push(
      issue({
        id: `static-thin-content-${url}`,
        category: "content",
        title: "Thin content",
        severity: "warn",
        message: `${url} has thin content (${input.wordCount} words).`,
        url,
      }),
    );
  }

  if ((input.internalLinks?.length ?? 0) === 0) {
    issues.push(
      issue({
        id: `static-no-internal-links-${url}`,
        category: "linking",
        title: "No internal links",
        severity: "info",
        message: `${url} has no outgoing internal links.`,
        url,
      }),
    );
  }

  if (input.noindex) {
    issues.push(
      issue({
        id: `static-noindex-${url}`,
        category: "indexation",
        title: "Noindex page",
        severity: "info",
        message: `${url} is marked noindex.`,
        url,
      }),
    );
  }

  return issues;
}

/** Nightly continuous crawl checks. */
export function runContinuousCrawlAnalysis(probes: CrawlProbeResult[]): SearchIntelligenceIssue[] {
  const issues: SearchIntelligenceIssue[] = [];

  for (const probe of probes) {
    const url = probe.url;
    if (probe.status == null || probe.status >= 500 || probe.status === 404 || probe.status === 410) {
      issues.push(
        issue({
          id: `crawl-status-${url}`,
          category: "technical",
          title: "Crawl failure detected",
          severity: probe.status == null ? "warn" : "critical",
          message: `${url} returned ${probe.status ?? "no response"} during continuous crawl.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }

    if ((probe.redirectChain?.length ?? 0) > 2) {
      issues.push(
        issue({
          id: `crawl-redirect-chain-${url}`,
          category: "technical",
          title: "Redirect chain",
          severity: "warn",
          message: `${url} has a redirect chain of length ${probe.redirectChain?.length}.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }

    if (probe.redirectChain && new Set(probe.redirectChain).size < probe.redirectChain.length) {
      issues.push(
        issue({
          id: `crawl-redirect-loop-${url}`,
          category: "technical",
          title: "Redirect loop",
          severity: "critical",
          message: `${url} appears to participate in a redirect loop.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }

    if (probe.inSitemap === false) {
      issues.push(
        issue({
          id: `crawl-sitemap-drift-${url}`,
          category: "technical",
          title: "Sitemap drift",
          severity: "warn",
          message: `${url} was crawled but is missing from the sitemap.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }

    if (probe.canonical && probe.canonical !== url && probe.inSitemap) {
      issues.push(
        issue({
          id: `crawl-canonical-conflict-${url}`,
          category: "technical",
          title: "Canonical conflict",
          severity: "warn",
          message: `${url} canonical points to ${probe.canonical}.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }

    if (probe.hasStructuredData === false) {
      issues.push(
        issue({
          id: `crawl-missing-schema-${url}`,
          category: "schema",
          title: "Missing structured data",
          severity: "info",
          message: `${url} has no detectable structured data.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }

    if (typeof probe.lcpMs === "number" && probe.lcpMs > 2500) {
      issues.push(
        issue({
          id: `crawl-slow-lcp-${url}`,
          category: "performance",
          title: "Slow LCP",
          severity: probe.lcpMs > 4000 ? "critical" : "warn",
          message: `${url} LCP is ${probe.lcpMs}ms.`,
          url,
          system: "continuous_crawl",
        }),
      );
    }
  }

  return issues;
}

export type TechnicalSeoIssueStore = {
  list(): SearchIntelligenceIssue[];
  upsertMany(issues: SearchIntelligenceIssue[]): void;
  resolve(id: string): boolean;
  clear(): void;
};

export function createTechnicalSeoIssueStore(): TechnicalSeoIssueStore {
  const byId = new Map<string, SearchIntelligenceIssue>();
  return {
    list() {
      return [...byId.values()];
    },
    upsertMany(issues) {
      for (const item of issues) byId.set(item.id, item);
    },
    resolve(id) {
      const existing = byId.get(id);
      if (!existing) return false;
      byId.set(id, { ...existing, resolvedAt: new Date().toISOString() });
      return true;
    },
    clear() {
      byId.clear();
    },
  };
}
