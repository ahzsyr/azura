import "server-only";

import type { Prisma, TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Composition, PageBlocks } from "@/types/builder";
import type { BlockParentType } from "@/features/translation/block-translation";
import { buildPageBundleRefs } from "@/features/translation/translation-bundle";
import { translationService } from "@/features/translation/translation.service";
import { compositionService } from "@/features/layout-engine/composition.service";
import type { PageAstDocument } from "@/features/cms/page-ast";
import type { EntityTranslationInput } from "@/features/translation/types";
import {
  getRevisionEditLocale,
  parseRevisionTranslationSnapshot,
  type RevisionTranslationSnapshotItem,
} from "@/features/cms/revision-translation-snapshot.shared";

export type { RevisionTranslationSnapshotItem };
export { getRevisionEditLocale, parseRevisionTranslationSnapshot };

export type CaptureRevisionTranslationsParams = {
  parentType: BlockParentType;
  parentId: string;
  /** Flat blocks, bare Composition, or persisted Page AST envelope. */
  blocksOrComposition?: PageBlocks | Composition | unknown;
};

async function resolveSeoMetaId(
  parentType: BlockParentType,
  parentId: string,
): Promise<string | null> {
  if (parentType === "CmsPage") {
    const row = await prisma.seoMeta.findUnique({
      where: { cmsPageId: parentId },
      select: { id: true },
    });
    return row?.id ?? null;
  }
  if (parentType === "Post") {
    const row = await prisma.seoMeta.findUnique({
      where: { postId: parentId },
      select: { id: true },
    });
    return row?.id ?? null;
  }
  const row = await prisma.seoMeta.findFirst({
    where: { entityType: "ContentItem", entityId: parentId },
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Fetch live EntityTranslation rows for parent fields, builder blocks, and SEO meta. */
export async function captureRevisionTranslations(
  params: CaptureRevisionTranslationsParams,
): Promise<RevisionTranslationSnapshotItem[]> {
  const refs = buildPageBundleRefs(
    params.parentType,
    params.parentId,
    params.blocksOrComposition,
  );
  const seoMetaId = await resolveSeoMetaId(params.parentType, params.parentId);
  if (seoMetaId) {
    refs.push({ entityType: "SeoMeta", entityId: seoMetaId });
  }

  if (refs.length === 0) return [];

  const rows = await prisma.entityTranslation.findMany({
    where: {
      OR: refs.map((ref) => ({
        entityType: ref.entityType,
        entityId: ref.entityId,
      })),
    },
  });

  return rows.map((row) => ({
    entityType: row.entityType,
    entityId: row.entityId,
    field: row.field,
    localeCode: row.localeCode,
    value: row.value,
    status: row.status,
  }));
}

/** Re-hydrate snapshot rows into the live EntityTranslation store. */
export async function rehydrateRevisionTranslations(snapshot: unknown): Promise<number> {
  const items = parseRevisionTranslationSnapshot(snapshot);
  if (items.length === 0) return 0;
  const inputs: EntityTranslationInput[] = items.map((item) => ({
    entityType: item.entityType,
    entityId: item.entityId,
    field: item.field,
    localeCode: item.localeCode,
    value: item.value,
    status: (item.status as TranslationStatus) || "PUBLISHED",
  }));
  await translationService.upsertMany(inputs);
  return inputs.length;
}

/** Persist composition with Page AST meta.locale (edit context label only). */
export function persistCompositionWithEditLocale(
  composition: Composition | undefined,
  blocks: PageBlocks,
  editingLocale?: string | null,
): { composition: Prisma.InputJsonValue; blocks: Prisma.InputJsonValue } {
  const document = compositionService.loadDocument({
    composition,
    blocks,
  });
  const locale = editingLocale?.trim() || document.meta?.locale;
  const nextMeta: PageAstDocument["meta"] = {
    ...document.meta,
    ...(locale ? { locale } : {}),
  };
  return compositionService.saveDocument({
    ...document,
    meta: nextMeta,
  });
}
