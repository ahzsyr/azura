"use client";

import { useState } from "react";
import Image from "next/image";
import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { CompareSlider } from "@/features/marketing-blocks/components/compare-slider";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  layout?: "slider" | "sideBySide" | "stacked" | "overlay";
  beforeLabel?: string;
  afterLabel?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  sliderPosition?: number;
  showLabels?: boolean;
};

export function BeforeAfterView({
  title,
  subtitle,
  layout = "slider",
  beforeLabel = "Before",
  afterLabel = "After",
  beforeImageUrl = "",
  afterImageUrl = "",
  sliderPosition = 50,
  showLabels = true,
}: Props) {
  return (
    <AnimatedSection>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      <div className="mx-auto max-w-4xl">
        {layout === "slider" && beforeImageUrl && afterImageUrl && (
          <CompareSlider
            beforeSrc={beforeImageUrl}
            afterSrc={afterImageUrl}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
            initialPosition={sliderPosition}
            showLabels={showLabels}
          />
        )}
        {layout === "sideBySide" && (
          <div className="grid gap-4 md:grid-cols-2">
            <CompareImage src={beforeImageUrl} label={beforeLabel} showLabels={showLabels} />
            <CompareImage src={afterImageUrl} label={afterLabel} showLabels={showLabels} />
          </div>
        )}
        {layout === "stacked" && (
          <div className="space-y-4">
            <CompareImage src={beforeImageUrl} label={beforeLabel} showLabels={showLabels} />
            <CompareImage src={afterImageUrl} label={afterLabel} showLabels={showLabels} />
          </div>
        )}
        {layout === "overlay" && beforeImageUrl && afterImageUrl && (
          <OverlayCompare
            beforeSrc={beforeImageUrl}
            afterSrc={afterImageUrl}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
            showLabels={showLabels}
          />
        )}
      </div>
    </AnimatedSection>
  );
}

function OverlayCompare({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  showLabels,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  showLabels: boolean;
}) {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-xl"
      onMouseEnter={() => setShowAfter(true)}
      onMouseLeave={() => setShowAfter(false)}
    >
      <Image src={beforeSrc} alt={beforeLabel} fill className="object-cover" sizes="(max-width:768px) 100vw, 900px" />
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          showAfter ? "opacity-100" : "opacity-0"
        )}
      >
        <Image src={afterSrc} alt={afterLabel} fill className="object-cover" sizes="(max-width:768px) 100vw, 900px" />
      </div>
      {showLabels && (
        <>
          <span className="absolute top-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{beforeLabel}</span>
          <span className="absolute top-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{afterLabel}</span>
        </>
      )}
      <button
        type="button"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs text-white sm:hidden"
        onClick={() => setShowAfter((v) => !v)}
      >
        {showAfter ? "Show before" : "Show after"}
      </button>
      <p className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs text-white sm:block pointer-events-none">
        Hover to compare
      </p>
    </div>
  );
}

function CompareImage({
  src,
  label,
  showLabels,
}: {
  src: string;
  label: string;
  showLabels: boolean;
}) {
  if (!src) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        No image
      </div>
    );
  }
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
      <Image src={src} alt={label} fill className="object-cover" sizes="(max-width:768px) 100vw, 600px" />
      {showLabels && (
        <span className="absolute top-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{label}</span>
      )}
    </div>
  );
}
