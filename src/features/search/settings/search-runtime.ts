import "server-only";

import { readSiteSettings } from "@/features/catalog/site-settings.service";
import {
  configureSearchAnalytics,
  setSearchAnalyticsRecording,
} from "@/features/search-framework/analytics/search-analytics";
import { searchSettingsManager } from "@/features/search-framework/settings/search-settings-manager";
import {
  resolveSearchRankingConfig,
  setSearchRankingConfig,
} from "@/features/search-framework/ranking/search-ranking-config";
import {
  resolveSearchSmartConfig,
  setSearchSmartConfig,
} from "@/features/search/settings/resolve-search-smart-config";
import {
  resolveSearchPerformanceConfig,
  setSearchPerformanceConfig,
} from "@/features/search-framework/performance/search-performance-config";
import { discoverSearchFilterFields } from "@/features/search/settings/discover-search-filters";
import { resolveAndCacheSearchFilters } from "@/features/search-framework/filter/search-filter-config";
import {
  adminSearchSettingsToSiteJson,
  resolveAdminSearchSettings,
} from "@/features/search/settings/resolve-admin-search-settings";
import type { AdminSearchSettings } from "@/features/search/settings/admin-search-settings.schema";

const RUNTIME_CONFIG_TTL_MS = 10 * 60 * 1000;

type RuntimeConfigCacheRow = {
  admin: AdminSearchSettings;
  expires: number;
};

const runtimeConfigCache = new Map<string, RuntimeConfigCacheRow>();

function applySearchRuntimeConfig(admin: AdminSearchSettings) {
  const resolved = searchSettingsManager.resolve(adminSearchSettingsToSiteJson(admin));
  searchSettingsManager.setCache(resolved);
  setSearchRankingConfig(resolveSearchRankingConfig(admin.ranking));
  setSearchPerformanceConfig(resolveSearchPerformanceConfig(admin.performance));
  setSearchSmartConfig(
    resolveSearchSmartConfig(admin.smart, {
      fuzziness:
        admin.fuzziness === "strict" || admin.fuzziness === "balanced" || admin.fuzziness === "fuzzy"
          ? admin.fuzziness
          : undefined,
      listingFuzziness:
        typeof admin.listingFuzziness === "number" ? admin.listingFuzziness : undefined,
    }),
  );
  configureSearchAnalytics({
    enabled: admin.analytics.enabled || process.env.NODE_ENV === "development",
    logQueries: admin.analytics.logQueries,
    logZeroResults: admin.analytics.logZeroResults,
    persistEvents: admin.analytics.enabled,
    recordClicks: admin.analytics.recordClicks !== false,
    recordFilters: admin.analytics.recordFilters !== false,
    retentionDays: admin.analytics.retentionDays ?? 90,
  });
  setSearchAnalyticsRecording(admin.autocomplete.recordTrending !== false);
}

/** Load site search config into framework caches (API routes, engine). */
export async function ensureSearchRuntimeConfig(locale = "en-us") {
  const now = Date.now();
  const cached = runtimeConfigCache.get(locale);
  if (cached && cached.expires > now) {
    applySearchRuntimeConfig(cached.admin);
    return cached.admin;
  }

  const site = await readSiteSettings(locale);
  const admin = resolveAdminSearchSettings(site);
  const discoveredFilters = await discoverSearchFilterFields();
  resolveAndCacheSearchFilters(admin.filters, discoveredFilters);
  applySearchRuntimeConfig(admin);

  runtimeConfigCache.set(locale, {
    admin,
    expires: now + RUNTIME_CONFIG_TTL_MS,
  });

  return admin;
}

export function invalidateSearchRuntimeConfigCache(locale?: string) {
  if (locale) {
    runtimeConfigCache.delete(locale);
    return;
  }
  runtimeConfigCache.clear();
}
