"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { sealSecret } from "@/features/seo/integrations/secret-seal.server";
import { runDueMarketingJobs } from "@/modules/marketing/jobs";
import { requestPublish } from "@/modules/marketing/publishing/service";
import { upsertProviderAppConfig } from "@/modules/marketing/providers/app-config";

export async function runMarketingJobsAction(): Promise<void> {
  await requireAdmin();
  bootstrapMarketingModule();
  await runDueMarketingJobs(20);
  revalidatePath("/admin/marketing/publishing");
}

export async function upsertTrackingConfigAction(formData: FormData) {
  await requireAdmin();
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!providerId) throw new Error("providerId required");

  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const pixelId = String(formData.get("pixelId") ?? "").trim() || null;
  const capiEnabled = formData.get("capiEnabled") === "on" || formData.get("capiEnabled") === "true";
  const accessTokenRaw = String(formData.get("accessToken") ?? "").trim();
  const testEventCode = String(formData.get("testEventCode") ?? "").trim() || null;

  await prisma.marketingTrackingConfig.upsert({
    where: { providerId },
    create: {
      providerId,
      enabled,
      pixelId,
      capiEnabled,
      accessToken: accessTokenRaw ? sealSecret(accessTokenRaw) : null,
      testEventCode,
    },
    update: {
      enabled,
      pixelId,
      capiEnabled,
      ...(accessTokenRaw ? { accessToken: sealSecret(accessTokenRaw) } : {}),
      testEventCode,
    },
  });

  // Mirror Meta pixel/CAPI into provider app config so adapters read one source of truth.
  if (providerId === "meta") {
    await upsertProviderAppConfig({
      providerId: "meta",
      pixelId: pixelId ?? undefined,
      capiAccessToken: accessTokenRaw || undefined,
    });
  }

  revalidatePath("/admin/marketing/tracking");
  revalidatePath("/admin/marketing/platforms");
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
