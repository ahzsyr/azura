import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import {
  CACHE_TAGS,
  getFooterTranslationCacheTags,
  getFooterWorkspaceRevalidationTags,
  getHeaderFlyoutImageCacheTags,
  getHeaderWorkspaceRevalidationTags,
  getPublicShellRevalidationTags,
  getThemeShellRevalidationTags,
  revalidateProductListing,
  revalidatePublicShell,
} from "@/services/cache";

const SITE_SETTINGS_NAMESPACE = "site-settings";
const FALLBACK_SITE_SETTINGS_PREFIXES = ["en", "en-us", "ar"];

const LOG_PREFIX = "[publish-propagation]";

export type ShellEntityType = "header" | "footer" | "theme" | "site-settings" | "app-settings";

export type HeaderWorkspaceFingerprint = {
  activeMenuKey: string;
  menuItemCount: number;
  hash: string;
};

export type PublishPropagationResult = {
  invalidatedPaths: string[];
  invalidatedTags: string[];
  completedAt: string;
  durationMs: number;
};

export type PublishResult = PublishPropagationResult & {
  entityType: ShellEntityType;
};

export type PublishShellChangeInput = {
  entityType: ShellEntityType;
  localePrefixes?: string[];
  headerWorkspace?: HeaderWorkspace;
};

export function isPublishPropagationLogEnabled(): boolean {
  return process.env.PUBLISH_PROPAGATION_LOG === "1";
}

/** Layout + product listing paths invalidated when site settings are published. */
export function localePrefixesToSiteSettingsPaths(prefixes: string[]): string[] {
  const normalized = [
    ...new Set(
      prefixes
        .map((prefix) => prefix.trim())
        .filter(Boolean),
    ),
  ];
  return [
    ...new Set([
      ...localePrefixesToLayoutPaths(normalized),
      ...normalized.map((prefix) => `/${prefix}/products`),
    ]),
  ];
}

/** Map enabled locale url prefixes to layout paths invalidated on shell publish. */
export function localePrefixesToLayoutPaths(prefixes: string[]): string[] {
  return [
    ...new Set(
      prefixes
        .map((prefix) => prefix.trim())
        .filter(Boolean)
        .map((prefix) => `/${prefix}`),
    ),
  ];
}

/** Entity-specific tags beyond the shared public shell set (for logging and tests). */
export function collectEntitySpecificPublishTags(
  entityType: ShellEntityType,
  localePrefixes: string[],
): string[] {
  switch (entityType) {
    case "header":
      return collectHeaderPublishInvalidatedTags(localePrefixes);
    case "footer":
      return collectFooterPublishInvalidatedTags(localePrefixes);
    case "theme":
      return collectThemePublishInvalidatedTags();
    case "site-settings":
      return collectSiteSettingsPublishInvalidatedTags(localePrefixes);
    case "app-settings":
      return collectAppSettingsPublishInvalidatedTags();
  }
}

/** Tags invalidated when WhatsApp/personalization app settings are published. */
export function collectAppSettingsPublishInvalidatedTags(): string[] {
  return [
    ...new Set([
      CACHE_TAGS.json("settings"),
      CACHE_TAGS.json("whatsapp"),
      CACHE_TAGS.json("personalization"),
    ]),
  ];
}

/** Tags invalidated when site settings are published (for logging and tests). */
export function collectSiteSettingsPublishInvalidatedTags(localePrefixes: string[]): string[] {
  return [
    ...new Set([
      CACHE_TAGS.json(SITE_SETTINGS_NAMESPACE),
      ...localePrefixes.flatMap((prefix) => [
        CACHE_TAGS.productListing(prefix),
        CACHE_TAGS.productFacets(prefix),
        CACHE_TAGS.catalogListingShell(prefix),
      ]),
    ]),
  ];
}

/** Tags invalidated when header workspace is published (for logging and tests). */
export function collectHeaderPublishInvalidatedTags(localePrefixes: string[]): string[] {
  return [
    ...new Set([
      ...getHeaderWorkspaceRevalidationTags(),
      ...getHeaderFlyoutImageCacheTags(localePrefixes),
    ]),
  ];
}

/** Tags invalidated when footer workspace is published (for logging and tests). */
export function collectFooterPublishInvalidatedTags(localePrefixes: string[]): string[] {
  return [
    ...new Set([
      ...getFooterWorkspaceRevalidationTags(),
      ...getFooterTranslationCacheTags(localePrefixes),
    ]),
  ];
}

/** Tags invalidated when theme is published (for logging and tests). */
export function collectThemePublishInvalidatedTags(): string[] {
  return [...getThemeShellRevalidationTags()];
}

