import "server-only";

import { prisma } from "@/lib/prisma";
import type { EntityTranslation } from "@prisma/client";
import { resolveTranslation } from "./translation-resolver";
import type { PublicLocale } from "@/i18n/locale-config";

export type WorkspaceTranslationBundle = {
  byEntity: Record<string, EntityTranslation[]>;
};

function bundleKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export async function loadWorkspaceTranslations(
  refs: { entityType: string; entityId: string }[]
): Promise<WorkspaceTranslationBundle> {
  if (refs.length === 0) return { byEntity: {} };

  const unique = [...new Map(refs.map((r) => [bundleKey(r.entityType, r.entityId), r])).values()];

  const rows = await prisma.entityTranslation.findMany({
    where: {
      OR: unique.map((r) => ({ entityType: r.entityType, entityId: r.entityId })),
      status: "PUBLISHED",
    },
  });

  const byEntity: Record<string, EntityTranslation[]> = {};
  for (const ref of unique) {
    byEntity[bundleKey(ref.entityType, ref.entityId)] = [];
  }
  for (const row of rows) {
    const key = bundleKey(row.entityType, row.entityId);
    (byEntity[key] ??= []).push(row);
  }
  return { byEntity };
}

export function getWorkspaceTranslations(
  bundle: WorkspaceTranslationBundle,
  entityType: string,
  entityId: string
): EntityTranslation[] {
  return bundle.byEntity[bundleKey(entityType, entityId)] ?? [];
}

/** @deprecated Use translationService.resolveField with legacyFallback option during migration only */
export function resolveWorkspaceField(
  bundle: WorkspaceTranslationBundle,
  entityType: string,
  entityId: string,
  field: string,
  localeCode: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string,
  legacyFallback?: string
): string {
  const translations = getWorkspaceTranslations(bundle, entityType, entityId);
  const resolved = resolveTranslation(field, localeCode, {
    translations,
    enabledLocales,
    defaultCode,
  });
  if (resolved.trim()) return resolved;
  return legacyFallback?.trim() ?? "";
}
