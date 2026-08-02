"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePreferNativeSliderTrack } from "@/lib/hooks/use-prefer-native-slider-track";
import { cn } from "@/lib/utils";
import {
  normalizeSectionColumns,
  normalizeSectionGap,
  normalizeSectionLayoutMode,
  normalizeSectionMaxWidth,
  normalizeSectionSlidesPerView,
  resolveSectionEffectiveLayout,
  resolveSectionGridTemplate,
  resolveSectionSplitGridTemplate,
  sectionLayoutGapClass,
  sectionLayoutGridColumnClass,
  sectionLayoutMaxWidthClass,
} from "@/features/builder/container-blocks";

export type SectionLayoutViewProps = {
  layoutMode?: unknown;
  gap?: unknown;
  stackOnMobile?: boolean;
  maxWidth?: unknown;
  columns?: unknown;
  slidesPerView?: unknown;
  showArrows?: boolean;
  showDots?: boolean;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  loop?: boolean;
  children: ReactNode;
  className?: string;
};

function stackGapClass(gap: string): string {
  if (gap === "sm") return "section-layout-stack--gap-sm";
  if (gap === "lg") return "section-layout-stack--gap-lg";
  return "section-layout-stack--gap-md";
}

function sliderBasisClass(slidesPerView: number): string {
  if (slidesPerView >= 3) return "basis-full sm:basis-1/2 lg:basis-1/3";
  if (slidesPerView === 2) return "basis-full sm:basis-1/2";
  return "basis-full";
}

function SectionLayoutSlider({
  children,
  slidesPerView,
  showArrows,
  showDots,
  autoplay,
  autoplayIntervalMs,
  loop,
}: {
  children: ReactNode[];
  slidesPerView: 1 | 2 | 3;
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  autoplayIntervalMs: number;
  loop: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const preferNativeTrack = usePreferNativeSliderTrack();
  const basis = sliderBasisClass(slidesPerView);
  const canLoop = loop && children.length > slidesPerView;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !autoplay || preferNativeTrack) return;
    const interval = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else if (canLoop) api.scrollTo(0);
    }, autoplayIntervalMs);
    return () => window.clearInterval(interval);
  }, [api, autoplay, autoplayIntervalMs, preferNativeTrack, canLoop]);

  if (children.length === 0) return null;

  if (preferNativeTrack) {
    return (
      <div className="block-overflow-slider-track">
        {children.map((child, index) => (
          <div key={index} className="min-w-[280px] max-w-sm shrink-0">
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: canLoop }}
        className="w-full"
      >
        <CarouselContent className="-ms-3">
          {children.map((child, index) => (
            <CarouselItem key={index} className={cn("ps-3", basis)}>
              <div className="section-layout-grid__cell min-w-0">{child}</div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {showArrows && children.length > slidesPerView ? (
          <>
            <CarouselPrevious className="start-0" />
            <CarouselNext className="end-0" />
          </>
        ) : null}
      </Carousel>
      {showDots && children.length > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                selectedIndex === index ? "bg-primary" : "bg-muted-foreground/30"
              )}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SectionLayoutView({
  layoutMode: layoutModeProp,
  gap: gapProp,
  stackOnMobile = true,
  maxWidth: maxWidthProp,
  columns: columnsProp,
  slidesPerView: slidesPerViewProp,
  showArrows = true,
  showDots = false,
  autoplay = false,
  autoplayIntervalMs = 5000,
  loop = true,
  children,
  className,
}: SectionLayoutViewProps) {
  const childArray = Children.toArray(children);
  const layoutMode = normalizeSectionLayoutMode(layoutModeProp);
  const gap = normalizeSectionGap(gapProp);
  const maxWidth = normalizeSectionMaxWidth(maxWidthProp);
  const columns = normalizeSectionColumns(columnsProp);
  const slidesPerView = normalizeSectionSlidesPerView(slidesPerViewProp);
  const effectiveLayout = resolveSectionEffectiveLayout(layoutMode, childArray.length);
  const widthClass = sectionLayoutMaxWidthClass(maxWidth);

  if (childArray.length === 0) {
    return null;
  }

  if (effectiveLayout === "stack") {
    return (
      <div
        className={cn(
          "section-layout-stack",
          stackGapClass(gap),
          widthClass,
          className
        )}
      >
        {childArray.map((child, index) => (
          <div key={index} className="min-w-0">
            {child}
          </div>
        ))}
      </div>
    );
  }

  if (effectiveLayout === "splitLeft" || effectiveLayout === "splitRight") {
    return (
      <div
        className={cn(
          "section-layout-grid",
          sectionLayoutGapClass(gap),
          stackOnMobile && "section-layout-grid--stack-mobile",
          widthClass,
          className
        )}
        style={{
          gridTemplateColumns: resolveSectionSplitGridTemplate(effectiveLayout),
        }}
      >
        {childArray.slice(0, 2).map((child, index) => (
          <div key={index} className="section-layout-grid__cell min-w-0">
            {child}
          </div>
        ))}
      </div>
    );
  }

  if (effectiveLayout === "grid") {
    return (
      <div
        className={cn(
          "section-layout-grid",
          sectionLayoutGapClass(gap),
          sectionLayoutGridColumnClass(columns),
          stackOnMobile && "section-layout-grid--stack-mobile",
          widthClass,
          className
        )}
        style={{ gridTemplateColumns: resolveSectionGridTemplate(columns) }}
      >
        {childArray.map((child, index) => (
          <div key={index} className="section-layout-grid__cell min-w-0">
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(widthClass, className)}>
      <SectionLayoutSlider
        slidesPerView={slidesPerView}
        showArrows={showArrows}
        showDots={showDots}
        autoplay={autoplay}
        autoplayIntervalMs={autoplayIntervalMs}
        loop={loop}
      >
        {childArray}
      </SectionLayoutSlider>
    </div>
  );
}