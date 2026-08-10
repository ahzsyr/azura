import "server-only";

import { revalidatePath } from "next/cache";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoTrackingMode } from "@/features/seo/types";
import {
  isGtagTrackingEnabled,
  isGtmTrackingEnabled,
  normalizeGtmContainerId,
  normalizeMeasurementId,
} from "@/features/seo/tracking/resolve-tracking";
import {
  extractGtmContainerIdFromSnippet,
  extractMeasurementIdFromSnippet,
} from "@/features/seo/tracking/parse-tracking-snippets";

export type SeoTrackingUpsertInput = {
  mode?: SeoTrackingMode;
  gtagEnabled?: boolean;
  gtmEnabled?: boolean;
  /** Legacy single toggle when per-service flags are omitted */
  enabled?: boolean;
  measurementId?: string;
  gtmContainerId?: string;
  gtagHeadSnippet?: string;
  gtmHeadSnippet?: string;
  gtmBodySnippet?: string;
  /** When false, keep existing DB value for that field */
  includeMeasurementId?: boolean;
  includeGtmContainerId?: boolean;
  includeGtagHeadSnippet?: boolean;
  includeGtmHeadSnippet?: boolean;
  includeGtmBodySnippet?: boolean;
};

export async function upsertSeoTrackingConfig(input: SeoTrackingUpsertInput): Promise<void> {
  const existing = await seoRepository.getTrackingConfig();
  const mode: SeoTrackingMode = input.mode === "gtm" ? "gtm" : "gtag";

  const hasPerServiceFlags =
    input.gtagEnabled !== undefined || input.gtmEnabled !== undefined;

  let gtagEnabled: boolean;
  let gtmEnabled: boolean;

  if (hasPerServiceFlags) {
    gtagEnabled =
      input.gtagEnabled !== undefined
        ? input.gtagEnabled === true
        : isGtagTrackingEnabled(existing);
    gtmEnabled =
      input.gtmEnabled !== undefined
        ? input.gtmEnabled === true
        : isGtmTrackingEnabled(existing);
  } else {
    const legacyEnabled = input.enabled === true;
    gtagEnabled = legacyEnabled && mode === "gtag";
    gtmEnabled = legacyEnabled && mode === "gtm";
  }

  const enabled = gtagEnabled || gtmEnabled;
  const persistedMode: SeoTrackingMode =
    gtmEnabled && !gtagEnabled ? "gtm" : gtagEnabled && !gtmEnabled ? "gtag" : mode;

  const measurementIdRaw =
    input.includeMeasurementId === false
      ? (existing.measurementId ?? "")
      : (input.measurementId?.trim() ?? "");
  const gtmContainerIdRaw =
    input.includeGtmContainerId === false
      ? (existing.gtmContainerId ?? "")
      : (input.gtmContainerId?.trim() ?? "");

  const gtagHeadSnippet =
    input.includeGtagHeadSnippet === false
      ? (existing.gtagHeadSnippet ?? "")
      : (input.gtagHeadSnippet?.trim() ?? "");
  const gtmHeadSnippet =
    input.includeGtmHeadSnippet === false
      ? (existing.gtmHeadSnippet ?? "")
      : (input.gtmHeadSnippet?.trim() ?? "");
  const gtmBodySnippet =
    input.includeGtmBodySnippet === false
      ? (existing.gtmBodySnippet ?? "")
      : (input.gtmBodySnippet?.trim() ?? "");

  const measurementId =
    (measurementIdRaw ? normalizeMeasurementId(measurementIdRaw) : undefined) ??
    (gtagHeadSnippet ? extractMeasurementIdFromSnippet(gtagHeadSnippet) : undefined);
  const gtmContainerId =
    (gtmContainerIdRaw ? normalizeGtmContainerId(gtmContainerIdRaw) : undefined) ??
    (gtmHeadSnippet ? extractGtmContainerIdFromSnippet(gtmHeadSnippet) : undefined) ??
    (gtmBodySnippet ? extractGtmContainerIdFromSnippet(gtmBodySnippet) : undefined);

  if (gtagEnabled || gtmEnabled) {
    if (gtagEnabled && measurementIdRaw && !measurementId) {
      throw new Error("Measurement ID must look like G-XXXXXXXXXX.");
    }
    if (gtmEnabled && gtmContainerIdRaw && !gtmContainerId) {
      throw new Error("Container ID must look like GTM-XXXXXXX.");
    }
    if (gtagEnabled && !measurementId) {
      throw new Error("Enter a Google tag measurement ID (G-…) or paste a valid install snippet.");
    }
    if (gtmEnabled && !gtmContainerId) {
      throw new Error("Enter a GTM container ID (GTM-…) or paste valid head/body install snippets.");
    }
  }

  await seoRepository.upsertTrackingConfig({
    enabled,
    mode: persistedMode,
    gtagEnabled,
    gtmEnabled,
    measurementId,
    gtmContainerId,
    gtagHeadSnippet: gtagHeadSnippet || undefined,
    gtmHeadSnippet: gtmHeadSnippet || undefined,
    gtmBodySnippet: gtmBodySnippet || undefined,
  });

  revalidatePath("/admin/seo/settings");
  revalidatePath("/admin/seo/google");
  revalidatePath("/admin/seo/google-tags");
  revalidatePath("/", "layout");
}

export function seoTrackingInputFromFormData(formData: FormData): SeoTrackingUpsertInput {
  const modeRaw = (formData.get("mode") as string)?.trim();
  return {
    mode: modeRaw === "gtm" ? "gtm" : "gtag",
    gtagEnabled: formData.has("gtagEnabled")
      ? formData.get("gtagEnabled") === "true"
      : undefined,
    gtmEnabled: formData.has("gtmEnabled")
      ? formData.get("gtmEnabled") === "true"
      : undefined,
    enabled: formData.has("enabled") ? formData.get("enabled") === "true" : undefined,
    measurementId: formData.has("measurementId")
      ? ((formData.get("measurementId") as string) ?? "")
      : undefined,
    gtmContainerId: formData.has("gtmContainerId")
      ? ((formData.get("gtmContainerId") as string) ?? "")
      : undefined,
    gtagHeadSnippet: formData.has("gtagHeadSnippet")
      ? ((formData.get("gtagHeadSnippet") as string) ?? "")
      : undefined,
    gtmHeadSnippet: formData.has("gtmHeadSnippet")
      ? ((formData.get("gtmHeadSnippet") as string) ?? "")
      : undefined,
    gtmBodySnippet: formData.has("gtmBodySnippet")
      ? ((formData.get("gtmBodySnippet") as string) ?? "")
      : undefined,
    includeMeasurementId: formData.has("measurementId"),
    includeGtmContainerId: formData.has("gtmContainerId"),
    includeGtagHeadSnippet: formData.has("gtagHeadSnippet"),
    includeGtmHeadSnippet: formData.has("gtmHeadSnippet"),
    includeGtmBodySnippet: formData.has("gtmBodySnippet"),
  };
}
