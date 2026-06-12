"use client";

import type { ProductListingRecord } from "@/features/products/listing/types";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";

type Props = {
  products: ProductListingRecord[];
  localePrefix: string;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
  columns?: 2 | 3 | 4;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
};

export function ProductRecordsOverflowLayout({
  products,
  localePrefix,
  flags,
  previewDevice,
  columns = 3,
  autoplay,
  autoplayIntervalMs,
}: Props) {
  const numberLocale = localePrefix.startsWith("ar") ? "ar-AE" : "en-US";
  const layoutProps = {
    items: products,
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
    gridClassName:
      columns === 2
        ? "pl-grid pl-grid--block-cols-2"
        : columns === 4
          ? "pl-grid pl-grid--block-cols-4"
          : "pl-grid pl-grid--block-cols-3",
    sliderItemClassName: "pl-block-slider-item",
  };

  if (previewDevice) {
    return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
  }
  return <ResponsiveOverflowLayout {...layoutProps} />;
}
