import type { KnowledgeArticleCardTemplateId } from "@/view-models/types";

/** Flattened knowledge article card — no raw Prisma rows. */
export type KnowledgeArticleCardViewModel = {
  templateId: KnowledgeArticleCardTemplateId;
  presetId: "knowledge";
  entityId: string;
  slug: string;
  knowledgeBaseSlug: string;
  title: string;
  excerpt: string;
  href: string;
  categorySlug: string | null;
  ratingAverage: number | null;
  ratingCount: number;
};
