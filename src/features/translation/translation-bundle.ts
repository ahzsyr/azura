import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import type { PublicLocale } from "@/i18n/locale-config";
import { createCached, CACHE_TAGS } from "@/services/cache";
import type { PageBlocks } from "@/types/builder";
import {
  BUILDER_BLOCK_ENTITY_TYPE,
  collectBlockEntityIds,
  type BlockParentType,
} from "./block-translation";
import { resolveTranslation, type TranslationContext } from "./translation-resolver";

export type EntityRef = {
  entityType: string;
  entityId: string;
};

export type TranslationBundle = {
  enabledLocales: PublicLocale[];
  defaultCode: string;
  /** key: `${entityType}:${entityId}` */
  byEntity: Record<string, EntityTranslation[]>;
  /** key: `${entityType}:${entityId}` → locale code → slug */
  slugs: Record<string, Record<string, string>>;
};

function bundleKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export async function loadTranslationBundle(refs: EntityRef[]): Promise<TranslationBundle> {
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";

  const uniqueRefs = [...new Map(refs.map((r) => [bundleKey(r.entityType, r.entityId), r])).values()];

  if (uniqueRefs.length === 0) {
    return { enabledLocales, defaultCode, byEntity: {}, slugs: {} };
  }

  const orConditions = uniqueRefs.map((r) => ({
    entityType: r.entityType,
    entityId: r.entityId,
  }));

  const [translations, slugs] = await Promise.all([
    prisma.entityTranslation.findMany({
      where: {
        OR: orConditions,
        status: "PUBLISHED",
      },
    }),
    prisma.localizedSlug.findMany({
      where: { OR: orConditions },
    }),
  ]);

  const byEntity: Record<string, EntityTranslation[]> = {};
  for (const ref of uniqueRefs) {
    byEntity[bundleKey(ref.entityType, ref.entityId)] = [];
  }
  for (const row of translations) {
    const key = bundleKey(row.entityType, row.entityId);
    (byEntity[key] ??= []).push(row);
  }

  const slugMap: Record<string, Record<string, string>> = {};
  for (const ref of uniqueRefs) {
    slugMap[bundleKey(ref.entityType, ref.entityId)] = {};
  }
  for (const row of slugs) {
    const key = bundleKey(row.entityType, row.entityId);
    (slugMap[key] ??= {})[row.languageCode.toLowerCase()] = row.slug;
  }

  return { enabledLocales, defaultCode, byEntity, slugs: slugMap };
}

export function getBundleTranslations(
  bundle: TranslationBundle,
  entityType: string,
  entityId: string
): EntityTranslation[] {
  return bundle.byEntity[bundleKey(entityType, entityId)] ?? [];
}

export function resolveFromBundle(
  bundle: TranslationBundle,
  entityType: string,
  entityId: string,
  field: string,
  languageCode: string,
  legacyEntity?: Record<string, unknown>
): string {
  const ctx: TranslationContext = {
    translations: getBundleTranslations(bundle, entityType, entityId),
    legacyEntity,
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
  };
  return resolveTranslation(field, languageCode, ctx);
}

export function getLocalizedSlugFromBundle(
  bundle: TranslationBundle,
  entityType: string,
  entityId: string,
  languageCode: string,
  fallbackSlug?: string
): string {
  const slugs = bundle.slugs[bundleKey(entityType, entityId)];
  if (!slugs) return fallbackSlug ?? "";

  const normalized = languageCode.toLowerCase();
  if (slugs[normalized]) return slugs[normalized];

  for (const locale of bundle.enabledLocales) {
    const code = locale.code.toLowerCase();
    if (slugs[code]) return slugs[code];
  }

  return fallbackSlug ?? "";
}

export async function resolveEntityByLocalizedSlug(
  entityType: string,
  slug: string,
  languageCode: string
): Promise<{ entityId: string; slug: string } | null> {
  const row = await prisma.localizedSlug.findFirst({
    where: {
      entityType,
      slug,
      languageCode: languageCode.toLowerCase(),
    },
  });
  if (!row) return null;
  return { entityId: row.entityId, slug: row.slug };
}

export function buildPageBundleRefs(
  parentType: BlockParentType,
  parentId: string,
  blocks?: PageBlocks
): EntityRef[] {
  const refs: EntityRef[] = [{ entityType: parentType, entityId: parentId }];
  if (blocks?.length) {
    for (const blockEntityId of collectBlockEntityIds(blocks, parentType, parentId)) {
      refs.push({ entityType: BUILDER_BLOCK_ENTITY_TYPE, entityId: blockEntityId });
    }
  }
  return refs;
}

export function getBlockTranslationsFromBundle(
  bundle: TranslationBundle,
  blocks: PageBlocks,
  parentType: BlockParentType,
  parentId: string
): EntityTranslation[] {
  const rows: EntityTranslation[] = [];
  for (const blockEntityId of collectBlockEntityIds(blocks, parentType, parentId)) {
    rows.push(...getBundleTranslations(bundle, BUILDER_BLOCK_ENTITY_TYPE, blockEntityId));
  }
  return rows;
}

export async function loadPageTranslationBundle(
  parentType: BlockParentType,
  parentId: string,
  blocks?: PageBlocks
): Promise<TranslationBundle> {
  const refs = buildPageBundleRefs(parentType, parentId, blocks);
  const loader = createCached(
    () => loadTranslationBundle(refs),
    ["page-translation-bundle", parentType, parentId, String(refs.length)],
    {
      tags: [CACHE_TAGS.translations, CACHE_TAGS.entityTranslations(parentType, parentId)],
      revalidate: 60,
    }
  );
  return loader();
}
