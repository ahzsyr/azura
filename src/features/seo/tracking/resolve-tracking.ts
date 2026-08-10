import type { SeoTrackingConfig } from "@/features/seo/types";
import {
  extractGtmContainerIdFromSnippet,
  extractMeasurementIdFromSnippet,
} from "./parse-tracking-snippets";

export type ActiveSiteTracking =
  | { kind: "gtag"; measurementId: string; headSnippet?: string }
  | {
      kind: "gtm";
      containerId: string;
      headSnippet?: string;
      bodySnippet?: string;
    };

const GA4_ID = /^G-[A-Z0-9]+$/i;
const GTM_ID = /^GTM-[A-Z0-9]+$/i;

export function normalizeMeasurementId(raw: string): string | undefined {
  const id = raw.trim().toUpperCase();
  return GA4_ID.test(id) ? id : undefined;
}

export function normalizeGtmContainerId(raw: string): string | undefined {
  const id = raw.trim().toUpperCase();
  return GTM_ID.test(id) ? id : undefined;
}

function resolveGtmContainerId(config: SeoTrackingConfig): string | undefined {
  return (
    (config.gtmContainerId ? normalizeGtmContainerId(config.gtmContainerId) : undefined) ??
    (config.gtmHeadSnippet ? extractGtmContainerIdFromSnippet(config.gtmHeadSnippet) : undefined) ??
    (config.gtmBodySnippet ? extractGtmContainerIdFromSnippet(config.gtmBodySnippet) : undefined)
  );
}

function resolveMeasurementId(config: SeoTrackingConfig): string | undefined {
  return (
    (config.measurementId ? normalizeMeasurementId(config.measurementId) : undefined) ??
    (config.gtagHeadSnippet ? extractMeasurementIdFromSnippet(config.gtagHeadSnippet) : undefined)
  );
}

function legacyGtagEnabled(config: SeoTrackingConfig): boolean {
  return config.enabled === true && (config.mode ?? "gtag") === "gtag";
}

function legacyGtmEnabled(config: SeoTrackingConfig): boolean {
  return config.enabled === true && config.mode === "gtm";
}

/** Whether GA4 gtag.js should load on the public site. */
export function isGtagTrackingEnabled(
  config: SeoTrackingConfig | null | undefined,
): boolean {
  if (!config || config.enabled === false) return false;
  if (config.gtagEnabled === true) return true;
  if (config.gtagEnabled === false) return false;
  return legacyGtagEnabled(config);
}

/** Whether GTM should load on the public site. */
export function isGtmTrackingEnabled(
  config: SeoTrackingConfig | null | undefined,
): boolean {
  if (!config || config.enabled === false) return false;
  if (config.gtmEnabled === true) return true;
  if (config.gtmEnabled === false) return false;
  return legacyGtmEnabled(config);
}

export function isGtagSiteTrackingConfigured(config: SeoTrackingConfig): boolean {
  return isGtagTrackingEnabled(config) && Boolean(resolveMeasurementId(config));
}

export function isGtmSiteTrackingConfigured(config: SeoTrackingConfig): boolean {
  return isGtmTrackingEnabled(config) && Boolean(resolveGtmContainerId(config));
}

/** Resolve which tags to install on the public marketing site. */
export function resolveActiveSiteTrackings(
  config: SeoTrackingConfig | null | undefined,
): ActiveSiteTracking[] {
  if (config?.enabled === false) return [];

  const trackings: ActiveSiteTracking[] = [];

  if (config && isGtagTrackingEnabled(config)) {
    const measurementId = resolveMeasurementId(config);
    if (measurementId) {
      trackings.push({
        kind: "gtag",
        measurementId,
        headSnippet: config.gtagHeadSnippet?.trim() || undefined,
      });
    }
  }

  if (config && isGtmTrackingEnabled(config)) {
    const containerId = resolveGtmContainerId(config);
    if (containerId) {
      trackings.push({
        kind: "gtm",
        containerId,
        headSnippet: config.gtmHeadSnippet?.trim() || undefined,
        bodySnippet: config.gtmBodySnippet?.trim() || undefined,
      });
    }
  }

  if (trackings.length > 0 || config?.enabled === true) {
    return trackings;
  }

  const envId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (envId) {
    const measurementId = normalizeMeasurementId(envId);
    if (measurementId) {
      return [{ kind: "gtag", measurementId }];
    }
  }

  return trackings;
}

/** @deprecated Use resolveActiveSiteTrackings — returns the first active tag only. */
export function resolveActiveSiteTracking(
  config: SeoTrackingConfig | null | undefined,
): ActiveSiteTracking | null {
  return resolveActiveSiteTrackings(config)[0] ?? null;
}

export function isTrackingConfigured(config: SeoTrackingConfig): boolean {
  if (config.enabled === false) return false;
  return isGtagSiteTrackingConfigured(config) || isGtmSiteTrackingConfigured(config);
}
