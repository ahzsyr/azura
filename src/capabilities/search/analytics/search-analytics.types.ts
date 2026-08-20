import type { SearchEntityType } from "@prisma/client";

export type SearchAnalyticsDailyBucket = {
  searches: number;
  zeroResults: number;
  clicks: number;
  conversions: number;
  filterUses: number;
};

export type SearchAnalyticsFile = {
  version: 1;
  updatedAt: string;
  queries: Record<
    string,
    { count: number; zeroCount: number; clicks: number; lastAt: string }
  >;
  zeroQueries: Record<string, { count: number; lastAt: string }>;
  content: Record<
    string,
    {
      entityType: SearchEntityType;
      entityId: string;
      title: string;
      urlPath: string;
      clicks: number;
      conversions: number;
      lastAt: string;
    }
  >;
  filters: Record<string, { count: number; lastAt: string }>;
  daily: Record<string, SearchAnalyticsDailyBucket>;
  totals: SearchAnalyticsDailyBucket;
};

export type SearchAnalyticsRankedTerm = {
  term: string;
  count: number;
  lastAt?: string;
};

export type SearchAnalyticsPopularContent = {
  key: string;
  title: string;
  urlPath: string;
  entityType: SearchEntityType;
  clicks: number;
  conversions: number;
};

export type SearchAnalyticsFilterStat = {
  filterKey: string;
  label: string;
  count: number;
};

export type SearchAnalyticsDailyPoint = {
  date: string;
  searches: number;
  zeroResults: number;
  clicks: number;
  conversions: number;
};

export type SearchAnalyticsReport = {
  locale: string;
  days: number;
  generatedAt: string;
  totals: SearchAnalyticsDailyBucket & {
    clickThroughRate: number;
    conversionRate: number;
    zeroResultRate: number;
  };
  topSearchTerms: SearchAnalyticsRankedTerm[];
  noResultSearches: SearchAnalyticsRankedTerm[];
  popularContent: SearchAnalyticsPopularContent[];
  topFilters: SearchAnalyticsFilterStat[];
  dailySeries: SearchAnalyticsDailyPoint[];
};

export type ClientSearchAnalyticsPayload =
  | {
      type: "click";
      locale: string;
      q: string;
      entityType: SearchEntityType;
      entityId: string;
      title?: string;
      urlPath: string;
      position?: number;
    }
  | {
      type: "conversion";
      locale: string;
      q: string;
      entityType: SearchEntityType;
      entityId: string;
      title?: string;
      urlPath: string;
    }
  | {
      type: "filter";
      locale: string;
      filterId: string;
      values: string[];
    };
