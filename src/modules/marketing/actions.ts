"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { sealSecret } from "@/features/seo/integrations/secret-seal.server";
import { runDueMarketingJobs, enqueueMarketingJob } from "@/modules/marketing/jobs";
import { requestPublish } from "@/modules/marketing/publishing/service";
import { upsertProviderAppConfig } from "@/modules/marketing/providers/app-config";
import { campaignService } from "@/modules/marketing/campaigns/service";
import { trackingUrlService } from "@/modules/marketing/tracking-urls/service";
import { conversionService } from "@/modules/marketing/conversions/service";
import { adSyncService } from "@/modules/marketing/ads/sync-service";
import { automationService } from "@/modules/marketing/automation/service";
import { updateRetentionPolicy, runRetentionPurge } from "@/modules/marketing/privacy/retention";
import { analyticsAggregateService } from "@/modules/marketing/analytics/aggregate";
import type { MarketingCampaignStatus, Prisma } from "@prisma/client";

export async function runMarketingJobsAction(): Promise<void> {
  await requireAdmin();
  bootstrapMarketingModule();
  await runDueMarketingJobs(20);
  revalidatePath("/admin/marketing/publishing");
  revalidatePath("/admin/marketing/integrations");
}

export async function upsertTrackingConfigAction(formData: FormData) {
  await requireAdmin();
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!providerId) throw new Error("providerId required");

  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const capiEnabled = formData.get("capiEnabled") === "on" || formData.get("capiEnabled") === "true";
  const accessTokenRaw = String(formData.get("accessToken") ?? "").trim();
  const testEventCode = String(formData.get("testEventCode") ?? "").trim() || null;
  const headSnippetRaw = String(formData.get("headSnippet") ?? "");
  const hasHeadSnippetField = formData.has("headSnippet");

  let pixelId = String(formData.get("pixelId") ?? "").trim() || null;

  const { extractMetaPixelIdFromSnippet, normalizeMetaPixelId, buildMetaPixelBaseCode } =
    await import("@/modules/marketing/tracking/meta-pixel");

  if (providerId === "meta") {
    const fromSnippet = extractMetaPixelIdFromSnippet(headSnippetRaw);
    const fromField = normalizeMetaPixelId(pixelId);
    pixelId = fromSnippet ?? fromField ?? null;
  }

  const existing = await prisma.marketingTrackingConfig.findUnique({ where: { providerId } });
  const existingMetadata =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? { ...(existing.metadata as Record<string, unknown>) }
      : {};

  let metadata: Prisma.InputJsonValue | undefined;
  if (providerId === "meta" && hasHeadSnippetField) {
    const snippet = headSnippetRaw.trim()
      ? headSnippetRaw.trim()
      : pixelId
        ? buildMetaPixelBaseCode(pixelId)
        : "";
    const nextMetadata: Record<string, string> = {
      setupMethod: "code",
    };
    for (const [key, value] of Object.entries(existingMetadata)) {
      if (typeof value === "string") nextMetadata[key] = value;
    }
    if (snippet) nextMetadata.headSnippet = snippet;
    else delete nextMetadata.headSnippet;
    metadata = nextMetadata;
  }

  await prisma.marketingTrackingConfig.upsert({
    where: { providerId },
    create: {
      providerId,
      enabled,
      pixelId,
      capiEnabled,
      accessToken: accessTokenRaw ? sealSecret(accessTokenRaw) : null,
      testEventCode,
      ...(metadata !== undefined ? { metadata } : {}),
    },
    update: {
      enabled,
      pixelId,
      capiEnabled,
      ...(accessTokenRaw ? { accessToken: sealSecret(accessTokenRaw) } : {}),
      testEventCode,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });

  if (providerId === "meta") {
    await upsertProviderAppConfig({
      providerId: "meta",
      pixelId: pixelId ?? undefined,
      capiAccessToken: accessTokenRaw || undefined,
    });
  }

  revalidatePath("/admin/marketing/tracking");
  revalidatePath("/admin/marketing/platforms");
  revalidatePath("/", "layout");
}

export async function verifyMetaPixelLiveAction(input: {
  siteUrl: string;
  expectedPixelId: string;
}): Promise<
  import("@/modules/marketing/tracking/verify-meta-pixel-live.types").MetaPixelLiveVerifyResult
> {
  await requireAdmin();
  const { verifyMetaPixelOnLiveSite } = await import(
    "@/modules/marketing/tracking/verify-meta-pixel-live.server"
  );
  return verifyMetaPixelOnLiveSite({
    siteUrl: input.siteUrl,
    expectedPixelId: input.expectedPixelId,
  });
}

