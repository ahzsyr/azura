import "server-only";

import { prisma } from "@/lib/prisma";
import type { ContentBlockConfig } from "@/features/content/types";
import { resolveViewModelsForContentList } from "@/resolvers/resolve-view-model";
import { loadComparePropsForContentType } from "@/features/comparison/load-compare-props";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import {
  resolveCardTemplateId,
  resolveContentTypeSlugForPreset,
  resolvePresetFromBlockProps,
  type ContentPresetId,
} from "@/templates/preset-template-map";
import type { ContentListBlockProps } from "@/features/content/schemas/content-list-block";
import { resolveFieldSchema } from "@/features/content/content-type.registry";

export async function resolveContentCardViewModelsForBlock(
  locale: string,
  props: ContentListBlockProps,
): Promise<ContentPresetCardViewModel[]> {
  const presetId = resolvePresetFromBlockProps({
    presetId: props.presetId,
    contentTypeSlug: props.contentTypeSlug,
  }) as ContentPresetId;

  const contentTypeSlug = props.contentTypeSlug?.trim() || resolveContentTypeSlugForPreset(presetId);
  const templateId = props.templateId ?? resolveCardTemplateId(presetId);
  const displaySettings = mergeDisplaySettings(props.displaySettings as Record<string, unknown>);

  const contentTypeRow = await prisma.contentType.findUnique({
    where: { slug: contentTypeSlug },
  });

  const compareProps = contentTypeRow
    ? loadComparePropsForContentType({
        slug: contentTypeRow.slug,
        fieldSchema: resolveFieldSchema(contentTypeRow, contentTypeRow.slug),
        adminConfig: contentTypeRow.adminConfig,
        locale,
      })
    : undefined;

  const config: ContentBlockConfig = {
    contentTypeSlug,
    collectionSlug: props.collectionSlug || undefined,
    featuredOnly: props.featuredOnly,
    manualIds: props.manualIds,
    limit: displaySettings.limit ?? props.limit,
    attributeFilters: props.attributeFilters,
  };

  return resolveViewModelsForContentList(presetId, templateId, config, {
    locale,
    localePrefix: locale,
    displaySettings,
    contentTypeSlug,
    compareProps: compareProps
      ? {
          contentTypeSlug: compareProps.contentTypeSlug,
          maxItems: compareProps.maxItems,
          label: compareProps.label,
        }
      : undefined,
  }) as Promise<ContentPresetCardViewModel[]>;
}
