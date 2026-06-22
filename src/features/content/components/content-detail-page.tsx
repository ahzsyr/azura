import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import {
  resolveContentPresetDetailViewModel,
} from "@/resolvers/content-preset/resolve-content-preset-detail-view-model";
import { resolveEntityDetailViewModel } from "@/resolvers/entity/resolve-entity-detail-view-model";
import {
  isContentPresetId,
  resolvePresetFromContentTypeSlug,
} from "@/templates/preset-template-map";
import { ContentPresetDetailTemplate } from "@/templates/content-preset/content-preset-detail-template";
import { EntityDetailTemplate } from "@/templates/entity/entity-detail-template";

type Props = {
  locale: string;
  contentType: ContentTypeView;
  item: ContentItemView;
  path: string;
};

export async function ContentDetailPage({ locale, contentType, item, path }: Props) {
  const presetId = resolvePresetFromContentTypeSlug(contentType.slug);
  const usePreset = presetId != null && isContentPresetId(presetId);

  if (usePreset) {
    const viewModel = await resolveContentPresetDetailViewModel(
      presetId,
      item.slug ?? item.id,
      { locale, localePrefix: locale },
      {
        slug: item.slug ?? item.id,
        path,
        contentType,
        item,
      },
    );

    return <ContentPresetDetailTemplate viewModel={viewModel} />;
  }

  const viewModel = await resolveEntityDetailViewModel(
    { locale, localePrefix: locale },
    {
      slug: item.slug ?? item.id,
      path,
      contentType,
      item,
    },
  );

  return <EntityDetailTemplate viewModel={viewModel} />;
}