export async function upsertProviderAppConfigAction(formData: FormData) {
  await requireAdmin();
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!providerId) throw new Error("providerId required");

  await upsertProviderAppConfig({
    providerId,
    clientId: String(formData.get("clientId") ?? ""),
    clientSecret: String(formData.get("clientSecret") ?? ""),
    appSecret: String(formData.get("appSecret") ?? ""),
    webhookVerifyToken: String(formData.get("webhookVerifyToken") ?? ""),
    pixelId: String(formData.get("pixelId") ?? ""),
    capiAccessToken: String(formData.get("capiAccessToken") ?? ""),
    metadata:
      providerId === "google-ads"
        ? {
            ...(String(formData.get("developerToken") ?? "").trim()
              ? { developerToken: String(formData.get("developerToken") ?? "").trim() }
              : {}),
            ...(String(formData.get("loginCustomerId") ?? "").trim()
              ? { loginCustomerId: String(formData.get("loginCustomerId") ?? "").trim() }
              : {}),
          }
        : undefined,
  });

  revalidatePath("/admin/marketing/platforms");
  revalidatePath("/admin/marketing/tracking");
}

export async function enqueueManualPublishAction(formData: FormData) {
  await requireAdmin();
  bootstrapMarketingModule();
  const providerId = String(formData.get("providerId") ?? "").trim();
  const connectionId = String(formData.get("connectionId") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!providerId || !connectionId || !accountId || !text) {
    throw new Error("providerId, connectionId, accountId and text are required");
  }

  await requestPublish({
    idempotencyKey: `manual:${providerId}:${Date.now()}`,
    providerId,
    connectionId,
    accountId,
    text,
    linkUrl: String(formData.get("linkUrl") ?? "").trim() || undefined,
  });

  revalidatePath("/admin/marketing/publishing");
}

