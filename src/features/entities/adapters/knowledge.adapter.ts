import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { knowledgeRepository } from "@/repositories/knowledge.repository";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityRecord,
} from "@/features/entities/types";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";

const PRESET_ID = "knowledge" as const;
const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

type ArticleRow = {
  id: string;
  slug: string;
  knowledgeBaseId: string;
  categoryId: string | null;
  ratingSum: number;
  ratingCount: number;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
  category?: { slug: string } | null;
  knowledgeBase?: { slug: string; isPublished?: boolean } | null;
};

function looksLikeArticleId(value: string): boolean {
  return CUID_PATTERN.test(value.trim());
}

function resolveTitle(translations: EntityTranslation[], fallback: string): string {
  const ctx = { translations };
  return (
    resolveTranslation("title", "en", ctx) ||
    resolveTranslation("title", "ar", ctx) ||
    fallback
  );
}

function resolveExcerpt(translations: EntityTranslation[], fallback = ""): string {
  const ctx = { translations };
  return (
    resolveTranslation("excerpt", "en", ctx) ||
    resolveTranslation("excerpt", "ar", ctx) ||
    fallback
  );
}

function mapArticleToListRow(
  article: ArticleRow,
  _kbSlug: string,
  translations: EntityTranslation[],
): EntityListRow {
  const title = resolveTitle(translations, article.slug);
  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: article.id,
      slug: article.slug,
    },
    title,
    status: article.isPublished ? "PUBLISHED" : "DRAFT",
    collectionSlug: article.category?.slug ?? null,
    updatedAt: article.updatedAt,
  };
}

function mapArticleToRecord(
  article: ArticleRow,
  kbSlug: string,
  translations: EntityTranslation[],
): EntityRecord {
  const title = resolveTitle(translations, article.slug);
  const excerpt = resolveExcerpt(translations);
  const ctx = { translations };
  const body =
    resolveTranslation("body", "en", ctx) || resolveTranslation("body", "ar", ctx) || "";

  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: article.id,
      slug: article.slug,
    },
    title,
    titleEn: resolveTranslation("title", "en", ctx) || undefined,
    titleAr: resolveTranslation("title", "ar", ctx) || undefined,
    excerpt,
    status: article.isPublished ? "PUBLISHED" : "DRAFT",
    collectionSlug: article.category?.slug ?? null,
    updatedAt: article.updatedAt,
    fields: {
      body,
      knowledgeBaseSlug: kbSlug,
      knowledgeBaseId: article.knowledgeBaseId,
      categoryId: article.categoryId,
      categorySlug: article.category?.slug ?? null,
      ratingSum: article.ratingSum,
      ratingCount: article.ratingCount,
    },
  };
}

async function resolveKnowledgeBase(
  slug: string | undefined,
  publishedOnly: boolean,
): Promise<{ id: string; slug: string } | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  const row = await knowledgeRepository.findKnowledgeBase(trimmed, publishedOnly);
  return row;
}

export function createKnowledgeAdapter(): EntityStorageAdapter {
  return {
    async list(options?: EntityListOptions): Promise<EntityListRow[]> {
      const kb = await resolveKnowledgeBase(options?.knowledgeBaseSlug, !options?.includeDeleted);
      if (!kb) return [];

      const articles = await knowledgeRepository.findArticles({
        knowledgeBaseId: kb.id,
        publishedOnly: !options?.includeDeleted,
        collectionSlug: options?.collectionSlug,
        limit: options?.limit,
      });

      const ids = articles.map((a) => a.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("KnowledgeArticle", ids)
          : new Map<string, EntityTranslation[]>();

      const rows = articles.map((article) =>
        mapArticleToListRow(
          article,
          kb.slug,
          translationMap.get(article.id) ?? [],
        ),
      );

      return rows;
    },

    async get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null> {
      const key = idOrSlug.trim();
      if (!key) return null;

      const publishedOnly = !options?.includeDeleted;

      let article: ArticleRow | null = null;
      let kbSlug = options?.knowledgeBaseSlug?.trim() ?? "";

      if (looksLikeArticleId(key)) {
        article = await knowledgeRepository.findArticleById(key);
        if (article?.knowledgeBase) {
          if (publishedOnly && (!article.isPublished || !article.knowledgeBase.isPublished)) {
            return null;
          }
          kbSlug = article.knowledgeBase.slug;
        }
      } else if (kbSlug) {
        const kb = await resolveKnowledgeBase(kbSlug, publishedOnly);
        if (!kb) return null;
        article = await knowledgeRepository.findArticleBySlug({
          knowledgeBaseId: kb.id,
          slug: key,
          publishedOnly,
        });
      } else {
        article = await knowledgeRepository.findArticleBySlugGlobal(key, publishedOnly);
        if (article?.knowledgeBase) {
          kbSlug = article.knowledgeBase.slug;
        }
      }

      if (!article || !kbSlug) return null;

      const translations = await translationService.getForEntity("KnowledgeArticle", article.id);
      return mapArticleToRecord(article, kbSlug, translations);
    },

    async listCollections(options?: EntityListOptions): Promise<Collection[]> {
      const kb = await resolveKnowledgeBase(options?.knowledgeBaseSlug, !options?.includeDeleted);
      if (!kb) return [];

      const categories = await knowledgeRepository.findCategories(
        kb.id,
        !options?.includeDeleted,
      );

      const ids = categories.map((c) => c.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("KnowledgeCategory", ids)
          : new Map<string, EntityTranslation[]>();

      return categories.map((category, index) => {
        const translations = translationMap.get(category.id) ?? [];
        const title = resolveTitle(translations, category.slug);
        return {
          id: category.id,
          slug: category.slug,
          title,
          presetId: PRESET_ID,
          sortOrder: category.sortOrder ?? index,
        };
      });
    },
  };
}
