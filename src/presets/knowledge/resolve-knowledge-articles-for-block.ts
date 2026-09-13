import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entityService } from "@/features/entities/entity.service";
import { translationService } from "@/features/translation/translation.service";
import {
  mapKnowledgeEntityToCardViewModel,
} from "@/resolvers/knowledge/map-entity-to-card";
import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";
import type { ResolverContext } from "@/view-models/types";
import {
  resolveKnowledgeArticleCardTemplateId,
} from "@/templates/preset-template-map";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

export type KnowledgeCategoryView = {
  id: string;
  slug: string;
  title: string;
  articleCount: number;
};

export type KnowledgeBlockResolvedData = {
  knowledgeBaseSlug: string;
  knowledgeBaseTitle: string;
  categories: KnowledgeCategoryView[];
  articleViewModels: KnowledgeArticleCardViewModel[];
};

export type ResolveKnowledgeArticlesForBlockInput = {
  knowledgeBaseSlug: string;
  categorySlug?: string;
  limit?: number;
  presetId?: string;
  templateId?: string;
  basePath?: string;
};

async function resolveKnowledgeBaseTitle(
  knowledgeBaseId: string,
  locale: string,
): Promise<string> {
  const translations = await translationService.getForEntity("KnowledgeBase", knowledgeBaseId);
  const ctx = { translations };
  return (
    resolveTranslation("title", locale, ctx) ||
    resolveTranslation("title", DEFAULT_LOCALE_CODE, ctx) ||
    ""
  );
}

export async function resolveKnowledgeArticlesForBlock(
  input: ResolveKnowledgeArticlesForBlockInput,
  ctx: ResolverContext,
): Promise<KnowledgeBlockResolvedData | null> {
  const kbSlug = input.knowledgeBaseSlug.trim();
  if (!kbSlug) return null;

  const kb = await prisma.knowledgeBase.findFirst({
    where: { slug: kbSlug, isPublished: true },
    select: {
      id: true,
      slug: true,
      categories: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { articles: { where: { isPublished: true } } } },
        },
      },
    },
  });
  if (!kb) return null;

  const [articleRows] = await Promise.all([
    entityService.listEntities("knowledge", {
      knowledgeBaseSlug: kbSlug,
      collectionSlug: input.categorySlug || undefined,
      limit: input.limit && input.limit > 0 ? input.limit : undefined,
    }),
  ]);

  const categoryIds = kb.categories.map((c) => c.id);
  const categoryTranslationMap =
    categoryIds.length > 0
      ? await translationService.getForEntities("KnowledgeCategory", categoryIds)
      : new Map<string, EntityTranslation[]>();

  const categories: KnowledgeCategoryView[] = kb.categories.map((cat) => {
    const translations = categoryTranslationMap.get(cat.id) ?? [];
    const tctx = { translations };
    const title =
      resolveTranslation("title", ctx.locale, tctx) ||
      resolveTranslation("title", DEFAULT_LOCALE_CODE, tctx) ||
      cat.slug;
    return {
      id: cat.id,
      slug: cat.slug,
      title,
      articleCount: cat._count.articles,
    };
  });

  const articleIds = articleRows.map((row) => row.ref.id);
  const articleTranslationMap =
    articleIds.length > 0
      ? await translationService.getForEntities("KnowledgeArticle", articleIds)
      : new Map<string, EntityTranslation[]>();

  const templateId = input.templateId ?? resolveKnowledgeArticleCardTemplateId();
  const articleViewModels: KnowledgeArticleCardViewModel[] = [];

  for (const row of articleRows) {
    const entity = await entityService.getEntity("knowledge", row.ref.id, {
      locale: ctx.localePrefix,
      knowledgeBaseSlug: kbSlug,
    });
    if (!entity) continue;

    const vm = mapKnowledgeEntityToCardViewModel(
      {
        entity,
        itemTranslations: articleTranslationMap.get(row.ref.id) ?? [],
        knowledgeBaseSlug: kbSlug,
        basePath: input.basePath,
      },
      ctx,
    );
    if (templateId !== vm.templateId) continue;
    articleViewModels.push(vm);
  }

  const knowledgeBaseTitle = await resolveKnowledgeBaseTitle(kb.id, ctx.locale);

  return {
    knowledgeBaseSlug: kb.slug,
    knowledgeBaseTitle,
    categories,
    articleViewModels,
  };
}
