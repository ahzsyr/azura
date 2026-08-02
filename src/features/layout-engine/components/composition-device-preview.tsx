"use client";

import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { layoutRegistry, withTopInStackOrder } from "@/features/layout-engine/layout-registry";
import { getLayoutShellAttributes } from "@/features/layout-engine/layout-shell-attrs";
import type { ColumnRatioToken, Composition, RegionId } from "@/features/layout-engine/types";
import { BlockPreviewRenderer } from "@/features/builder/components/block-preview-renderer";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import type { CollectionBuilderOption, ProductBuilderOption } from "@/features/builder/blocks/commerce/product-blocks/types";
import type { PublicLocale } from "@/i18n/locale-config";

type Device = "mobile" | "tablet" | "desktop";

const DEVICE_WIDTH: Record<Device, string> = {
  mobile: "390px",
  tablet: "834px",
  desktop: "100%",
};

type Props = {
  composition: Composition;
  locales: PublicLocale[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
};

function resolveRatioVars(ratio?: ColumnRatioToken): Record<string, string> {
  switch (ratio) {
    case "20-80":
      return { "--az-aside-start-ratio": "20%" };
    case "25-75":
      return { "--az-aside-start-ratio": "25%" };
    case "30-70":
      return { "--az-aside-start-ratio": "30%" };
    case "75-25":
      return { "--az-aside-end-ratio": "25%" };
    case "20-60-20":
      return { "--az-aside-start-ratio": "20%", "--az-aside-end-ratio": "20%" };
    case "25-50-25":
      return { "--az-aside-start-ratio": "25%", "--az-aside-end-ratio": "25%" };
    case "golden":
      return { "--az-aside-start-ratio": "38%" };
    default:
      return {};
  }
}

export function CompositionDevicePreview({
  composition,
  locales,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
}: Props) {
  const [locale, setLocale] = useState(locales[0]?.urlPrefix ?? "en");
  const [device, setDevice] = useState<Device>("mobile");
  const definition = layoutRegistry.getOrThrow(composition.layout.type);
  const shell = getLayoutShellAttributes(composition);
  const style = resolveRatioVars(
    composition.layout.regions.asideStart?.ratio ??
      composition.layout.regions.asideEnd?.ratio ??
      definition.defaultRatio,
  ) as React.CSSProperties;

  const tabletOrder = withTopInStackOrder(
    composition.layout.responsive?.tablet?.stackOrder ??
      definition.defaultResponsive?.tablet?.stackOrder ??
      definition.activeRegions,
    shell.topEnabled,
  );
  const mobileOrder = withTopInStackOrder(
    composition.layout.responsive?.mobile?.stackOrder ??
      definition.defaultResponsive?.mobile?.stackOrder ??
      definition.activeRegions,
    shell.topEnabled,
  );

  const renderRegionPreview = (regionId: RegionId) => (
    <div key={regionId} className="az-layout__region min-w-0">
      <BlockPreviewRenderer
        blocks={composition.regions[regionId]}
        locale={locale}
        locales={locales}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        previewDevice={device}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border p-0.5 text-xs">
          {(["mobile", "tablet", "desktop"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 capitalize",
                device === d && "bg-primary text-primary-foreground",
              )}
              onClick={() => setDevice(d)}
            >
              {d === "mobile" && <Smartphone className="h-3.5 w-3.5" />}
              {d === "tablet" && <Tablet className="h-3.5 w-3.5" />}
              {d === "desktop" && <Monitor className="h-3.5 w-3.5" />}
              {d}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap rounded-md border p-0.5 text-xs gap-0.5">
          {locales.map((l) => (
            <button
              key={l.code}
              type="button"
              className={cn(
                "rounded px-2 py-0.5",
                locale === l.urlPrefix && "bg-primary text-primary-foreground",
              )}
              onClick={() => setLocale(l.urlPrefix)}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className={cn(
            "rounded-lg border bg-background shadow-sm overflow-hidden transition-all",
            device === "mobile" && "rounded-[2rem] border-[6px] border-foreground/80",
            device !== "desktop" && "max-h-[640px] overflow-y-auto",
          )}
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
        >
          {device === "mobile" && (
            <div className="h-5 bg-muted flex items-center justify-center">
              <div className="w-16 h-1 rounded-full bg-foreground/20" />
            </div>
          )}
          <div className="p-4">
            <div
              className="az-layout-shell"
              data-max-width={shell.maxWidth}
              data-container={shell.container}
              data-sticky-scroll={shell.stickyScroll}
            >
              {shell.topEnabled ? (
                <div
                  className="az-layout__top-wrap mb-4"
                  data-top-width={shell.topWidth}
                  data-order-tablet={tabletOrder.indexOf("top") + 1 || undefined}
                  data-order-mobile={mobileOrder.indexOf("top") + 1 || undefined}
                >
                  {renderRegionPreview("top")}
                </div>
              ) : null}
              <div
                className="az-layout"
                data-layout={definition.type}
                data-gap={composition.layout.spacing.gap ?? "md"}
                style={style}
              >
                {definition.activeRegions.map((regionId: RegionId) => renderRegionPreview(regionId))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
