import "server-only";

import { isBuildWithoutDb } from "@/lib/build-db";
import { getDefaultUrlPrefix } from "@/i18n/locale-registry.server";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { fromDbRow } from "@/features/products/db/product-db-mapper";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import { productRepository } from "@/repositories/product.repository";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";
import { resolveGoogleShoppingEligibility } from "./google-shopping-eligibility";
import { aggregateGoogleShoppingDiagnostics } from "./google-shopping-diagnostics";
import {
  apexOriginSuggestion,
  productLinksMatchStoreOrigin,
  resolveGoogleShoppingMarket,
  storeOriginIsFinalLandingHost,
  storeOriginUsesWwwPrefix,
} from "./google-shopping-market";
import { applyGoogleShoppingFeedOverrides } from "./google-shopping-feed.overrides";
import { formatGoogleShoppingFeedXml } from "./google-shopping-feed.mapper";
import { GOOGLE_SHOPPING_FEED_VERSION } from "./google-shopping-feed.types";
import type {
  GoogleShoppingDiagnosticsReport,
  GoogleShoppingEligibilityResult,
  GoogleShoppingFeedItem,
  GoogleShoppingFeedProductInput,
  GoogleShoppingMarket,
} from "./google-shopping-feed.types";

export {
  GOOGLE_SHOPPING_FEED_PATH,
  GOOGLE_SHOPPING_FEED_VERSION,
} from "./google-shopping-feed.types";
export { applyGoogleShoppingFeedOverrides } from "./google-shopping-feed.overrides";
export { formatGoogleShoppingFeedXml } from "./google-shopping-feed.mapper";
export {
  formatGoogleShoppingPrice,
  isExcludedFromGoogleShopping,
  mapGoogleShoppingAvailability,
  mapGoogleShoppingCondition,
  resolveGoogleShoppingDescription,
  resolveGoogleShoppingEligibility,
  resolveGoogleShoppingTitle,
} from "./google-shopping-eligibility";
export type {
  GoogleShoppingAvailability,
  GoogleShoppingCondition,
  GoogleShoppingEligibilityResult,
  GoogleShoppingFeedItem,
  GoogleShoppingFeedProductInput,
  GoogleShoppingMarket,
  GoogleShoppingPriceAdjustmentDirection,
} from "./google-shopping-feed.types";

export type GoogleShoppingCatalogEvaluation = {
  market: GoogleShoppingMarket;
  entries: Array<{
    product: GoogleShoppingFeedProductInput;
    result: GoogleShoppingEligibilityResult;
  }>;
  items: GoogleShoppingFeedItem[];
  diagnostics: GoogleShoppingDiagnosticsReport;
  siteOrigin: string;
  localePrefix: string;
  generatedAt: string;
};

async function loadGoogleShoppingMarket(
  siteOrigin: string,
  localePrefix: string,
): Promise<GoogleShoppingMarket> {
  let config: Record<string, string | number | boolean | null | undefined> | undefined;
  try {
    const platform = await getGooglePlatformState();
    config = platform.services.merchant_center?.configuration;
  } catch {
    config = undefined;
  }
  return resolveGoogleShoppingMarket(config, { siteOrigin, localePrefix });
}

/**
 * Evaluate the full published catalog through the single eligibility resolver.
 */
