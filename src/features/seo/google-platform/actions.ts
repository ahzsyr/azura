"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import type { GoogleIntegrationId, GoogleOperationalPolicy, GoogleServiceConfigMap } from "./types";
import {
  getGooglePlatformState,
  updateGlobalSettings,
  updateServiceConfiguration,
  updateServicePolicy,
  upsertGooglePlatformState,
} from "./persistence";
import { executeGoogleOperation, validateGoogleIntegration } from "./operations";
import { buildContext } from "./monitoring";
import { seoRepository } from "@/repositories/seo.repository";
import { alignIndexNowStoredConfig } from "@/features/seo/integrations/indexnow-payload";
import { emitEvent } from "./events";
import { createGoogleConnectionManager } from "./connection-manager";
import { googleIntegrationRegistry } from "./registry";
import { validateServiceAccountJson } from "@/features/seo/google-live/service-account-json";

export type GooglePlatformActionResult = {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
};

function revalidateGooglePaths() {
  revalidatePath("/admin/seo/google");
  revalidatePath("/admin/seo/search-operations/google");
  revalidatePath("/admin/seo/integrations");
  revalidatePath("/admin/seo");
}

async function loadContext() {
  const [platform, integrations, tracking] = await Promise.all([
    getGooglePlatformState(),
    seoRepository.getIntegrationsConfig().catch(() => ({})),
    seoRepository.getTrackingConfig().catch(() => ({})),
  ]);
  return buildContext({
    platform,
    legacyIntegrations: integrations,
    tracking,
    env: {
      gaId: process.env.NEXT_PUBLIC_GA_ID,
      oauthClientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
      oauthClientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    },
  });
}

