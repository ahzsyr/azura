import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { EntityNotFoundError } from "@/resolvers/errors";
import {
  mapKnowledgeEntityToDetailViewModel,
  type MapKnowledgeEntityInput,
} from "@/resolvers/knowledge/map-entity-to-card";
import type { KnowledgeArticleDetailViewModel } from "@/view-models/knowledge-article-detail";
import type { ResolverContext } from "@/view-models/types";
import { translationService } from "@/features/translation/translation.service";

export type ResolveKnowledgeArticleDetailInput = {
  knowledgeBaseSlug?: string;
  basePath?: string;
};

export async function resolveKnowledgeArticleDetailViewModel(
  entityId: string,
  ctx: ResolverContext,
  input?: ResolveKnowledgeArticleDetailInput,
): Promise<KnowledgeArticleDetailViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity("knowledge", key, {
    locale: ctx.localePrefix,
    knowledgeBaseSlug: input?.knowledgeBaseSlug,
  });
  if (!entity) {
    throw new EntityNotFoundError("knowledge", key);
  }

  const translations = await translationService.getForEntity("KnowledgeArticle", entity.ref.id);
  const kbSlug =
    input?.knowledgeBaseSlug ??
    (typeof entity.fields.knowledgeBaseSlug === "string"
      ? entity.fields.knowledgeBaseSlug
      : "");

  return mapKnowledgeEntityToDetailViewModel(
    {
      entity,
      itemTranslations: translations,
      knowledgeBaseSlug: kbSlug,
      basePath: input?.basePath,
    },
    ctx,
  );
}

export function resolveKnowledgeArticleDetailViewModelFromEntity(
  input: MapKnowledgeEntityInput,
  ctx: ResolverContext,
): KnowledgeArticleDetailViewModel {
  return mapKnowledgeEntityToDetailViewModel(input, ctx);
}
