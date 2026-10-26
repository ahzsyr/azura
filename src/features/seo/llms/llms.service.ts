import "server-only";

import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { createCached, CACHE_TAGS } from "@/services/cache";
import { seoRepository } from "@/repositories/seo.repository";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { isLocalhostHost } from "@/features/seo/site-url-utils";
import { forceApexOrigin } from "@/lib/preferred-host";
import { generateSitemap } from "@/features/seo/sitemap.service";
import type { SeoLlmsConfig } from "@/features/seo/types";
import {
  buildLlmsDraftFromEntries,
  buildEmergencyLlmsTxt,
  countLlmsDocument,
  createEmptyLlmsDocument,
  formatLlmsTxt,
  normalizeLlmsDocument,
  sanitizeLlmsDocumentForPublic,
  validateLlmsDocument,
  type LlmsDocumentStats,
} from "./llms-document";

export type LlmsDraftResponse = {
  ok: boolean;
  message: string;
  document?: SeoLlmsConfig;
  warnings?: string[];
  stats?: LlmsDocumentStats;
  origin?: string | null;
};

export type PublicLlmsTxtResult = {
  status: "saved" | "fallback" | "disabled";
  content: string;
};

export class LlmsValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues[0] ?? "Invalid llms.txt document.");
    this.name = "LlmsValidationError";
    this.issues = issues;
  }
}

function normalizeOriginCandidate(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (process.env.NODE_ENV === "production" && isLocalhostHost(url.hostname)) return null;
    return (forceApexOrigin(url.origin) ?? url.origin).replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Safe public origin for llms.txt absolute URLs.
 * Never invents a production domain: returns null so the draft can omit links
 * and warn instead of publishing wrong canonical URLs.
 */
export async function resolveLlmsOriginSafe(): Promise<string | null> {
  try {
    const resolved = normalizeOriginCandidate(await resolveSiteOrigin("public"));
    if (resolved) return resolved;
  } catch {
    // fall through to env
  }

  return normalizeOriginCandidate(process.env.NEXT_PUBLIC_SITE_URL);
}

export async function getSavedLlmsConfig(): Promise<SeoLlmsConfig | null> {
  try {
    const raw = await seoRepository.getLlmsConfig();
    return raw ? normalizeLlmsDocument(raw) : null;
  } catch (error) {
    console.error("[llms] failed to load saved document:", error);
    return null;
  }
}

export async function saveLlmsConfig(input: unknown): Promise<SeoLlmsConfig> {
  const document = normalizeLlmsDocument(input);
  const origin = await resolveLlmsOriginSafe();
  const validation = validateLlmsDocument(document, { siteOrigin: origin });
  if (!validation.valid) {
    throw new LlmsValidationError(validation.errors);
  }

  const config: SeoLlmsConfig = {
    ...document,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  await seoRepository.upsertLlmsConfig(config);
  return config;
}

function identityOrFallback() {
  return getDefaultSiteIdentity();
}

/**
 * Generate an initial draft from published, indexable, sitemap-eligible URLs.
 * `generateSitemap()` already enforces publication status, noindex, sitemap
 * exclusions, locale variants, and localized slugs.
 */
export async function generateLlmsDraft(): Promise<LlmsDraftResponse> {
  const warnings: string[] = [];
  const origin = await resolveLlmsOriginSafe();
  if (!origin) {
    warnings.push(
      "Public site origin is unavailable. Configure NEXT_PUBLIC_SITE_URL or site settings before publishing absolute links.",
    );
  }

  let entries: Awaited<ReturnType<typeof generateSitemap>> = [];
  if (origin) {
    try {
      entries = await generateSitemap(origin);
    } catch (error) {
      console.error("[llms] sitemap-derived draft failed:", error);
      warnings.push("Published content could not be read; the draft contains no content links.");
    }
  }

  const locales = await localeService.listEnabled().catch(() => [...FALLBACK_LOCALES]);
  const defaultPrefix =
    locales.find((locale) => locale.isDefault)?.urlPrefix ??
    FALLBACK_LOCALES.find((locale) => locale.isDefault)?.urlPrefix ??
    "en";
  const identity = await resolveSiteIdentityFromDb().catch(identityOrFallback);

  const result = buildLlmsDraftFromEntries(entries, {
    origin,
    defaultPrefix,
    localePrefixes: locales.map((locale) => locale.urlPrefix),
    siteName: identity.brandName,
    tagline: identity.tagline,
  });

  return {
    ok: true,
    message:
      result.stats.links > 0
        ? `Draft generated with ${result.stats.links} published, indexable link(s).`
        : "Draft generated, but no published indexable content was found.",
    document: result.document,
    warnings: [...warnings, ...result.warnings],
    stats: result.stats,
    origin,
  };
}

function buildFallbackResult(identity: { brandName: string; tagline: string }): PublicLlmsTxtResult {
  return {
    status: "fallback",
    content: formatLlmsTxt(
      createEmptyLlmsDocument({
        title: identity.brandName,
        summary: identity.tagline,
      }),
    ),
  };
}

/**
 * Public route data. The saved document is the source of truth; when it is
 * unavailable or invalid, serve a safe site-identity document instead of a 500.
 */
export async function loadPublicLlmsTxt(): Promise<PublicLlmsTxtResult> {
  return createCached(
    async (): Promise<PublicLlmsTxtResult> => {
      let raw: unknown = null;
      try {
        raw = await seoRepository.getLlmsConfig();
      } catch (error) {
        console.error("[llms] public document load failed:", error);
      }

      const identity = await resolveSiteIdentityFromDb().catch(identityOrFallback);

      if (raw && typeof raw === "object" && (raw as { enabled?: unknown }).enabled === false) {
        return { status: "disabled", content: "" };
      }

      if (raw) {
        const document = normalizeLlmsDocument(raw);
        if (!document.title.trim()) document.title = identity.brandName;
        if (!document.summary?.trim()) document.summary = identity.tagline;

        const origin = await resolveLlmsOriginSafe();
        const sanitized = sanitizeLlmsDocumentForPublic(document);
        if (sanitized.removedLinks > 0) {
          console.warn(
            `[llms] removed ${sanitized.removedLinks} unsafe link(s) from the public document.`,
          );
        }

        const validation = validateLlmsDocument(sanitized.document, { siteOrigin: origin });
        if (validation.valid) {
          return { status: "saved", content: formatLlmsTxt(sanitized.document) };
        }
        console.error("[llms] saved document is invalid; serving fallback:", validation.errors);
      }

      return buildFallbackResult(identity);
    },
    ["llms-txt-public"],
    { tags: [CACHE_TAGS.llms], revalidate: 300 },
  )();
}

/** Synchronous last-resort body for the route handler's own error path. */
export function buildLlmsTxtEmergencyBody(): string {
  try {
    const identity = identityOrFallback();
    return buildEmergencyLlmsTxt(identity.brandName, identity.tagline);
  } catch {
    return "# Website\n\n> Public site information.\n";
  }
}

export { countLlmsDocument };
export type { LlmsDocumentStats };
