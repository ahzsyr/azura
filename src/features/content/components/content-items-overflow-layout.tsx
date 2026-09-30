"use client";

import { ContentCard } from "@/components/content/content-card";
import type { ContentCardData } from "@/features/content/types";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import type { DisplaySettings } from "@/schemas/content/display-settings";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";
import type { ContentBlockRenderProps } from "@/features/content/types";
import { cn } from "@/lib/utils";

type Props = {
  items?: ContentCardData[];
  viewModels?: ContentPresetCardViewModel[];
  locale: string;
  displaySettings: DisplaySettings;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  compare?: ContentBlockRenderProps["compare"];
  previewDevice?: DeviceBreakpoint;
};

export function ContentItemsOverflowLayout({
  items,
  viewModels,
  locale,
  displaySettings,
  flags,
  compare,
  previewDevice,
}: Props) {
  const columns = displaySettings.columns;
  const gridClassName =
    displaySettings.layoutMode === "list"
      ? "grid gap-4 grid-cols-1"
      : cn(
          "grid gap-6",
          columns === 2 && "md:grid-cols-2",
          columns === 3 && "md:grid-cols-2 lg:grid-cols-3",
          columns === 4 && "md:grid-cols-2 lg:grid-cols-4",
        );

  if (viewModels != null && viewModels.length > 0) {
    const layoutProps = {
      items: viewModels,
      flags,
      columns,
      gridClassName,
      useSimpleSliderTrack: false,
      getItemKey: (vm: ContentPresetCardViewModel) => vm.entityId,
      renderItem: (vm: ContentPresetCardViewModel) => (
        <ContentCard
          viewModel={vm}
          item={{
            id: vm.entityId,
            contentTypeSlug: vm.contentTypeSlug,
            slug: vm.slug,
            title: vm.title,
            titleEn: vm.title,
            titleAr: vm.title,
            attributes: {},
            images: vm.imageUrl ? [{ url: vm.imageUrl, alt: vm.imageAlt }] : [],
            href: vm.href,
          }}
          locale={locale}
          display={vm.display}
        />
      ),
    };

    if (previewDevice) {
      return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
    }
    return <ResponsiveOverflowLayout {...layoutProps} />;
  }

  const listingItems = items ?? [];
  const layoutProps = {
    items: listingItems,
    flags,
    columns,
    gridClassName,
    useSimpleSliderTrack: false,
    getItemKey: (item: ContentCardData) => item.id,
    renderItem: (item: ContentCardData) => (
      <ContentCard item={item} locale={locale} display={displaySettings} compare={compare} />
    ),
  };

  if (previewDevice) {
    return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
  }
  return <ResponsiveOverflowLayout {...layoutProps} />;
}
