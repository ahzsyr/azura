"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { revalidateSearch } from "@/services/cache";
import { revalidateMarketingHome } from "@/services/cache";
import { mediaRepository } from "@/repositories/media.repository";
import { loadTranslationsMap, localizedFieldValue, mergeCanonicalFields } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-sync";
import {
  syncEntityTranslationsFromForm,
  syncEntitySlugsFromForm,
} from "@/features/translation/form-sync.server";
import { translationService } from "@/features/translation/translation.service";

function checkboxValue(raw: FormDataEntryValue | null): boolean {
  return raw === "true" || raw === "on" || raw === "1";
}

function optionalText(raw: FormDataEntryValue | null): string | null {
  const value = (raw as string | null)?.trim();
  return value || null;
}

function isMissingCoverUrlColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    /coverUrl/i.test(message) &&
    (code === "P2022" ||
      /does not exist|Unknown column|no such column|column .* coverUrl/i.test(message))
  );
}

function isCoverUrlTooShort(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    /coverUrl/i.test(message) &&
    (code === "P2000" ||
      /Data too long|value too long|too long for column/i.test(message))
  );
}

/** Idempotent: add/widen FaqSet.coverUrl when a live DB is behind migrations. */
async function ensureFaqSetCoverUrlColumn(): Promise<boolean> {
  try {
    const url = process.env.DATABASE_URL ?? "";
    const isPostgres = /^postgres(ql)?:\/\//i.test(url);
    if (isPostgres) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "FaqSet" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT`
      );
    } else {
      const rows = await prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FaqSet' AND COLUMN_NAME = 'coverUrl'`
      );
      if (Number(rows[0]?.c ?? 0) === 0) {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`FaqSet\` ADD COLUMN \`coverUrl\` TEXT NULL`);
      } else {
        // Widen legacy VARCHAR(191) so long CDN URLs persist.
        await prisma.$executeRawUnsafe(`ALTER TABLE \`FaqSet\` MODIFY \`coverUrl\` TEXT NULL`);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export type UpsertFaqSetResult =
  | {
      ok: true;
      faqSet: {
        id: string;
        slug: string;
        coverUrl: string | null;
        isPublished: boolean;
        sortOrder: number;
      };
      wroteCoverUrl: boolean;
    }
  | { ok: false; error: string; code: string | null; step: string };

function revalidateFaqPaths(slug?: string, faqSetId?: string) {
  revalidateMarketingHome();
  revalidatePath("/admin/faqs");
  revalidatePath("/admin/faqs/new");
  if (faqSetId) revalidatePath(`/admin/faqs/${faqSetId}`);
  if (slug) revalidatePath(`/faq/${slug}`);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const slug = slugify(base) || "faq";
  let candidate = slug;
  let n = 1;
  while (true) {
    const existing = await prisma.faqSet.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}

async function indexFaqItem(item: {
  id: string;
  isPublished: boolean;
  faqSet: { slug: string; isPublished: boolean };
}) {
  if (!item.isPublished || !item.faqSet.isPublished) {
    await searchIndexer.remove("FAQ", item.id);
    return;
  }
  await searchIndexer.indexFaqSource({
    faq: { id: item.id, isPublished: item.isPublished },
    faqSetSlug: item.faqSet.slug,
  });
}

export async function upsertFaqSet(formData: FormData): Promise<UpsertFaqSetResult> {
  try {
    await requireAdmin();
    const enabledLocales = await localeService.listEnabled();
    const id = (formData.get("id") as string | null) || undefined;
    const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
    const slugInput = (formData.get("slug") as string | null)?.trim();
    const slug = slugInput
      ? await uniqueSlug(slugInput, id)
      : await uniqueSlug(titleForSlug, id);

    const coverUrl = optionalText(formData.get("coverUrl"));
    const baseData = {
      slug,
      isPublished: checkboxValue(formData.get("isPublished")),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    };

    let faqSet: {
      id: string;
      slug: string;
      coverUrl: string | null;
      isPublished: boolean;
      sortOrder: number;
    };
    let wroteCoverUrl = true;

    const writeWithCover = async () => {
      const data = { ...baseData, coverUrl };
      return id
        ? await prisma.faqSet.update({ where: { id }, data })
        : await prisma.faqSet.create({
            data: {
              ...data,
              sortOrder: data.sortOrder || (await prisma.faqSet.count()),
            },
          });
    };

    try {
      faqSet = await writeWithCover();
    } catch (writeError) {
      const canSelfHeal =
        isMissingCoverUrlColumn(writeError) || isCoverUrlTooShort(writeError);
      if (!canSelfHeal) {
        const message = writeError instanceof Error ? writeError.message : String(writeError);
        return {
          ok: false,
          error: message.slice(0, 800),
          code: (writeError as { code?: string })?.code ?? null,
          step: "prisma_write",
        };
      }

      // Live DB often lags Prisma migrations — add/widen coverUrl and retry once.
      const ensured = await ensureFaqSetCoverUrlColumn();
      if (ensured) {
        try {
          faqSet = await writeWithCover();
        } catch (retryError) {
          const message = retryError instanceof Error ? retryError.message : String(retryError);
          return {
            ok: false,
            error: message.slice(0, 800),
            code: (retryError as { code?: string })?.code ?? null,
            step: "prisma_write_cover_retry",
          };
        }
      } else if (isMissingCoverUrlColumn(writeError)) {
        wroteCoverUrl = false;
        const withoutCover = id
          ? await prisma.faqSet.update({
              where: { id },
              data: baseData,
              select: { id: true, slug: true, isPublished: true, sortOrder: true },
            })
          : await prisma.faqSet.create({
              data: {
                ...baseData,
                sortOrder: baseData.sortOrder || (await prisma.faqSet.count()),
              },
              select: { id: true, slug: true, isPublished: true, sortOrder: true },
            });
        faqSet = { ...withoutCover, coverUrl: null };
      } else {
        const message = writeError instanceof Error ? writeError.message : String(writeError);
        return {
          ok: false,
          error: message.slice(0, 800),
          code: (writeError as { code?: string })?.code ?? null,
          step: "prisma_write",
        };
      }
    }

    if (wroteCoverUrl && coverUrl) {
      const coverMediaId = (formData.get("coverMediaAssetId") as string | null) || null;
      const trackedId =
        coverMediaId ?? (await mediaRepository.findByUrl(coverUrl))?.id ?? null;
      if (trackedId) {
        try {
          await mediaRepository.trackUsage(trackedId, "FAQ_SET", faqSet.id, "coverUrl");
        } catch {
          // Non-fatal: set save succeeded; media usage tracking can fail independently.
        }
      }
    }

    await syncEntityTranslationsFromForm(formData, "FaqSet", faqSet.id, enabledLocales);
    await syncEntitySlugsFromForm(formData, "FaqSet", faqSet.id, faqSet.slug, enabledLocales);

    revalidateFaqPaths(faqSet.slug, faqSet.id);
    return { ok: true, faqSet, wroteCoverUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string })?.code ?? null;
    return { ok: false, error: message.slice(0, 800), code, step: "outer" };
  }
}

export async function patchFaqSetFromForm(
  id: string,
  baseline: Record<string, string>,
  current: Record<string, string>,
) {
  const { patchFaqSetFromForm: patchImpl } = await import(
    "@/features/portal/lib/entity-patch.server"
  );
  return patchImpl(id, baseline, current);
}

export async function deleteFaqSet(id: string) {
  await requireAdmin();
  const faqSet = await prisma.faqSet.findUnique({
    where: { id },
    select: { slug: true, items: { select: { id: true } } },
  });
  await prisma.faqSet.delete({ where: { id } });
  if (faqSet) {
    for (const item of faqSet.items) {
      await searchIndexer.remove("FAQ", item.id);
    }
    revalidateSearch();
  }
  revalidateFaqPaths(faqSet?.slug, id);
}

export async function reorderFaqSets(ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((id, index) => prisma.faqSet.update({ where: { id }, data: { sortOrder: index } }))
  );
  revalidateFaqPaths();
}

