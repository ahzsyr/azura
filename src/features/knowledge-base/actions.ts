"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { revalidateMarketingHome } from "@/services/cache";
import { prisma } from "@/lib/prisma";

const ADMIN_BASE = "/admin/knowledge-base";

function revalidateKnowledgeBasePaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/knowledge/${slug}`);
}

export async function upsertKnowledgeBase(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || undefined;
  const titleEn = (formData.get("titleEn") as string) ?? "";
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.knowledgeBase, slugInput, id, "knowledge")
    : await uniqueSlug(prisma.knowledgeBase, titleEn, id, "knowledge");

  const data = {
    slug,
    titleEn,
    titleAr: (formData.get("titleAr") as string) ?? "",
    descriptionEn: (formData.get("descriptionEn") as string) || "",
    descriptionAr: (formData.get("descriptionAr") as string) || "",
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const knowledgeBase =
    id != null
      ? await prisma.knowledgeBase.update({ where: { id }, data })
      : await prisma.knowledgeBase.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.knowledgeBase.count()),
          },
        });

  const categories = parseChildrenJson(formData.get("categoriesJson"));
  const articles = parseChildrenJson(formData.get("articlesJson"));
  const keptCategoryIds = new Set<string>();
  const keptArticleIds = new Set<string>();

  for (let i = 0; i < categories.length; i++) {
    const row = categories[i];
    const categoryId = str(row.id);
    const categoryData = {
      knowledgeBaseId: knowledgeBase.id,
      parentId: str(row.parentId) || null,
      slug: str(row.slug, `category-${i + 1}`),
      titleEn: str(row.titleEn),
      titleAr: str(row.titleAr),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (categoryId) {
      await prisma.knowledgeCategory.update({ where: { id: categoryId }, data: categoryData });
      keptCategoryIds.add(categoryId);
    } else {
      const created = await prisma.knowledgeCategory.create({ data: categoryData });
      keptCategoryIds.add(created.id);
    }
  }
  await prisma.knowledgeCategory.deleteMany({
    where: { knowledgeBaseId: knowledgeBase.id, id: { notIn: [...keptCategoryIds] } },
  });

  for (let i = 0; i < articles.length; i++) {
    const row = articles[i];
    const articleId = str(row.id);
    const articleData = {
      knowledgeBaseId: knowledgeBase.id,
      categoryId: str(row.categoryId) || null,
      slug: str(row.slug, `article-${i + 1}`),
      titleEn: str(row.titleEn),
      titleAr: str(row.titleAr),
      excerptEn: str(row.excerptEn),
      excerptAr: str(row.excerptAr),
      bodyEn: str(row.bodyEn),
      bodyAr: str(row.bodyAr),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (articleId) {
      await prisma.knowledgeArticle.update({ where: { id: articleId }, data: articleData });
      keptArticleIds.add(articleId);
    } else {
      const created = await prisma.knowledgeArticle.create({ data: articleData });
      keptArticleIds.add(created.id);
    }
  }
  await prisma.knowledgeArticle.deleteMany({
    where: { knowledgeBaseId: knowledgeBase.id, id: { notIn: [...keptArticleIds] } },
  });

  revalidateKnowledgeBasePaths(knowledgeBase.slug, knowledgeBase.id);
  return knowledgeBase;
}

export async function deleteKnowledgeBase(id: string) {
  await requireAdmin();
  const row = await prisma.knowledgeBase.findUnique({ where: { id }, select: { slug: true } });
  await prisma.knowledgeBase.delete({ where: { id } });
  revalidateKnowledgeBasePaths(row?.slug, id);
}

export async function toggleKnowledgeBasePublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.knowledgeBase.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateKnowledgeBasePaths(row.slug, id);
}