export function collectShellPublishInvalidatedTags(
  entityType: ShellEntityType,
  localePrefixes: string[],
): string[] {
  return [
    ...new Set([
      ...getPublicShellRevalidationTags(localePrefixes),
      ...collectEntitySpecificPublishTags(entityType, localePrefixes),
    ]),
  ];
}

export function headerWorkspaceFingerprint(ws: HeaderWorkspace): HeaderWorkspaceFingerprint {
  const active = ws.menusDatabase[ws.activeMenuKey];
  const payload = JSON.stringify({
    activeMenuKey: ws.activeMenuKey,
    menusDatabase: ws.menusDatabase,
  });
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 24);
  return {
    activeMenuKey: ws.activeMenuKey,
    menuItemCount: active?.items?.length ?? 0,
    hash,
  };
}

export function logPublishPropagation(event: {
  entityType: string;
  savedAt: string;
  completedAt: string;
  durationMs: number;
  invalidatedPaths: string[];
  invalidatedTags: string[];
  fingerprint?: HeaderWorkspaceFingerprint;
}): void {
  if (!isPublishPropagationLogEnabled()) return;
  console.info(LOG_PREFIX, {
    phase: "publish",
    ...event,
  });
}

export function logRenderPropagation(event: {
  renderedAt: string;
  locale: string;
  durationMs: number;
  fingerprint: HeaderWorkspaceFingerprint;
}): void {
  if (!isPublishPropagationLogEnabled()) return;
  console.info(LOG_PREFIX, {
    phase: "render",
    ...event,
  });
}

function safeRevalidateLayout(path: string): void {
  try {
    revalidatePath(path, "layout");
  } catch {
    // revalidatePath requires Next.js static generation store
  }
}

async function resolveLocalePrefixes(): Promise<string[]> {
  try {
    const prefixes = await getEnabledUrlPrefixes();
    return prefixes.length > 0 ? prefixes : ["en"];
  } catch {
    return ["en"];
  }
}

async function resolveSiteSettingsLocalePrefixes(): Promise<string[]> {
  try {
    const prefixes = await getEnabledUrlPrefixes();
    return prefixes.length > 0 ? prefixes : FALLBACK_SITE_SETTINGS_PREFIXES;
  } catch {
    return FALLBACK_SITE_SETTINGS_PREFIXES;
  }
}

async function resolveShellLocalePrefixes(entityType: ShellEntityType): Promise<string[]> {
  return entityType === "site-settings"
    ? resolveSiteSettingsLocalePrefixes()
    : resolveLocalePrefixes();
}

function applyShellTagInvalidation(entityType: ShellEntityType, localePrefixes: string[]): void {
  revalidatePublicShell(localePrefixes);
  if (entityType === "site-settings") {
    for (const prefix of localePrefixes) {
      revalidateProductListing(prefix);
    }
  }
}

function revalidateShellLayoutPaths(
  entityType: ShellEntityType,
  localePrefixes: string[],
): string[] {
  const layoutPaths = localePrefixesToLayoutPaths(localePrefixes);
  const invalidatedPaths =
    entityType === "site-settings"
      ? localePrefixesToSiteSettingsPaths(localePrefixes)
      : layoutPaths;

  for (const path of layoutPaths) {
    safeRevalidateLayout(path);
  }

  if (entityType === "site-settings") {
    for (const prefix of localePrefixes) {
      safeRevalidateLayout(`/${prefix}/products`);
    }
  }

  return invalidatedPaths;
}

/**
 * Centralized shell publish: awaited tag + layout route cache invalidation.
 * All header, footer, theme, and site-settings saves route through this.
 */
export async function publishShellChange(
  input: PublishShellChangeInput,
): Promise<PublishResult> {
  const startedAt = Date.now();
  const savedAt = new Date(startedAt).toISOString();

  const localePrefixes =
    input.localePrefixes?.length && input.localePrefixes.length > 0
      ? input.localePrefixes
      : await resolveShellLocalePrefixes(input.entityType);

  const invalidatedTags = collectShellPublishInvalidatedTags(input.entityType, localePrefixes);
  applyShellTagInvalidation(input.entityType, localePrefixes);
  const invalidatedPaths = revalidateShellLayoutPaths(input.entityType, localePrefixes);

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAt;
  const fingerprint =
    input.entityType === "header" && input.headerWorkspace
      ? headerWorkspaceFingerprint(input.headerWorkspace)
      : undefined;

  logPublishPropagation({
    entityType: input.entityType,
    savedAt,
    completedAt,
    durationMs,
    invalidatedPaths,
    invalidatedTags,
    fingerprint,
  });

  return {
    entityType: input.entityType,
    invalidatedPaths,
    invalidatedTags,
    completedAt,
    durationMs,
  };
}