export async function evaluateGoogleShoppingCatalog(
  siteOrigin?: string,
): Promise<GoogleShoppingCatalogEvaluation> {
  const origin = (siteOrigin ?? (await resolveSiteOrigin("sitemap"))).replace(/\/$/, "");
  const localePrefix = await getDefaultUrlPrefix();
  const market = await loadGoogleShoppingMarket(origin, localePrefix);
  const generatedAt = new Date().toISOString();

  if (isBuildWithoutDb()) {
    return {
      market,
      entries: [],
      items: [],
      diagnostics: {
        feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
        summary: { published: 0, ready: 0, warnings: 0, excluded: 0, feedItems: 0 },
        issues: {},
      },
      siteOrigin: origin,
      localePrefix,
      generatedAt,
    };
  }

  try {
    const rows = await productRepository.findMany({ status: "published" });
    const entries: GoogleShoppingCatalogEvaluation["entries"] = [];
    const items: GoogleShoppingFeedItem[] = [];

    for (const row of rows) {
      if (!isProductPublishedForSearch(row.status)) continue;
      const product = fromDbRow(row);
      const input: GoogleShoppingFeedProductInput = {
        ...product,
        slug: row.canonicalSlug,
        publishStatus: row.status,
        excludeFromGoogleShopping: product.excludeFromGoogleShopping,
      };
      const result = resolveGoogleShoppingEligibility(input, market);
      entries.push({ product: input, result });
      if (result.status !== "excluded") {
        items.push(...result.items);
      }
    }

    items.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: "base" }));

    const feedItems = applyGoogleShoppingFeedOverrides(items, market);

    const diagnostics = aggregateGoogleShoppingDiagnostics(entries, {
      strict: market.validationMode === "strict",
    });

    return {
      market,
      entries,
      items: feedItems,
      diagnostics,
      siteOrigin: origin,
      localePrefix,
      generatedAt,
    };
  } catch {
    return {
      market,
      entries: [],
      items: [],
      diagnostics: {
        feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
        summary: { published: 0, ready: 0, warnings: 0, excluded: 0, feedItems: 0 },
        issues: {},
      },
      siteOrigin: origin,
      localePrefix,
      generatedAt,
    };
  }
}

/**
 * Load published catalog products for the Google Shopping feed (default locale URLs).
 * Inclusion rule: resolver status !== "excluded" only.
 */
export async function generateGoogleShoppingFeedItems(
  siteOrigin?: string,
): Promise<{
  items: GoogleShoppingFeedItem[];
  siteOrigin: string;
  localePrefix: string;
  market: GoogleShoppingMarket;
  diagnostics: GoogleShoppingDiagnosticsReport;
  generatedAt: string;
}> {
  const evaluation = await evaluateGoogleShoppingCatalog(siteOrigin);
  return {
    items: evaluation.items,
    siteOrigin: evaluation.siteOrigin,
    localePrefix: evaluation.localePrefix,
    market: evaluation.market,
    diagnostics: evaluation.diagnostics,
    generatedAt: evaluation.generatedAt,
  };
}

export async function generateGoogleShoppingFeedXml(siteOrigin?: string): Promise<string> {
  const { items, siteOrigin: origin } = await generateGoogleShoppingFeedItems(siteOrigin);
  return formatGoogleShoppingFeedXml(items, { siteOrigin: origin });
}

export async function getGoogleShoppingFeedHealth(siteOrigin?: string) {
  const evaluation = await evaluateGoogleShoppingCatalog(siteOrigin);
  const xml = formatGoogleShoppingFeedXml(evaluation.items, {
    siteOrigin: evaluation.siteOrigin,
  });
  const httpsOk = evaluation.items.every((item) => /^https:\/\//i.test(item.imageLink));
  const currencyOk = evaluation.items.every((item) =>
    item.price.toUpperCase().endsWith(` ${evaluation.market.defaultCurrency.toUpperCase()}`),
  );
  const shippingOk = evaluation.items.every((item) => Boolean(item.shipping));
  const storeDomainOk = productLinksMatchStoreOrigin(
    evaluation.items,
    evaluation.market.siteOrigin,
  );
  const storeOriginFinalOk = storeOriginIsFinalLandingHost(evaluation.market.siteOrigin);
  const wwwApexSuggestion = storeOriginUsesWwwPrefix(evaluation.market.siteOrigin)
    ? apexOriginSuggestion(evaluation.market.siteOrigin)
    : null;

  return {
    feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
    feedUrl: evaluation.market.feedUrl,
    storeOrigin: evaluation.market.siteOrigin,
    itemCount: evaluation.items.length,
    xmlValid: xml.includes("<rss") && xml.includes("</rss>"),
    httpsUrls: httpsOk,
    storeDomainOk,
    storeOriginFinalOk,
    wwwApexSuggestion,
    marketCurrencyOk: currencyOk || evaluation.items.length === 0,
    shippingPresent: shippingOk || evaluation.items.length === 0,
    lastGeneratedAt: evaluation.generatedAt,
    summary: evaluation.diagnostics.summary,
    market: {
      country: evaluation.market.country,
      language: evaluation.market.language,
      defaultCurrency: evaluation.market.defaultCurrency,
      destination: evaluation.market.destination,
      validationMode: evaluation.market.validationMode,
    },
  };
}
