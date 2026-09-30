import "server-only";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";
import {
  fuzzyGoogleNameScore,
  normalizeGoogleCampaignName,
  type GoogleMatchKind,
} from "./match-google-classify";

export type { GoogleMatchKind };
export { classifyGoogleMatch } from "./match-google-classify";

export type GoogleCampaignMatch = {
  externalCampaignId: string;
  externalCampaignName: string;
  internalCampaignId: string | null;
  kind: GoogleMatchKind;
  confidence: number;
  autoLinked: boolean;
};

/**
 * After inventory sync: suggest / auto-link Google campaigns to internal campaigns.
 * Auto-link only for exact name or internalId/utm with exactly one candidate.
 */
export async function applyGoogleCampaignMatches(options?: {
  adAccountId?: string;
}): Promise<GoogleCampaignMatch[]> {
  const externals = await prisma.marketingExternalCampaign.findMany({
    where: {
      providerId: GOOGLE_ADS_PROVIDER_ID,
      ...(options?.adAccountId ? { adAccountId: options.adAccountId } : {}),
    },
  });
  const internals = await prisma.marketingCampaign.findMany({
    select: { id: true, name: true, internalId: true },
  });
  const trackingUrls = await prisma.marketingTrackingUrl.findMany({
    select: { campaignId: true, utmCampaign: true, fullUrl: true, baseUrl: true },
  });

  const results: GoogleCampaignMatch[] = [];

  for (const ext of externals) {
    if (ext.providerBindingId) {
      const binding = await prisma.marketingCampaignProviderBinding.findUnique({
        where: { id: ext.providerBindingId },
      });
      results.push({
        externalCampaignId: ext.externalId,
        externalCampaignName: ext.name,
        internalCampaignId: binding?.campaignId ?? null,
        kind: "existing",
        confidence: 1,
        autoLinked: false,
      });
      continue;
    }

    const exactName = internals.filter(
      (c) => normalizeGoogleCampaignName(c.name) === normalizeGoogleCampaignName(ext.name),
    );
    if (exactName.length === 1) {
      const target = exactName[0]!;
      if (ext.adAccountId) {
        const { campaignService } = await import("@/modules/marketing/campaigns/service");
        await campaignService
          .linkExternalCampaign({
            campaignId: target.id,
            adAccountId: ext.adAccountId,
            externalCampaignId: ext.externalId,
            providerId: GOOGLE_ADS_PROVIDER_ID,
            externalCampaignName: ext.name,
            skipSync: true,
          })
          .catch(() => undefined);
      }
      results.push({
        externalCampaignId: ext.externalId,
        externalCampaignName: ext.name,
        internalCampaignId: target.id,
        kind: "exact_name",
        confidence: 1,
        autoLinked: Boolean(ext.adAccountId),
      });
      continue;
    }
    if (exactName.length > 1) {
      results.push({
        externalCampaignId: ext.externalId,
        externalCampaignName: ext.name,
        internalCampaignId: null,
        kind: "ambiguous",
        confidence: 0.9,
        autoLinked: false,
      });
      continue;
    }

    const byInternalId = internals.filter(
      (c) => normalizeGoogleCampaignName(ext.name) === normalizeGoogleCampaignName(c.internalId),
    );
    const byUtm = trackingUrls.filter(
      (t) =>
        t.utmCampaign &&
        (normalizeGoogleCampaignName(ext.name) === normalizeGoogleCampaignName(t.utmCampaign) ||
          `${ext.name}`.includes(`campaign=${t.utmCampaign}`) ||
          (t.fullUrl ?? "").includes(`campaign=${t.utmCampaign}`)),
    );

    if (byInternalId.length === 1 && byUtm.length === 0) {
      const target = byInternalId[0]!;
      if (ext.adAccountId) {
        const { campaignService } = await import("@/modules/marketing/campaigns/service");
        await campaignService
          .linkExternalCampaign({
            campaignId: target.id,
            adAccountId: ext.adAccountId,
            externalCampaignId: ext.externalId,
            providerId: GOOGLE_ADS_PROVIDER_ID,
            skipSync: true,
          })
          .catch(() => undefined);
      }
      results.push({
        externalCampaignId: ext.externalId,
        externalCampaignName: ext.name,
        internalCampaignId: target.id,
        kind: "internal_id",
        confidence: 0.95,
        autoLinked: Boolean(ext.adAccountId),
      });
      continue;
    }

    // Tracking template contains campaign={internalId}
    const templateHits = internals.filter((c) => {
      const needle = `campaign=${c.internalId}`;
      return (
        normalizeGoogleCampaignName(ext.name).includes(normalizeGoogleCampaignName(c.internalId)) ||
        trackingUrls.some(
          (t) =>
            t.campaignId === c.id &&
            ((t.fullUrl ?? "").includes(needle) || (t.baseUrl ?? "").includes(needle)),
        )
      );
    });
    if (templateHits.length === 1) {
      results.push({
        externalCampaignId: ext.externalId,
        externalCampaignName: ext.name,
        internalCampaignId: templateHits[0]!.id,
        kind: "tracking_template",
        confidence: 0.9,
        autoLinked: false,
      });
      continue;
    }

    let best: { id: string; score: number } | null = null;
    for (const c of internals) {
      const score = fuzzyGoogleNameScore(ext.name, c.name);
      if (score >= 0.75 && (!best || score > best.score)) {
        best = { id: c.id, score };
      }
    }
    if (best) {
      results.push({
        externalCampaignId: ext.externalId,
        externalCampaignName: ext.name,
        internalCampaignId: best.id,
        kind: "fuzzy",
        confidence: best.score,
        autoLinked: false,
      });
    }
  }

  return results;
}