export async function createCampaignAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Campaign name is required");
  const campaign = await campaignService.create({
    name,
    internalId: String(formData.get("internalId") ?? "").trim() || undefined,
    objective: String(formData.get("objective") ?? "") || null,
    channel: String(formData.get("channel") ?? "") || null,
    status: (String(formData.get("status") ?? "ACTIVE") as MarketingCampaignStatus) || "ACTIVE",
    budget: formData.get("budget") ? Number(formData.get("budget")) : null,
    budgetCurrency: String(formData.get("budgetCurrency") ?? "USD") || "USD",
    landingPagePath: String(formData.get("landingPagePath") ?? "").trim() || "/",
    targetAudience: String(formData.get("targetAudience") ?? "") || null,
    targetLocation: String(formData.get("targetLocation") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
    utmSource: String(formData.get("utmSource") ?? "").trim() || null,
    utmMedium: String(formData.get("utmMedium") ?? "").trim() || null,
    utmContent: String(formData.get("utmContent") ?? "").trim() || null,
    utmTerm: String(formData.get("utmTerm") ?? "").trim() || null,
  });
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath(`/admin/marketing/campaigns/${campaign.id}`);
  revalidatePath("/admin/marketing/urls");
  redirect(`/admin/marketing/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Campaign id required");
  await campaignService.update(id, {
    name: String(formData.get("name") ?? "").trim(),
    objective: String(formData.get("objective") ?? "") || null,
    channel: String(formData.get("channel") ?? "") || null,
    status: (String(formData.get("status") ?? "DRAFT") as MarketingCampaignStatus) || "DRAFT",
    budget: formData.get("budget") ? Number(formData.get("budget")) : null,
    budgetCurrency: String(formData.get("budgetCurrency") ?? "USD") || "USD",
    landingPagePath: String(formData.get("landingPagePath") ?? "").trim() || null,
    targetAudience: String(formData.get("targetAudience") ?? "") || null,
    targetLocation: String(formData.get("targetLocation") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
  });
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath(`/admin/marketing/campaigns/${id}`);
}

export async function updateCampaignStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as MarketingCampaignStatus;
  await campaignService.setStatus(id, status);
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath(`/admin/marketing/campaigns/${id}`);
}

export async function addCampaignBindingAction(formData: FormData) {
  await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "");
  const adAccountId = String(formData.get("adAccountId") ?? "").trim();
  const externalCampaignId = String(formData.get("externalCampaignId") ?? "").trim();
  const providerId = String(formData.get("providerId") ?? "google-ads").trim() || "google-ads";

  if (adAccountId && externalCampaignId) {
    await campaignService.linkExternalCampaign({
      campaignId,
      adAccountId,
      externalCampaignId,
      providerId,
      externalCampaignName: String(formData.get("externalCampaignName") ?? "") || null,
    });
  } else {
    // Advanced fallback without synced inventory
    await campaignService.addProviderBinding({
      campaignId,
      providerId,
      adAccountId: adAccountId || null,
      externalCampaignId: externalCampaignId || null,
      externalCampaignName: String(formData.get("externalCampaignName") ?? "") || null,
    });
  }
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath(`/admin/marketing/campaigns/${campaignId}`);
  revalidatePath("/admin/marketing/ad-accounts");
}

export async function linkExternalCampaignAction(formData: FormData) {
  await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const adAccountId = String(formData.get("adAccountId") ?? "").trim();
  const externalCampaignId = String(formData.get("externalCampaignId") ?? "").trim();
  const providerId = String(formData.get("providerId") ?? "google-ads").trim() || "google-ads";
  if (!campaignId || !adAccountId || !externalCampaignId) {
    throw new Error("campaignId, adAccountId, and externalCampaignId are required");
  }
  await campaignService.linkExternalCampaign({
    campaignId,
    adAccountId,
    externalCampaignId,
    providerId,
    externalCampaignName: String(formData.get("externalCampaignName") ?? "") || null,
  });
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath(`/admin/marketing/campaigns/${campaignId}`);
  revalidatePath("/admin/marketing/ad-accounts");
}

export async function unlinkCampaignBindingAction(formData: FormData) {
  await requireAdmin();
  const bindingId = String(formData.get("bindingId") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!bindingId) throw new Error("bindingId required");
  await campaignService.removeProviderBinding(bindingId);
  revalidatePath("/admin/marketing/campaigns");
  if (campaignId) revalidatePath(`/admin/marketing/campaigns/${campaignId}`);
  revalidatePath("/admin/marketing/ad-accounts");
}

export async function retryBoundCampaignSyncAction(formData: FormData) {
  await requireAdmin();
  bootstrapMarketingModule();
  const bindingId = String(formData.get("bindingId") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!bindingId) throw new Error("bindingId required");
  await adSyncService.syncBoundCampaign(bindingId);
  revalidatePath("/admin/marketing/campaigns");
  if (campaignId) revalidatePath(`/admin/marketing/campaigns/${campaignId}`);
  revalidatePath("/admin/marketing/ad-accounts");
}

export async function createTrackingUrlAction(formData: FormData) {
  await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "");
  await trackingUrlService.create({
    campaignId,
    baseUrl: String(formData.get("baseUrl") ?? ""),
    utmSource: String(formData.get("utmSource") ?? "") || null,
    utmMedium: String(formData.get("utmMedium") ?? "") || null,
    utmCampaign: String(formData.get("utmCampaign") ?? "") || null,
    utmContent: String(formData.get("utmContent") ?? "") || null,
    utmTerm: String(formData.get("utmTerm") ?? "") || null,
    label: String(formData.get("label") ?? "") || null,
  });
  revalidatePath("/admin/marketing/urls");
  revalidatePath(`/admin/marketing/campaigns/${campaignId}`);
}

export async function upsertConversionDefinitionAction(formData: FormData) {
  await requireAdmin();
  await conversionService.upsertDefinition({
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "") || null,
    triggerType: String(formData.get("triggerType") ?? "form_submit"),
    enabled: formData.get("enabled") !== "false",
  });
  revalidatePath("/admin/marketing/conversions");
}

export async function syncGoogleAdsAccountsAction() {
  await requireAdmin();
  bootstrapMarketingModule();
  try {
    const { getGoogleAdsOperationalCredentials } = await import(
      "@/features/seo/google-platform/ads-credentials"
    );
    const { updateServiceConfiguration } = await import(
      "@/features/seo/google-platform/persistence"
    );
    const seo = await getGoogleAdsOperationalCredentials();
    if (!seo.oauthConnected) {
      redirect(
        "/admin/marketing/ad-accounts?syncError=" +
          encodeURIComponent("Connect Google Ads OAuth under SEO → Google → Ads first."),
      );
    }
    if (!seo.developerToken) {
      redirect(
        "/admin/marketing/ad-accounts?syncError=" +
          encodeURIComponent("Save a developer token under SEO → Google → Ads → Configuration."),
      );
    }
    if (!seo.effectiveLoginCustomerId) {
      redirect(
        "/admin/marketing/ad-accounts?syncError=" +
          encodeURIComponent(
            seo.invalidLoginCustomerIdRaw
              ? `Invalid MCC "${seo.invalidLoginCustomerIdRaw}". Enter a numeric Manager Account ID or set Customer ID.`
              : "Set a numeric Manager Account (MCC) or Customer ID under SEO → Google → Ads.",
          ),
      );
    }

    // Replace invalid email MCC with the numeric customer so Ads API can login
    if (seo.invalidLoginCustomerIdRaw && seo.customerId) {
      await updateServiceConfiguration("ads", {
        managerAccountId: seo.customerId,
      });
    }

    const { ensureSeoBackedGoogleAdsConnection } = await import(
      "@/modules/marketing/providers/google-ads/health"
    );
    const connection = await ensureSeoBackedGoogleAdsConnection();
    if (!connection) {
      redirect(
        "/admin/marketing/ad-accounts?syncError=" +
          encodeURIComponent("Could not create Marketing connection from SEO Google Ads."),
      );
    }

    const rows = await adSyncService.syncAdAccountsForConnection(connection.id, "google-ads");
    const preferred = seo.customerId;
    if (preferred && rows.length > 0) {
      const match = rows.find((r) => r.externalAccountId === preferred) ?? rows[0];
      if (match) {
        await prisma.marketingAccount.updateMany({
          where: { connectionId: connection.id, accountType: "google_ads_customer" },
          data: { isSelected: false },
        });
        await prisma.marketingAccount.update({
          where: { id: match.id },
          data: { isSelected: true },
        });
      }
    }

    revalidatePath("/admin/marketing/ad-accounts");
    revalidatePath("/admin/marketing/platforms");
    revalidatePath("/admin/seo/google");
    redirect(
      `/admin/marketing/ad-accounts?synced=${rows.length}&syncMessage=` +
        encodeURIComponent(
          rows.length
            ? `Imported ${rows.length} Google Ads account${rows.length === 1 ? "" : "s"}.`
            : "Sync finished but Google returned no accounts. Check MCC/customer ID under SEO → Google → Ads.",
        ),
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    redirect(
      "/admin/marketing/ad-accounts?syncError=" + encodeURIComponent(message.slice(0, 300)),
    );
  }
}

export async function syncAdAccountAction(formData: FormData) {
  await requireAdmin();
  bootstrapMarketingModule();
  const connectionId = String(formData.get("connectionId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  const adAccountId = String(formData.get("adAccountId") ?? "");
  await enqueueMarketingJob({
    jobType: "campaign_sync",
    idempotencyKey: `campaign_sync:${providerId}:${adAccountId}:${Date.now()}`,
    providerId,
    connectionId,
    accountId: adAccountId,
  });
  await adSyncService.syncAdAccountsForConnection(connectionId, providerId);
  if (adAccountId) {
    await adSyncService.syncCampaignsForAdAccount(connectionId, providerId, adAccountId);
  }
  revalidatePath("/admin/marketing/ad-accounts");
}

export async function upsertAutomationRuleAction(formData: FormData) {
  await requireAdmin();
  await automationService.upsertRule({
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    triggerType: String(formData.get("triggerType") ?? ""),
    enabled: formData.get("enabled") !== "false",
    conditions: {
      threshold: formData.get("threshold") ? Number(formData.get("threshold")) : undefined,
      operator: String(formData.get("operator") ?? "gt"),
    },
    actions: [{ type: String(formData.get("actionType") ?? "alert") }],
  });
  revalidatePath("/admin/marketing/automation");
}

export async function updateRetentionPolicyAction(formData: FormData) {
  await requireAdmin();
  await updateRetentionPolicy({
    visitorDays: Number(formData.get("visitorDays") ?? 365),
    sessionDays: Number(formData.get("sessionDays") ?? 180),
    touchDays: Number(formData.get("touchDays") ?? 365),
    eventDays: Number(formData.get("eventDays") ?? 365),
    leadDays: Number(formData.get("leadDays") ?? 730),
    providerPayloadDays: Number(formData.get("providerPayloadDays") ?? 90),
  });
  revalidatePath("/admin/marketing/settings");
}

export async function runRetentionPurgeAction() {
  await requireAdmin();
  await runRetentionPurge();
  revalidatePath("/admin/marketing/settings");
}

export async function runAnalyticsRollupAction() {
  await requireAdmin();
  await analyticsAggregateService.rollupDay(new Date());
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/analytics");
}