export async function toggleFaqSetPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const faqSet = await prisma.faqSet.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true, items: { select: { id: true } } },
  });
  const fullItems = await prisma.faqItem.findMany({
    where: { faqSetId: id },
    include: { faqSet: { select: { slug: true, isPublished: true } } },
  });
  for (const item of fullItems) {
    await indexFaqItem(item);
  }
  revalidateSearch();
  revalidateFaqPaths(faqSet.slug, id);
}

export async function upsertFaqItem(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const faqSetId = formData.get("faqSetId") as string;

  const data = {
    faqSetId,
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const item = id
    ? await prisma.faqItem.update({
        where: { id },
        data,
        include: { faqSet: { select: { slug: true, isPublished: true } } },
      })
    : await prisma.faqItem.create({
        data: {
          ...data,
          sortOrder: data.sortOrder || (await prisma.faqItem.count({ where: { faqSetId } })),
        },
        include: { faqSet: { select: { slug: true, isPublished: true } } },
      });

  await syncEntityTranslationsFromForm(formData, "FaqItem", item.id, enabledLocales, [
    "question",
    "answer",
  ]);

  await indexFaqItem(item);
  revalidateSearch();
  revalidateFaqPaths(item.faqSet.slug, faqSetId);
  return item;
}

export async function deleteFaqItem(id: string) {
  await requireAdmin();
  const item = await prisma.faqItem.findUnique({
    where: { id },
    select: { faqSetId: true, faqSet: { select: { slug: true } } },
  });
  await prisma.faqItem.delete({ where: { id } });
  await searchIndexer.remove("FAQ", id);
  revalidateSearch();
  revalidateFaqPaths(item?.faqSet.slug, item?.faqSetId);
}

export async function reorderFaqItems(faqSetId: string, ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.faqItem.update({
        where: { id, faqSetId },
        data: { sortOrder: index },
      })
    )
  );
  const faqSet = await prisma.faqSet.findUnique({
    where: { id: faqSetId },
    select: { slug: true },
  });
  revalidateFaqPaths(faqSet?.slug, faqSetId);
}

