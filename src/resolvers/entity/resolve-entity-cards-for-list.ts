import "server-only";

import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import {
  loadEntityTranslationsMap,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import { mapContentItemToEntityCard } from "@/resolvers/entity/map-content-item-to-entity-card";
import type { EntityCardViewModel } from "@/view-models/entity-card";
import type { ResolverContext } from "@/view-models/types";

export async function resolveEntityCardsForList(
  items: ContentItemView[],
  contentType: ContentTypeView,
  ctx: ResolverContext,
): Promise<EntityCardViewModel[]> {
  if (items.length === 0) return [];

  const localeCtx = await loadPublicLocaleContext(ctx.locale);
  const itemTranslationMap = await loadEntityTranslationsMap(
    "ContentItem",
    items.map((item) => item.id),
  );
  const collectionIds = items
    .map((item) => item.collection?.id)
    .filter((id): id is string => Boolean(id));
  const collectionTranslationMap = await loadEntityTranslationsMap(
    "ContentCollection",
    collectionIds,
  );

  const display = mergeDisplaySettings(
    (ctx.displaySettings as Record<string, unknown> | undefined) ??
      (contentType.adminConfig.displayDefaults as Record<string, unknown> | undefined),
  );

  return items.map((item) =>
    mapContentItemToEntityCard(
      {
        item,
        contentType,
        itemTranslations: itemTranslationMap.get(item.id) ?? [],
        collectionTranslations: item.collection
          ? collectionTranslationMap.get(item.collection.id)
          : undefined,
        enabledLocales: localeCtx.enabledLocales,
        defaultCode: localeCtx.defaultCode,
      },
      { ...ctx, displaySettings: display, contentTypeSlug: contentType.slug },
    ),
  );
}
