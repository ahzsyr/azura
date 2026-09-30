export { KNOWLEDGE_PRESET_ID, getKnowledgePresetDefinition } from "@/presets/knowledge/manifest";
export {
  resolveKnowledgeArticlesForBlock,
  type KnowledgeBlockResolvedData,
  type KnowledgeCategoryView,
  type ResolveKnowledgeArticlesForBlockInput,
} from "@/presets/knowledge/resolve-knowledge-articles-for-block";
export { knowledgeBaseService } from "@/presets/knowledge/service";
export type {
  KnowledgeArticlePublic,
  KnowledgeBaseAdmin,
  KnowledgeBaseBlockInput,
  KnowledgeBasePublic,
  KnowledgeCategoryPublic,
} from "@/presets/knowledge/types";
