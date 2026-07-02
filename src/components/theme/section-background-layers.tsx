"use client";

import { useEffect, useRef } from "react";
import type { BlockSectionBackground } from "@/types/block-system";
import {
  mountSectionAnimatedBackground,
  resolveSectionPatternEffect,
  sectionBackgroundUsesLayer,
} from "@/features/theme/backgrounds/background-system";

type Props = {
  bg: BlockSectionBackground | undefined;
  overlayOpacity?: number;
};

export function SectionBackgroundLayers({ bg }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  const patternEffect = resolveSectionPatternEffect(bg);
  const needsAnimated = Boolean(patternEffect);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !needsAnimated || !patternEffect) return;
    return mountSectionAnimatedBackground(host, patternEffect);
  }, [needsAnimated, patternEffect]);

  if (!bg?.type || bg.type === "none") return null;

  if (bg.type === "image" && bg.imageUrl) {
    const opacity = bg.overlayOpacity ?? 0.4;
    return (
      <div ref={hostRef} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg.imageUrl})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-black" style={{ opacity }} />
      </div>
    );
  }

  if (bg.type === "glass") {
    const blur = bg.glassBlur ?? "var(--az-preset-blur-glass, 16px)";
    return (
      <div
        ref={hostRef}
        aria-hidden
        className="az-section-glass-layer pointer-events-none absolute inset-0 -z-10"
        style={{
          backdropFilter: `blur(${blur}) saturate(var(--az-preset-glass-saturation, 1.2))`,
          WebkitBackdropFilter: `blur(${blur}) saturate(var(--az-preset-glass-saturation, 1.2))`,
          background: `color-mix(in srgb, var(--card) calc(var(--az-preset-glass-opacity, 0.55) * 100%), transparent)`,
        }}
      />
    );
  }

  if (needsAnimated) {
    return (
      <div
        ref={hostRef}
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        data-section-bg-host={patternEffect}
      />
    );
  }

  if (sectionBackgroundUsesLayer(bg) && bg.type === "pattern") {
    return (
      <div
        ref={hostRef}
        aria-hidden
        className="az-section-bg-layer az-section-bg-pattern pointer-events-none absolute inset-0 -z-10"
        data-section-pattern={bg.pattern ?? "grid"}
      />
    );
  }

  return null;
}
