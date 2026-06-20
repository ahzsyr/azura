import type { LocalizedValueMap } from "@/features/translation/types";

export type KnowledgeArticlePublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  excerpt: LocalizedValueMap;
  body?: LocalizedValueMap;
  categoryId: string | null;
  categorySlug: string | null;
  ratingSum: number;
  ratingCount: number;
};

export type KnowledgeCategoryPublic = {
  id: string;
  slug: string;
  parentId: string | null;
  title: LocalizedValueMap;
  articleCount?: number;
};

export type KnowledgeBasePublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  categories: KnowledgeCategoryPublic[];
  articles: KnowledgeArticlePublic[];
};

export type KnowledgeBaseAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  sortOrder: number;
  isPublished: boolean;
  categoryCount: number;
  articleCount: number;
};

export type KnowledgeBaseBlockInput = {
  knowledgeBaseSlug?: string;
  categorySlug?: string;
  limit?: number;
};
