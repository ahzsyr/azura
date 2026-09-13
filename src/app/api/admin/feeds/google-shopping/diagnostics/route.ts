import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import {
  evaluateGoogleShoppingCatalog,
  getGoogleShoppingFeedHealth,
} from "@/features/feeds/google-shopping-feed.service";
import { formatGoogleShoppingFeedXml } from "@/features/feeds/google-shopping-feed.mapper";
import {
  matchMvpCampaignProductSet,
  parseMvpCampaignProductSet,
} from "@/features/feeds/google-shopping-mvp-set";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin diagnostics for the Google Shopping feed.
 * Aggregates the shared eligibility resolver — does not call Google APIs.
 */
export async function GET() {
  await requireAdmin();

  const evaluation = await evaluateGoogleShoppingCatalog();
  const health = await getGoogleShoppingFeedHealth(evaluation.siteOrigin);

  const sampleItems = evaluation.items.slice(0, 5);
  const sampleXml = formatGoogleShoppingFeedXml(sampleItems, {
    siteOrigin: evaluation.siteOrigin,
  });

  const warningProducts = evaluation.entries.filter((e) => e.result.status === "warning").length;
  const variantExtra = Math.max(
    0,
    evaluation.diagnostics.summary.feedItems -
      (evaluation.diagnostics.summary.ready + evaluation.diagnostics.summary.warnings),
  );

  let mvpTokens: string[] = [];
  try {
    const platform = await getGooglePlatformState();
    mvpTokens = parseMvpCampaignProductSet(
      platform.services.merchant_center?.configuration?.mvpCampaignProductSet,
    );
  } catch {
    mvpTokens = [];
  }

  const mvpMatches = matchMvpCampaignProductSet(mvpTokens, evaluation.entries);
  const mvpInFeed = mvpMatches.filter((m) => m.inFeed).length;
  const mvpExcluded = mvpMatches.filter((m) => m.status === "excluded").length;
  const mvpMissing = mvpMatches.filter((m) => !m.matched).length;

  return NextResponse.json({
    feedVersion: evaluation.diagnostics.feedVersion,
    summary: evaluation.diagnostics.summary,
    issues: evaluation.diagnostics.issues,
    preview: {
      published: evaluation.diagnostics.summary.published,
      eligible:
        evaluation.diagnostics.summary.ready + evaluation.diagnostics.summary.warnings,
      excluded: evaluation.diagnostics.summary.excluded,
      warnings: warningProducts,
      feedItems: evaluation.diagnostics.summary.feedItems,
      estimatedVariantExtraRows: variantExtra,
      sampleItems,
      sampleXmlSnippet: sampleXml.slice(0, 4000),
    },
    mvpCampaign: {
      tokens: mvpTokens,
      matches: mvpMatches,
      summary: {
        defined: mvpTokens.length,
        inFeed: mvpInFeed,
        excluded: mvpExcluded,
        missingFromCatalog: mvpMissing,
      },
      note: "AZURA can only confirm MVP products are in the feed. Google Merchant Center Approval is the launch gate.",
    },
    feedHealth: {
      ...health,
      note: "Feed health is verified by AZURA. Product approval is verified by Google Merchant Center. Feed Health green does not mean Shopping approved. g:link host must match GMC Business info verified store URL (apex https://brt-me.com — not www; www redirects to apex).",
    },
    market: {
      country: evaluation.market.country,
      language: evaluation.market.language,
      defaultCurrency: evaluation.market.defaultCurrency,
      destination: evaluation.market.destination,
      validationMode: evaluation.market.validationMode,
      feedUrl: evaluation.market.feedUrl,
      storeOrigin: evaluation.market.siteOrigin,
      priceAdjustmentPercent: evaluation.market.priceAdjustmentPercent ?? 0,
      priceAdjustmentDirection: evaluation.market.priceAdjustmentDirection ?? "increase",
      availabilityOverride: evaluation.market.availabilityOverride ?? "",
      availabilityDate: evaluation.market.availabilityDate ?? "",
    },
  });
}
