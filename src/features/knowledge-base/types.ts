export type KnowledgeArticlePublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  bodyEn?: string;
  bodyAr?: string;
  categoryId: string | null;
  categorySlug: string | null;
  ratingSum: number;
  ratingCount: number;
};

export type KnowledgeCategoryPublic = {
  id: string;
  slug: string;
  parentId: string | null;
  titleEn: string;
  titleAr: string;
  articleCount?: number;
};

export type KnowledgeBasePublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categories: KnowledgeCategoryPublic[];
  articles: KnowledgeArticlePublic[];
};

export type KnowledgeBaseAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
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
