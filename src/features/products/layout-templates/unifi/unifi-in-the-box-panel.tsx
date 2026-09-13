"use client";

import Image from "next/image";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import { sectionMedia, sectionsForTab } from "@/features/products/lib/unifi-product-sections";
import { filterBySelectedVariations, type VariationSelection } from "@/features/products/lib/product-variation-media";

type Props = {
  viewModel: ProductDetailViewModel;
  tab?: string;
  selectedVariations?: VariationSelection;
};

export function UniFiInTheBoxPanel({ viewModel, tab = "in_the_box", selectedVariations }: Props) {
  const images = filterBySelectedVariations(
    sectionMedia(sectionsForTab(viewModel.product, tab)),
    selectedVariations,
    viewModel.product,
  );

  if (images.length === 0) {
    return <p className="unifi-empty">Package contents listed on product overview.</p>;
  }

  return (
    <div className="unifi-in-box">
      {images.map((item) => {
        const url = normalizeRemoteImageUrl(item.url!) ?? item.url!;
        return (
          <div
            key={url}
            className="unifi-in-box__hero"
            style={
              item.width && item.height
                ? { aspectRatio: `${item.width} / ${item.height}` }
                : undefined
            }
          >
            <Image
              src={url}
              alt={item.alt || viewModel.title}
              fill
              className="unifi-in-box__hero-img"
              sizes="100vw"
              unoptimized={!shouldOptimizeNextImage(url)}
            />
          </div>
        );
      })}
    </div>
  );
}
