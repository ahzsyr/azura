import type { KnowledgeArticleDetailTemplateId } from "@/view-models/types";

/** Flattened knowledge article detail — Versioning Capability hooks in Phase 6. */
export type KnowledgeArticleDetailViewModel = {
  templateId: KnowledgeArticleDetailTemplateId;
  presetId: "knowledge";
  entityId: string;
  slug: string;
  knowledgeBaseSlug: string;
  title: string;
  excerpt: string;
  body: string;
  href: string;
  categorySlug: string | null;
  ratingAverage: number | null;
  ratingCount: number;
};
