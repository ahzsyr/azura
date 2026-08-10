import type { KnowledgeArticle, KnowledgeBase, KnowledgeCategory } from "@prisma/client";
import {
  legacyShapeFromBundle,
  loadBundleForRefs,
  type EntityRef,
  type TranslationBundle,
} from "@/features/portal/lib/portal-translation";

export type KnowledgeBaseFormDrafts = {
  baseLegacy: Record<string, string>;
  categories: Record<string, unknown>[];
  articles: Record<string, unknown>[];
};

function collectKnowledgeBaseRefs(
  base: KnowledgeBase & { categories: KnowledgeCategory[]; articles: KnowledgeArticle[] }
): EntityRef[] {
  return [
    { entityType: "KnowledgeBase", entityId: base.id },
    ...base.categories.map((category) => ({
      entityType: "KnowledgeCategory",
      entityId: category.id,
    })),
    ...base.articles.map((article) => ({ entityType: "KnowledgeArticle", entityId: article.id })),
  ];
}

export async function loadKnowledgeBaseFormDrafts(
  base: KnowledgeBase & { categories: KnowledgeCategory[]; articles: KnowledgeArticle[] }
): Promise<KnowledgeBaseFormDrafts> {
  const bundle = await loadBundleForRefs(collectKnowledgeBaseRefs(base));
  return buildKnowledgeBaseFormDrafts(base, bundle);
}

export function buildKnowledgeBaseFormDrafts(
  base: KnowledgeBase & { categories: KnowledgeCategory[]; articles: KnowledgeArticle[] },
  bundle: TranslationBundle
): KnowledgeBaseFormDrafts {
  return {
    baseLegacy: legacyShapeFromBundle(bundle, "KnowledgeBase", base.id, ["title", "description"]),
    categories: base.categories.map((category) => ({
      id: category.id,
      parentId: category.parentId ?? "",
      slug: category.slug,
      isPublished: category.isPublished,
      sortOrder: category.sortOrder,
      ...legacyShapeFromBundle(bundle, "KnowledgeCategory", category.id, ["title"]),
    })),
    articles: base.articles.map((article) => ({
      id: article.id,
      categoryId: article.categoryId ?? "",
      slug: article.slug,
      isPublished: article.isPublished,
      sortOrder: article.sortOrder,
      ...legacyShapeFromBundle(bundle, "KnowledgeArticle", article.id, ["title", "excerpt", "body"]),
    })),
  };
}
