"use client";

import type { ProductCardViewModel } from "@/view-models/product-card";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";
import { gridClassNameForColumns } from "@/features/builder/blocks/commerce/lib/block-grid-classes";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";

type BaseLayoutProps = {
  localePrefix: string;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
  columns?: 2 | 3 | 4;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
};

type Props = BaseLayoutProps & {
  products?: ProductListingRecord[];
  viewModels?: ProductCardViewModel[];
};

export function ProductRecordsOverflowLayout({
  products,
  viewModels,
  localePrefix,
  flags,
  previewDevice,
  columns = 3,
  autoplay,
  autoplayIntervalMs,
}: Props) {
  const gridClassName = gridClassNameForColumns(columns);
  const sliderItemClassName = "pl-block-slider-item";

  if (viewModels != null && viewModels.length > 0) {
    const layoutProps = {
      items: viewModels,
      flags,
      columns,
      autoplay,
      autoplayIntervalMs,
      getItemKey: (vm: ProductCardViewModel) => vm.slug,
      renderItem: (vm: ProductCardViewModel) => (
        <ProductListingCard viewModel={vm} href={vm.href} product={vm.product} />
      ),
      gridClassName,
      sliderItemClassName,
    };

    if (previewDevice) {
      return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
    }
    return <ResponsiveOverflowLayout {...layoutProps} />;
  }

  const numberLocale = getNumberLocale(localePrefix);
  const listingProducts = products ?? [];
  const layoutProps = {
    items: listingProducts,
    flags,
    columns,
    autoplay,
    autoplayIntervalMs,
    getItemKey: (p: ProductListingRecord) => p.slug,
    renderItem: (p: ProductListingRecord) => (
      <ProductListingCard
        product={p}
        href={`/${localePrefix}/products/${p.slug}`}
        localePrefix={localePrefix}
        numberLocale={numberLocale}
      />
    ),
    gridClassName,
    sliderItemClassName,
  };

  if (previewDevice) {
    return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
  }
  return <ResponsiveOverflowLayout {...layoutProps} />;
}
