"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { revalidateSearch } from "@/services/cache";
import { revalidateMarketingHome } from "@/services/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm, extractLegacyColumns } from "@/features/translation/form-sync";

function checkboxValue(raw: FormDataEntryValue | null): boolean {
  return raw === "true" || raw === "on" || raw === "1";
}

function optionalText(raw: FormDataEntryValue | null): string | null {
  const value = (raw as string | null)?.trim();
  return value || null;
}

function revalidateFaqPaths(slug?: string, faqSetId?: string) {
  revalidateMarketingHome();
  revalidatePath("/admin/faqs");
  revalidatePath("/admin/faqs/new");
  revalidatePath("/faq");
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
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  isPublished: boolean;
  faqSet: { slug: string; isPublished: boolean };
}) {
  if (!item.isPublished || !item.faqSet.isPublished) {
    await searchIndexer.remove("FAQ", item.id);
    return;
  }
  await searchIndexer.indexFaqItem(item, item.faqSet.slug);
}

export async function upsertFaqSet(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleLegacy = extractLegacyColumns(formData, enabledLocales, "title");
  const titleEn = titleLegacy.titleEn ?? (formData.get("titleEn") as string) ?? "";
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(slugInput, id)
    : await uniqueSlug(titleEn, id);

  const excerptLegacy = extractLegacyColumns(formData, enabledLocales, "excerpt");
  const descriptionLegacy = extractLegacyColumns(formData, enabledLocales, "description");

  const data = {
    slug,
    titleEn,
    titleAr: titleLegacy.titleAr ?? (formData.get("titleAr") as string) ?? "",
    excerptEn: optionalText(formData.get("excerptEn")) ?? excerptLegacy.excerptEn ?? null,
    excerptAr: optionalText(formData.get("excerptAr")) ?? excerptLegacy.excerptAr ?? null,
    descriptionEn:
      (formData.get("descriptionEn") as string) || descriptionLegacy.descriptionEn || "",
    descriptionAr:
      (formData.get("descriptionAr") as string) || descriptionLegacy.descriptionAr || "",
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const faqSet = id
    ? await prisma.faqSet.update({ where: { id }, data })
    : await prisma.faqSet.create({
        data: {
          ...data,
          sortOrder: data.sortOrder || (await prisma.faqSet.count()),
        },
      });

  await syncEntityTranslationsFromForm(formData, "FaqSet", faqSet.id, enabledLocales);

  revalidateFaqPaths(faqSet.slug, faqSet.id);
  return faqSet;
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

  const questionLegacy = extractLegacyColumns(formData, enabledLocales, "question");
  const answerLegacy = extractLegacyColumns(formData, enabledLocales, "answer");

  const data = {
    faqSetId,
    questionEn: questionLegacy.questionEn ?? (formData.get("questionEn") as string) ?? "",
    questionAr: questionLegacy.questionAr ?? (formData.get("questionAr") as string) ?? "",
    answerEn: answerLegacy.answerEn ?? (formData.get("answerEn") as string) ?? "",
    answerAr: answerLegacy.answerAr ?? (formData.get("answerAr") as string) ?? "",
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

  await syncEntityTranslationsFromForm(formData, "FaqItem", item.id, enabledLocales);

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
  return prisma.faqSet.findUnique({
    where: { id: faqSetId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function fetchFaqSetsForBuilder() {
  await requireAdmin();
  const rows = await prisma.faqSet.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      titleEn: true,
      titleAr: true,
      isPublished: true,
      _count: { select: { items: true } },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    isPublished: row.isPublished,
    itemCount: row._count.items,
  }));
}