export async function toggleFaqItemPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const item = await prisma.faqItem.update({
    where: { id },
    data: { isPublished },
    include: { faqSet: { select: { slug: true, isPublished: true } } },
  });
  await indexFaqItem(item);
  revalidateSearch();
  revalidateFaqPaths(item.faqSet.slug, item.faqSetId);
}

export async function fetchFaqSetWithItems(faqSetId: string) {
  await requireAdmin();

  type FaqSetRow = {
    id: string;
    slug: string;
    coverUrl: string | null;
    sortOrder: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      faqSetId: string;
      sortOrder: number;
      isPublished: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };

  let faqSet: FaqSetRow | null;
  try {
    faqSet = await prisma.faqSet.findUnique({
      where: { id: faqSetId },
      select: {
        id: true,
        slug: true,
        coverUrl: true,
        sortOrder: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
  } catch (error) {
    if (!isMissingCoverUrlColumn(error)) throw error;
    const row = await prisma.faqSet.findUnique({
      where: { id: faqSetId },
      select: {
        id: true,
        slug: true,
        sortOrder: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    faqSet = row ? { ...row, coverUrl: null } : null;
  }

  if (!faqSet) return null;

  const [setTranslations, itemTranslationMap] = await Promise.all([
    translationService.getForEntity("FaqSet", faqSetId),
    loadTranslationsMap(
      "FaqItem",
      faqSet.items.map((item) => item.id)
    ),
  ]);
  const setCanonical = mergeCanonicalFields(setTranslations, ["title", "subtitle", "excerpt", "description"]);
  const setCtx = { translations: setTranslations };

  return {
    ...faqSet,
    titleEn: setCanonical.title ?? "",
    titleAr: resolveTranslation("title", "ar", setCtx),
    excerptEn: setCanonical.excerpt || setCanonical.subtitle || null,
    excerptAr:
      resolveTranslation("excerpt", "ar", setCtx) ||
      resolveTranslation("subtitle", "ar", setCtx) ||
      null,
    descriptionEn: setCanonical.description ?? "",
    descriptionAr: resolveTranslation("description", "ar", setCtx),
    translations: setTranslations,
    items: faqSet.items.map((item) => {
      const rows = itemTranslationMap.get(item.id) ?? [];
      const qaCanonical = mergeCanonicalFields(rows, ["question", "answer"]);
      const qaCtx = { translations: rows };
      return {
        ...item,
        questionEn: qaCanonical.question ?? "",
        questionAr: resolveTranslation("question", "ar", qaCtx),
        answerEn: qaCanonical.answer ?? "",
        answerAr: resolveTranslation("answer", "ar", qaCtx),
      };
    }),
  };
}

export async function fetchFaqSetsForBuilder() {
  await requireAdmin();
  const rows = await prisma.faqSet.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      _count: { select: { items: true } },
    },
  });
  const translations = await loadTranslationsMap(
    "FaqSet",
    rows.map((row) => row.id)
  );
  return rows.map((row) => {
    const rowTranslations = translations.get(row.id) ?? [];
    const ctx = { translations: rowTranslations };
    return {
      slug: row.slug,
      isPublished: row.isPublished,
      itemCount: row._count.items,
      titleEn: localizedFieldValue(rowTranslations, "title"),
      titleAr: resolveTranslation("title", "ar", ctx),
    };
  });
}
