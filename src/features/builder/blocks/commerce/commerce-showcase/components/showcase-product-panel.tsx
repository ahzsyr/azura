"use client";

import type { ProductListingRecord } from "@/features/products/listing/types";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import { ProductListingGrid } from "@/features/products/components/listing/product-listing-grid";
import { ProductRecordsOverflowLayout } from "@/features/builder/blocks/commerce/product-blocks/components/product-records-overflow-layout";
import { cn } from "@/lib/utils";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";

type Props = {
  records: ProductListingRecord[];
  localePrefix: string;
  layout: "grid" | "carousel" | "list" | "masonry";
  columns?: 2 | 3 | 4;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
  slidesPerView?: number;
  loading?: boolean;
  emptyMessage?: string;
};

export function ShowcaseProductPanel({
  records,
  localePrefix,
  layout,
  columns = 3,
  flags,
  previewDevice,
  autoplay,
  autoplayIntervalMs,
  slidesPerView = 3,
  loading,
  emptyMessage,
}: Props) {
  const numberLocale = getNumberLocale(localePrefix);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
        Loading products…
      </div>
    );
  }

  if (records.length === 0) {
    return emptyMessage ? (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  if (layout === "carousel") {
    return (
      <ProductRecordsOverflowLayout
        products={records}
        localePrefix={localePrefix}
        flags={flags}
        previewDevice={previewDevice}
        columns={Math.min(4, Math.max(2, slidesPerView)) as 2 | 3 | 4}
        autoplay={autoplay}
        autoplayIntervalMs={autoplayIntervalMs}
      />
    );
  }

  if (layout === "list") {
    return (
      <ProductListingGrid
        products={records}
        localePrefix={localePrefix}
        numberLocale={numberLocale}
        viewMode="list"
        emptyMessage={emptyMessage ?? ""}
      />
    );
  }

  const gridCols =
    columns === 2
      ? "grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <div
      className={cn(
        "grid gap-4",
        layout === "masonry" ? "columns-2 sm:columns-3 gap-4 space-y-4" : gridCols,
      )}
    >
      <ProductListingGrid
        products={records}
        localePrefix={localePrefix}
        numberLocale={numberLocale}
        viewMode="grid"
        emptyMessage={emptyMessage ?? ""}
      />
    </div>
  );
}