export async function upsertGoogleGlobalSettingsAction(
  _prev: GooglePlatformActionResult | null,
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  try {
    await requireAdmin();
    const sharedServiceAccountJson = String(formData.get("sharedServiceAccountJson") ?? "");
    if (sharedServiceAccountJson.trim()) {
      const validation = validateServiceAccountJson(sharedServiceAccountJson);
      if (!validation.ok) return { ok: false, message: validation.message };
    }
    await updateGlobalSettings({
      defaultCloudProjectId: String(formData.get("defaultCloudProjectId") ?? "") || undefined,
      oauthClientId: String(formData.get("oauthClientId") ?? "") || undefined,
      oauthClientSecret: String(formData.get("oauthClientSecret") ?? "") || undefined,
      sharedServiceAccountJson: sharedServiceAccountJson || undefined,
      secretRotationDays: Number(formData.get("secretRotationDays") || 90),
      globalRateLimitPerMinute: Number(formData.get("globalRateLimitPerMinute") || 120),
      loggingRetentionDays: Number(formData.get("loggingRetentionDays") || 30),
      defaultTimeoutMs: Number(formData.get("defaultTimeoutMs") || 30000),
      notificationChannels: String(formData.get("notificationChannels") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      defaultRetryPolicy: {
        retryCount: Number(formData.get("retryCount") || 3),
        retryBackoffMs: Number(formData.get("retryBackoffMs") || 5000),
      },
      defaultWorkerPolicy: {
        workerEnabled: formData.get("workerEnabled") === "true",
        parallelRequests: Number(formData.get("parallelRequests") || 2),
        timeoutMs: Number(formData.get("timeoutMs") || 30000),
      },
      environmentValidated: formData.get("environmentValidated") === "true",
      lastValidatedAt: new Date().toISOString(),
    });
    let state = await getGooglePlatformState();
    state = emitEvent(state, "ConfigUpdated", "global", "Global Google settings saved");
    await upsertGooglePlatformState(state);
    revalidateGooglePaths();
    return { ok: true, message: "Global Google settings saved." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function upsertGoogleServiceConfigAction(
  _prev: GooglePlatformActionResult | null,
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  try {
    await requireAdmin();
    const integrationId = String(formData.get("integrationId") ?? "") as GoogleIntegrationId;
    const def = googleIntegrationRegistry.get(integrationId);
    if (!def) return { ok: false, message: "Unknown integration" };

    const configuration: GoogleServiceConfigMap = {};
    for (const field of def.configurationSchema.fields) {
      const raw = formData.get(`config.${field.key}`);
      if (raw == null) continue;
      if (field.type === "boolean") {
        configuration[field.key] = raw === "true" || raw === "on";
      } else if (field.type === "number") {
        const n = Number(raw);
        configuration[field.key] = Number.isFinite(n) ? n : undefined;
      } else {
        configuration[field.key] = String(raw);
      }
    }

    let state = await updateServiceConfiguration(integrationId, configuration);

    // Mirror IndexNow secrets into legacy integrations where needed
    if (integrationId === "indexnow") {
      const existing = await seoRepository.getIntegrationsConfig();
      const aligned = alignIndexNowStoredConfig({
        ...existing.indexnow,
        enabled: true,
        apiKey:
          (typeof configuration.apiKey === "string" && configuration.apiKey) ||
          existing.indexnow?.apiKey,
        endpoint:
          (typeof configuration.endpoint === "string" && configuration.endpoint) ||
          existing.indexnow?.endpoint,
        keyLocation:
          (typeof configuration.keyLocation === "string" && configuration.keyLocation) ||
          existing.indexnow?.keyLocation,
        siteUrl:
          (typeof configuration.host === "string" && configuration.host) ||
          existing.indexnow?.siteUrl,
      });
      await seoRepository.upsertIntegrationsConfig({
        ...existing,
        indexnow: aligned,
      });
    }

    if (integrationId === "pagespeed" && typeof configuration.apiKey === "string" && configuration.apiKey) {
      const existing = await seoRepository.getIntegrationsConfig();
      await seoRepository.upsertIntegrationsConfig({
        ...existing,
        google: {
          ...existing.google,
          apiKey: configuration.apiKey || existing.google?.apiKey,
        },
      });
    }

    state = emitEvent(state, "ConfigUpdated", integrationId, `${def.displayName} configuration saved`);
    await upsertGooglePlatformState(state);
    revalidateGooglePaths();
    return { ok: true, message: `${def.displayName} configuration saved.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function upsertGoogleServicePolicyAction(
  _prev: GooglePlatformActionResult | null,
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  try {
    await requireAdmin();
    const integrationId = String(formData.get("integrationId") ?? "") as GoogleIntegrationId;
    const def = googleIntegrationRegistry.get(integrationId);
    if (!def) return { ok: false, message: "Unknown integration" };

    const policy: Partial<GoogleOperationalPolicy> = {
      cadenceMinutes: Number(formData.get("cadenceMinutes") || def.defaultPolicy.cadenceMinutes),
      retryCount: Number(formData.get("retryCount") || def.defaultPolicy.retryCount),
      retryBackoffMs: Number(formData.get("retryBackoffMs") || def.defaultPolicy.retryBackoffMs),
      timeoutMs: Number(formData.get("timeoutMs") || def.defaultPolicy.timeoutMs),
      parallelRequests: Number(formData.get("parallelRequests") || def.defaultPolicy.parallelRequests),
      workerEnabled: formData.get("workerEnabled") === "true",
      dryRunDefault: formData.get("dryRunDefault") === "true",
      rateLimitPerMinute: Number(formData.get("rateLimitPerMinute") || def.defaultPolicy.rateLimitPerMinute || 60),
      notificationOnFailure: formData.get("notificationOnFailure") === "true",
      notificationOnQuotaWarning: formData.get("notificationOnQuotaWarning") === "true",
      errorRecovery: (String(formData.get("errorRecovery") || "auto_retry") as GoogleOperationalPolicy["errorRecovery"]),
    };

    let state = await updateServicePolicy(integrationId, policy);
    state = emitEvent(state, "PolicyUpdated", integrationId, `${def.displayName} operational policy saved`);
    await upsertGooglePlatformState(state);
    revalidateGooglePaths();
    return { ok: true, message: `${def.displayName} operational policy saved.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function runGoogleOperationAction(
  _prev: GooglePlatformActionResult | null,
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  try {
    await requireAdmin();
    const integrationId = String(formData.get("integrationId") ?? "") as GoogleIntegrationId;
    const operationId = String(formData.get("operationId") ?? "");
    const dryRun = formData.get("dryRun") === "true";
    const params: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("param.")) params[key.slice(6)] = String(value);
    }

    const ctx = await loadContext();
    const { result, state } = await executeGoogleOperation(
      ctx.platform,
      ctx,
      integrationId,
      operationId,
      params,
      { dryRun },
    );
    await upsertGooglePlatformState(state);
    revalidateGooglePaths();
    return { ok: result.ok, message: result.message, data: result.data };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function testGoogleIntegrationAction(
  _prev: GooglePlatformActionResult | null,
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  try {
    await requireAdmin();
    const integrationId = String(formData.get("integrationId") ?? "") as GoogleIntegrationId;
    const dryRun = formData.get("dryRun") === "true";
    const ctx = await loadContext();
    const { result, state } = await validateGoogleIntegration(ctx.platform, ctx, integrationId, {
      dryRun,
    });
    const manager = createGoogleConnectionManager(state);
    manager.markVerified(integrationId, result.ok, result.message);
    await upsertGooglePlatformState(manager.snapshot());
    revalidateGooglePaths();
    return { ok: result.ok, message: result.message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function disconnectGoogleIntegrationAction(
  _prev: GooglePlatformActionResult | null,
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  try {
    await requireAdmin();
    const integrationId = String(formData.get("integrationId") ?? "") as GoogleIntegrationId;
    const state = await getGooglePlatformState();
    const manager = createGoogleConnectionManager(state);
    manager.disconnect(integrationId);
    await upsertGooglePlatformState(manager.snapshot());
    revalidateGooglePaths();
    return { ok: true, message: "Disconnected." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/** Form-action wrappers for pages that do not use useActionState. */
export async function runGoogleOperationFormAction(
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  return runGoogleOperationAction(null, formData);
}

export async function testGoogleIntegrationFormAction(
  formData: FormData,
): Promise<GooglePlatformActionResult> {
  return testGoogleIntegrationAction(null, formData);
}
