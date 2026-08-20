import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import { getLocalizedField } from "@/lib/utils";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import type { EntityCardViewModel } from "@/view-models/entity-card";
import type { ResolverContext } from "@/view-models/types";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";

export type MapContentItemToEntityCardInput = {
  item: ContentItemView;
  contentType: ContentTypeView;
  itemTranslations?: EntityTranslation[];
  collectionTranslations?: EntityTranslation[];
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
};

export function mapContentItemToEntityCard(
  input: MapContentItemToEntityCardInput,
  ctx: ResolverContext,
): EntityCardViewModel {
  const fieldOpts = {
    translations: input.itemTranslations ?? [],
    enabledLocales: input.enabledLocales,
    defaultCode: input.defaultCode,
  };

  const title = getLocalizedField(input.item, "title", ctx.locale, fieldOpts);
  const excerpt = getLocalizedField(input.item, "excerpt", ctx.locale, fieldOpts);
  const cover = input.item.media.find((m) => m.isCover) ?? input.item.media[0];
  const display = mergeDisplaySettings(
    (ctx.displaySettings as Record<string, unknown> | undefined) ??
      (input.contentType.adminConfig.displayDefaults as Record<string, unknown> | undefined),
  );

  const collectionLabel = input.item.collection
    ? getLocalizedField(input.item.collection, "name", ctx.locale, {
        ...fieldOpts,
        translations: input.collectionTranslations ?? [],
      })
    : null;

  return {
    templateId: "entity-card",
    entityId: input.item.id,
    slug: input.item.slug ?? input.item.id,
    contentTypeSlug: input.contentType.slug,
    title,
    excerpt,
    href: input.item.href,
    imageUrl: cover?.url ?? null,
    imageAlt: cover?.alt || title,
    isFeatured: input.item.isFeatured,
    collectionLabel,
    display,
  };
}
