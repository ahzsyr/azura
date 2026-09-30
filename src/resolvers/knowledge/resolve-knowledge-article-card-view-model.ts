import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { EntityNotFoundError } from "@/resolvers/errors";
import {
  mapKnowledgeEntityToCardViewModel,
  type MapKnowledgeEntityInput,
} from "@/resolvers/knowledge/map-entity-to-card";
import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";
import type { ResolverContext } from "@/view-models/types";
import { translationService } from "@/features/translation/translation.service";

export async function resolveKnowledgeArticleCardViewModel(
  entityId: string,
  ctx: ResolverContext,
  options?: { knowledgeBaseSlug?: string; basePath?: string },
): Promise<KnowledgeArticleCardViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity("knowledge", key, {
    locale: ctx.localePrefix,
    knowledgeBaseSlug: options?.knowledgeBaseSlug,
  });
  if (!entity) {
    throw new EntityNotFoundError("knowledge", key);
  }

  const translations = await translationService.getForEntity("KnowledgeArticle", entity.ref.id);
  const kbSlug =
    options?.knowledgeBaseSlug ??
    (typeof entity.fields.knowledgeBaseSlug === "string"
      ? entity.fields.knowledgeBaseSlug
      : "");

  return mapKnowledgeEntityToCardViewModel(
    {
      entity,
      itemTranslations: translations,
      knowledgeBaseSlug: kbSlug,
      basePath: options?.basePath,
    },
    ctx,
  );
}

export function resolveKnowledgeArticleCardViewModelFromEntity(
  input: MapKnowledgeEntityInput,
  ctx: ResolverContext,
): KnowledgeArticleCardViewModel {
  return mapKnowledgeEntityToCardViewModel(input, ctx);
}
