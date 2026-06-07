"use client";

import { ContentCard } from "@/components/content/content-card";
import type { ContentCardData } from "@/features/content/types";
import type { DisplaySettings } from "@/schemas/content/display-settings";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";
import type { ContentBlockRenderProps } from "@/features/content/types";
import { cn } from "@/lib/utils";

type Props = {
  items: ContentCardData[];
  locale: string;
  displaySettings: DisplaySettings;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  compare?: ContentBlockRenderProps["compare"];
  previewDevice?: DeviceBreakpoint;
};

export function ContentItemsOverflowLayout({
  items,
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
          columns === 4 && "md:grid-cols-2 lg:grid-cols-4"
        );

  const layoutProps = {
    items,
    flags,
    columns,
    gridClassName,
    useSimpleSliderTrack: true,
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
