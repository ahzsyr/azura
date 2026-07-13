"use client";

import type { ReactNode } from "react";
import type { DeviceBreakpoint } from "@/types/block-system";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";
import {
  resolveOverflowFlagsForBlock,
  type ProductPageOverflowBlockKey,
} from "@/features/products/lib/product-page-overflow";
import { useProductPageResponsive } from "./product-page-responsive-provider";

type Props<T> = {
  block: ProductPageOverflowBlockKey;
  items: T[];
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  gridClassName?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  sliderItemClassName?: string;
  sliderSnapMinWidth?: string;
  accordionRender?: (item: T, index: number) => { title: ReactNode; body: ReactNode };
  showMoreLabels?: { more: string; less: string };
  className?: string;
  previewDevice?: DeviceBreakpoint;
};

export function ProductPdpOverflowLayout<T>({
  block,
  previewDevice,
  ...layoutProps
}: Props<T>) {
  const { overflow } = useProductPageResponsive();
  const flags = resolveOverflowFlagsForBlock(overflow, block);

  if (previewDevice) {
    return (
      <ResponsiveOverflowLayoutForDevice
        {...layoutProps}
        flags={flags}
        device={previewDevice}
        useSimpleSliderTrack={false}
      />
    );
  }

  return (
    <ResponsiveOverflowLayout
      {...layoutProps}
      flags={flags}
      useSimpleSliderTrack={false}
      className={layoutProps.className ?? `prd-overflow prd-overflow--${block}`}
    />
  );
}
