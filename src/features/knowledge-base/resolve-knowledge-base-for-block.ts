import type { KnowledgeBaseBlockInput, KnowledgeBasePublic } from "./types";
import { getKnowledgeBaseBySlugCached } from "@/services/data-loaders";

export async function resolveKnowledgeBaseForBlock(
  props: KnowledgeBaseBlockInput
): Promise<KnowledgeBasePublic | null> {
  const slug = (props.knowledgeBaseSlug ?? "").trim();
  if (!slug) return null;
  return getKnowledgeBaseBySlugCached(slug, props.categorySlug, props.limit);
}
