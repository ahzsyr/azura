"use client";

import type { ReactNode } from "react";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
  type ResponsiveOverflowLayoutProps,
} from "@/features/builder/components/responsive-overflow-layout";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";

export type BlockOverflowContext = {
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
};

export type MarketingItemsOverflowProps<T> = Omit<
  ResponsiveOverflowLayoutProps<T>,
  "flags"
> & {
  block: BlockNode;
  previewDevice?: DeviceBreakpoint;
  /** Pre-resolved flags (from renderBlockContent overflowCtx) */
  overflowFlags?: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  useSimpleSliderTrack?: boolean;
};

export function resolveBlockOverflowContext(
  block: BlockNode,
  previewDevice?: DeviceBreakpoint
): BlockOverflowContext {
  return {
    flags: resolveContentOverflowCssFlags(block),
    previewDevice,
  };
}

export function MarketingItemsOverflow<T>({
  block,
  previewDevice,
  overflowFlags,
  className,
  ...layoutProps
}: MarketingItemsOverflowProps<T>) {
  const flags = overflowFlags ?? resolveContentOverflowCssFlags(block);
  const device = previewDevice;

  if (device) {
    return (
      <ResponsiveOverflowLayoutForDevice
        {...layoutProps}
        flags={flags}
        device={device}
        className={className}
      />
    );
  }

  return (
    <ResponsiveOverflowLayout {...layoutProps} flags={flags} className={className} />
  );
}

/** Returns true when responsive overflow should replace legacy item layout */
export function shouldUseResponsiveOverflow(
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>
): boolean {
  const modes = [flags.desktop, flags.tablet, flags.mobile].map((f) => {
    if (f.effectiveMode === "slider") return f.sliderEnabled ? "slider" : "grid";
    return f.effectiveMode;
  });
  return modes.some((m) => m !== "grid");
}
