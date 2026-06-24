import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import {
  getHeaderFlyoutImageCacheTags,
  getHeaderWorkspaceRevalidationTags,
  revalidateHeaderWorkspace,
} from "@/services/cache";

const LOG_PREFIX = "[publish-propagation]";

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

export function isPublishPropagationLogEnabled(): boolean {
  return process.env.PUBLISH_PROPAGATION_LOG === "1";
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

/** Tags invalidated when header workspace is published (for logging and tests). */
export function collectHeaderPublishInvalidatedTags(localePrefixes: string[]): string[] {
  return [
    ...new Set([
      ...getHeaderWorkspaceRevalidationTags(),
      ...getHeaderFlyoutImageCacheTags(localePrefixes),
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
  fingerprint: HeaderWorkspaceFingerprint;
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

/**
 * P0: After header workspace save, purge data-cache tags and locale layout route cache.
 * Awaited so path invalidation completes before the save API returns.
 */
export async function invalidateLocaleLayoutsAfterHeaderPublish(
  workspace: HeaderWorkspace,
): Promise<PublishPropagationResult> {
  const startedAt = Date.now();
  const savedAt = new Date(startedAt).toISOString();

  const localePrefixes = await resolveLocalePrefixes();
  const invalidatedTags = collectHeaderPublishInvalidatedTags(localePrefixes);
  const invalidatedPaths = localePrefixesToLayoutPaths(localePrefixes);

  revalidateHeaderWorkspace(localePrefixes);

  for (const path of invalidatedPaths) {
    safeRevalidateLayout(path);
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAt;
  const fingerprint = headerWorkspaceFingerprint(workspace);

  logPublishPropagation({
    entityType: "header",
    savedAt,
    completedAt,
    durationMs,
    invalidatedPaths,
    invalidatedTags,
    fingerprint,
  });

  return {
    invalidatedPaths,
    invalidatedTags,
    completedAt,
    durationMs,
  };
}
