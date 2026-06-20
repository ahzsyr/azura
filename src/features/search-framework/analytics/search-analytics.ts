import type { SearchAnalyticsEvent } from "@/features/search-framework/types";

export type SearchAnalyticsSink = (event: SearchAnalyticsEvent) => void;

export class SearchAnalytics {
  private sinks: SearchAnalyticsSink[] = [];

  addSink(sink: SearchAnalyticsSink): void {
    this.sinks.push(sink);
  }

  track(event: SearchAnalyticsEvent): void {
    for (const sink of this.sinks) {
      try {
        sink(event);
      } catch {
        /* non-blocking */
      }
    }
  }

  trackQuery(params: {
    q: string;
    locale: string;
    resultCount: number;
    durationMs: number;
  }): void {
    this.track({
      type: "query",
      q: params.q,
      locale: params.locale,
      resultCount: params.resultCount,
      durationMs: params.durationMs,
    });
    if (params.resultCount === 0 && params.q.length >= 2) {
      this.track({ type: "zero_results", q: params.q, locale: params.locale });
    }
  }

  trackSuggest(params: { q: string; locale: string; count: number }): void {
    this.track({
      type: "suggest",
      q: params.q,
      locale: params.locale,
      count: params.count,
    });
  }

  trackCatalogListingQuery(params: {
    q: string;
    locale: string;
    resultCount: number;
    durationMs: number;
    activeFilterCount: number;
    listingMode: "product" | "collection";
    collectionScope?: string | null;
  }): void {
    this.track({ type: "catalog_listing_query", ...params });
    if (params.resultCount === 0 && (params.q.length >= 2 || params.activeFilterCount > 0)) {
      this.track({ type: "zero_results", q: params.q, locale: params.locale });
    }
  }

  trackCatalogListingParity(params: {
    locale: string;
    q: string;
    listingMode: "product" | "collection";
    oldResultCount: number;
    newResultCount: number;
    topNOverlap: number;
    facetDivergence: number;
    exclusionReasons: string[];
  }): void {
    this.track({ type: "catalog_listing_parity", ...params });
  }

  /** User selected a search result (counts toward CTR and conversions). */
  trackResultSelection(params: {
    q: string;
    locale: string;
    entityType: import("@prisma/client").SearchEntityType;
    entityId: string;
    title?: string;
    urlPath: string;
    position?: number;
  }): void {
    this.track({ type: "conversion", ...params });
  }

  trackFilter(params: { locale: string; filterId: string; values: string[] }): void {
    this.track({ type: "filter", ...params });
  }
}

export const searchAnalytics = new SearchAnalytics();

type RuntimeAnalyticsConfig = {
  enabled: boolean;
  logQueries: boolean;
  logZeroResults: boolean;
  persistEvents: boolean;
  recordClicks: boolean;
  recordFilters: boolean;
  retentionDays: number;
};

let runtimeConfig: RuntimeAnalyticsConfig = {
  enabled: process.env.NODE_ENV === "development",
  logQueries: false,
  logZeroResults: true,
  persistEvents: false,
  recordClicks: true,
  recordFilters: true,
  retentionDays: 90,
};

export function configureSearchAnalytics(config: Partial<RuntimeAnalyticsConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...config };
}

function devSink(event: SearchAnalyticsEvent): void {
  if (!runtimeConfig.enabled) return;
  if (event.type === "query" && runtimeConfig.logQueries) {
    console.debug(
      "[search] query",
      event.q,
      event.locale,
      event.resultCount,
      `${event.durationMs}ms`
    );
  }
  if (event.type === "zero_results" && runtimeConfig.logZeroResults) {
    console.debug("[search] zero results", event.q, event.locale);
  }
  if (event.type === "catalog_listing_query" && runtimeConfig.logQueries) {
    console.debug(
      "[search] catalog listing",
      event.q,
      event.locale,
      event.listingMode,
      event.resultCount,
      `${event.durationMs}ms`,
      `filters=${event.activeFilterCount}`,
    );
  }
  if (event.type === "catalog_listing_parity" && runtimeConfig.logQueries) {
    console.debug(
      "[search] catalog parity",
      event.q,
      event.locale,
      event.listingMode,
      `old=${event.oldResultCount}`,
      `new=${event.newResultCount}`,
      `overlap=${event.topNOverlap}`,
      `facetDivergence=${event.facetDivergence}`,
      event.exclusionReasons.join(","),
    );
  }
}

searchAnalytics.addSink(devSink);

let recordTrendingQueries = true;

export function setSearchAnalyticsRecording(enabled: boolean): void {
  recordTrendingQueries = enabled;
}

function persistenceSink(event: SearchAnalyticsEvent): void {
  if (!runtimeConfig.persistEvents) return;
  const days = runtimeConfig.retentionDays;

  void import("@/features/search/analytics/search-analytics-store.service").then((store) => {
    if (event.type === "query") {
      void store.recordSearchAnalyticsQuery(
        event.locale,
        event.q,
        event.resultCount,
        days
      );
    } else if (
      (event.type === "click" || event.type === "conversion") &&
      runtimeConfig.recordClicks
    ) {
      if (event.type === "conversion") {
        void store.recordSearchAnalyticsClick({
          locale: event.locale,
          q: event.q,
          entityType: event.entityType,
          entityId: event.entityId,
          title: event.title,
          urlPath: event.urlPath,
          retentionDays: days,
        });
      }
    } else if (event.type === "filter" && runtimeConfig.recordFilters) {
      void store.recordSearchAnalyticsFilter({
        locale: event.locale,
        filterId: event.filterId,
        values: event.values,
        retentionDays: days,
      });
    }
  });
}

searchAnalytics.addSink(persistenceSink);

if (typeof process !== "undefined") {
  searchAnalytics.addSink((event) => {
    if (!recordTrendingQueries) return;
    if (event.type !== "query" || event.q.length < 2) return;
    if (runtimeConfig.persistEvents) return;
    void import("@/features/search/analytics/search-analytics-store.service").then((m) =>
      m.recordSearchQuery(event.locale, event.q)
    );
  });
}
