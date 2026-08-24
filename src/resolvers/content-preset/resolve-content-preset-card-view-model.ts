import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { getEntityTypeDefinition } from "@/features/entities/preset-registry";
import { EntityNotFoundError } from "@/resolvers/errors";
import {
  mapEntityToCardViewModel,
  type MapEntityToCardInput,
} from "@/resolvers/content-preset/map-entity-to-card";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import type { ResolverContext } from "@/view-models/types";
import {
  resolveContentTypeSlugForPreset,
  type ContentPresetId,
} from "@/templates/preset-template-map";
import { contentPublicService } from "@/features/content/content-public.service";

export async function resolveContentPresetCardViewModel(
  presetId: ContentPresetId,
  entityId: string,
  ctx: ResolverContext,
): Promise<ContentPresetCardViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity(presetId, key, { locale: ctx.localePrefix });
  if (!entity) {
    throw new EntityNotFoundError(presetId, key);
  }

  const contentTypeSlug = ctx.contentTypeSlug ?? resolveContentTypeSlugForPreset(presetId);
  const definition = getEntityTypeDefinition(presetId);
  const routePrefix = definition?.contentTypeSlug
    ? (await contentPublicService.getTypeBySlug(contentTypeSlug))?.routePrefix
    : null;

  let imageUrl = entity.thumbnailUrl;
  let imageAlt = entity.title;
  if (!imageUrl) {
    const view = await contentPublicService.getItemByTypeAndSlug(
      contentTypeSlug,
      entity.ref.slug,
    );
    if (view) {
      const cover = view.media.find((m) => m.isCover) ?? view.media[0];
      imageUrl = cover?.url ?? null;
      imageAlt = cover?.alt || entity.title;
    }
  }

  return mapEntityToCardViewModel(
    {
      entity,
      presetId,
      contentTypeSlug,
      routePrefix,
      imageUrl,
      imageAlt,
    },
    ctx,
  );
}

export function resolveContentPresetCardViewModelFromEntity(
  input: MapEntityToCardInput,
  ctx: ResolverContext,
): ContentPresetCardViewModel {
  return mapEntityToCardViewModel(input, ctx);
}
