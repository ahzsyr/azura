/**
 * Product detail page overflow modes for linked tags, cross-links, and services bar.
 * Stored in site.json as `productPageOverflow`.
 */

import type { DeviceBreakpoint } from "@/types/block-system";
import type { CollapseVariant, ResolvedContentOverflow } from "@/types/block-system";

export type ProductPageOverflowBlockKey = "linkedTags" | "crossLinks" | "servicesBar";
export type ProductPageOverflowMode = "grid" | "slider" | "collapse";

export type ProductPageOverflowBlockPartial = Partial<
  Record<DeviceBreakpoint, ProductPageOverflowMode>
>;

export type ProductPageOverflowPartial = Partial<
  Record<ProductPageOverflowBlockKey, ProductPageOverflowBlockPartial>
>;

export type ResolvedProductPageOverflowBlock = Record<DeviceBreakpoint, ProductPageOverflowMode>;

export type ResolvedProductPageOverflow = Record<
  ProductPageOverflowBlockKey,
  ResolvedProductPageOverflowBlock
>;

const BLOCKS: ProductPageOverflowBlockKey[] = ["linkedTags", "crossLinks", "servicesBar"];
const VIEWPORTS: DeviceBreakpoint[] = ["desktop", "tablet", "mobile"];

const DEFAULTS: ResolvedProductPageOverflow = {
  linkedTags: { desktop: "grid", tablet: "slider", mobile: "collapse" },
  crossLinks: { desktop: "grid", tablet: "collapse", mobile: "collapse" },
  servicesBar: { desktop: "grid", tablet: "grid", mobile: "grid" },
};

function isMode(v: unknown): v is ProductPageOverflowMode {
  return v === "grid" || v === "slider" || v === "collapse";
}

export function normalizeProductPageOverflowPartial(
  raw: unknown,
): ProductPageOverflowPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageOverflowPartial = {};

  for (const block of BLOCKS) {
    const blockRaw = o[block];
    if (!blockRaw || typeof blockRaw !== "object" || Array.isArray(blockRaw)) continue;
    const blockObj = blockRaw as Record<string, unknown>;
    const layer: ProductPageOverflowBlockPartial = {};
    for (const vp of VIEWPORTS) {
      if (isMode(blockObj[vp])) layer[vp] = blockObj[vp];
    }
    if (Object.keys(layer).length) out[block] = layer;
  }

  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPageOverflow(
  partial?: ProductPageOverflowPartial | null,
): ResolvedProductPageOverflow {
  const out = {
    linkedTags: { ...DEFAULTS.linkedTags },
    crossLinks: { ...DEFAULTS.crossLinks },
    servicesBar: { ...DEFAULTS.servicesBar },
  };
  if (!partial) return out;

  for (const block of BLOCKS) {
    const layer = partial[block];
    if (!layer) continue;
    for (const vp of VIEWPORTS) {
      if (layer[vp]) out[block][vp] = layer[vp]!;
    }
  }
  return out;
}

export function resolveOverflowFlagsForBlock(
  overflow: ResolvedProductPageOverflow,
  block: ProductPageOverflowBlockKey,
): Record<DeviceBreakpoint, ResolvedContentOverflow> {
  const modes = overflow[block];
  const collapseVariant: CollapseVariant =
    block === "crossLinks" ? "accordion" : "show_more";

  const showMoreLimitFor = (viewport: DeviceBreakpoint): number => {
    if (block === "linkedTags") {
      return viewport === "mobile" ? 4 : 6;
    }
    if (block === "servicesBar") return 2;
    return 3;
  };

  const toResolved = (
    mode: ProductPageOverflowMode,
    viewport: DeviceBreakpoint,
  ): ResolvedContentOverflow => ({
    effectiveMode: mode,
    sliderEnabled: mode === "slider",
    collapseVariant,
    showMoreLimit: showMoreLimitFor(viewport),
  });

  return {
    desktop: toResolved(modes.desktop, "desktop"),
    tablet: toResolved(modes.tablet, "tablet"),
    mobile: toResolved(modes.mobile, "mobile"),
  };
}

export function serializeProductPageOverflowForSite(
  resolved: ResolvedProductPageOverflow,
): ProductPageOverflowPartial | undefined {
  const out: ProductPageOverflowPartial = {};
  for (const block of BLOCKS) {
    const layer: ProductPageOverflowBlockPartial = {};
    for (const vp of VIEWPORTS) {
      if (resolved[block][vp] !== DEFAULTS[block][vp]) {
        layer[vp] = resolved[block][vp];
      }
    }
    if (Object.keys(layer).length) out[block] = layer;
  }
  return Object.keys(out).length ? out : undefined;
}
