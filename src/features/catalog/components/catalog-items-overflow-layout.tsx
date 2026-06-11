"use client";

import type { Locale } from "@/i18n/routing";
import { CatalogCard } from "@/components/catalog/catalog-card";
import type { CatalogCardData } from "@/features/catalog/types";
import type { DisplaySettings } from "@/schemas/catalog/display-settings";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";
import type { CompareCardProps } from "@/features/comparison/get-compare-props";

type Props = {
  items: CatalogCardData[];
  locale: Locale;
  displaySettings: DisplaySettings;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewMode?: boolean;
  compare?: CompareCardProps;
  previewDevice?: DeviceBreakpoint;
};

const colClass = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
} as const;

export function CatalogItemsOverflowLayout({
  items,
  locale,
  displaySettings,
  flags,
  previewMode,
  compare,
  previewDevice,
}: Props) {
  const columns = displaySettings.columns;
  const layoutProps = {
    items,
    flags,
    columns,
    gridClassName: colClass[columns],
    useSimpleSliderTrack: true,
    getItemKey: (item: CatalogCardData) => item.id,
    renderItem: (item: CatalogCardData) => (
      <CatalogCard
        item={item}
        locale={locale}
        displaySettings={displaySettings}
        linkMode={previewMode ? "locale-path" : "i18n"}
        compare={compare}
      />
    ),
  };

  if (previewDevice) {
    return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
  }
  return <ResponsiveOverflowLayout {...layoutProps} />;
}
