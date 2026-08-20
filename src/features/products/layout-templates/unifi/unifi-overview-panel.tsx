"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import { sectionsForTab } from "@/features/products/lib/unifi-product-sections";
import { filterBySelectedVariations, type VariationSelection } from "@/features/products/lib/product-variation-media";
import type { ProductDetailedSection, ProductFeatureCard } from "@/features/products/types";

type Props = {
  viewModel: ProductDetailViewModel;
  tab?: string;
  selectedVariations?: VariationSelection;
};

function uniqueFeatures(
  features: ProductFeatureCard[],
  selectedVariations?: VariationSelection,
  product?: ProductDetailViewModel["product"],
): ProductFeatureCard[] {
  const source = filterBySelectedVariations(features, selectedVariations, product);
  const seen = new Set<string>();
  const out: ProductFeatureCard[] = [];
  for (const feature of source) {
    const key = feature.title?.trim() || `${feature.image ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(feature);
  }
  return out;
}

function OverviewSection({
  section,
  selectedVariations,
  product,
}: {
  section: ProductDetailedSection;
  selectedVariations?: VariationSelection;
  product: ProductDetailViewModel["product"];
}) {
  const features = uniqueFeatures(section.features ?? [], selectedVariations, product);
  const media = filterBySelectedVariations(
    (section.media ?? []).filter((item) => Boolean(item.url?.trim())),
    selectedVariations,
    product,
  );
  const videos = filterBySelectedVariations(
    (section.videos ?? []).filter((video) => Boolean(video.url?.trim())),
    selectedVariations,
    product,
  );
  const heading = section.heading?.trim();

  return (
    <div className="unifi-overview__section">
      {heading ? <h3 className="unifi-overview__heading">{heading}</h3> : null}
      {section.text?.trim() && features.length === 0 ? (
        <p className="unifi-overview__copy">{section.text}</p>
      ) : null}
      {features.length > 0 ? (
        <div className="unifi-overview__features">
          {features.map((feature, i) => {
            const url = feature.image ? normalizeRemoteImageUrl(feature.image) ?? feature.image : "";
            const hotspot = feature.hotspot;
            const hasHotspot = hotspot?.dotX != null && hotspot.dotY != null;
            return (
              <figure key={`${feature.title}-${i}`} className="unifi-overview__feature">
                {url ? (
                  <div className="unifi-overview__feature-media">
                    <Image
                      src={url}
                      alt={feature.title || ""}
                      fill
                      className="unifi-overview__grid-img"
                      sizes="(max-width: 832px) 100vw, 50vw"
                      unoptimized={!shouldOptimizeNextImage(url)}
                    />
                    {hasHotspot ? (
                      <span
                        className="unifi-overview__hotspot"
                        style={{ left: `${hotspot.dotX! * 100}%`, top: `${hotspot.dotY! * 100}%` }}
                      />
                    ) : null}
                    {hasHotspot && (feature.title || feature.body) ? (
                      <figcaption
                        className="unifi-overview__hotspot-tip"
                        style={{
                          left: `${(hotspot.tooltipX ?? hotspot.dotX ?? 0.5) * 100}%`,
                          top: `${(hotspot.tooltipY ?? hotspot.dotY ?? 0.5) * 100}%`,
                        }}
                      >
                        {feature.title ? <h4>{feature.title}</h4> : null}
                        {feature.body ? <p>{feature.body}</p> : null}
                      </figcaption>
                    ) : null}
                  </div>
                ) : null}
                {!hasHotspot && (feature.title || feature.body) ? (
                  <figcaption>
                    {feature.title ? <h4>{feature.title}</h4> : null}
                    {feature.body ? <p>{feature.body}</p> : null}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>
      ) : null}
      {media.length > 0 ? (
        <div className={`unifi-overview__grid unifi-overview__grid--${media.length > 2 ? "mosaic" : "pair"}`}>
          {media.map((item) => {
            const url = normalizeRemoteImageUrl(item.url!) ?? item.url!;
            return (
              <div key={url} className="unifi-overview__grid-item">
                <Image
                  src={url}
                  alt={item.alt || ""}
                  fill
                  className="unifi-overview__grid-img"
                  sizes="(max-width: 832px) 100vw, 50vw"
                  unoptimized={!shouldOptimizeNextImage(url)}
                />
              </div>
            );
          })}
        </div>
      ) : null}
      {videos.map((video, index) => (
        <div key={video.url ?? index} className="unifi-installation__stage">
          <video
            className="unifi-installation__video"
            src={video.url}
            poster={video.poster}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      ))}
    </div>
  );
}

export function UniFiOverviewPanel({ viewModel, tab = "overview", selectedVariations }: Props) {
  const { product } = viewModel;
  const sections = useMemo(() => sectionsForTab(product, tab), [product, tab]);

  if (sections.length === 0) {
    if (tab !== "overview") return null;
    return <p className="unifi-empty">{viewModel.labels.noDescription || "No overview available."}</p>;
  }

  return (
    <div className="unifi-overview">
      {sections.map((section, i) => (
        <OverviewSection
          key={`${section.heading}-${i}`}
          section={section}
          selectedVariations={selectedVariations}
          product={product}
        />
      ))}
    </div>
  );
}
