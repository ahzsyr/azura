import type { BlockNode } from "@/types/builder";
import type {
  BlockContentOverflowSettings,
  CollapseVariant,
  ContentOverflowMode,
  DeviceBreakpoint,
  ResolvedContentOverflow,
} from "@/types/block-system";
import { getBlockSettings } from "@/features/builder/instance/block-instance";
import { mergeDisplaySettings as mergeCatalogDisplaySettings } from "@/schemas/catalog/display-settings";
import { mergeDisplaySettings as mergeContentDisplaySettings } from "@/schemas/content/display-settings";

const DEVICES: DeviceBreakpoint[] = ["desktop", "tablet", "mobile"];

const DEFAULT_COLLAPSE_VARIANT: CollapseVariant = "accordion";
const DEFAULT_SHOW_MORE_LIMIT = 3;

function normalizeSettings(
  raw?: BlockContentOverflowSettings
): BlockContentOverflowSettings | undefined {
  if (!raw || Object.keys(raw).length === 0) return undefined;
  return raw;
}

/** Base layout from block content props (inherit fallback) */
export function resolveBaseContentOverflow(block: BlockNode): ResolvedContentOverflow {
  const p = getBlockSettings(block);
  const type = block.type;

  if (type === "testimonials") {
    const layoutMode = (p.layoutMode as string) ?? "grid";
    const sliderEnabled = Boolean(p.sliderEnabled);
    if (layoutMode === "slider" && sliderEnabled) {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "catalog") {
    const ds = mergeCatalogDisplaySettings(p.displaySettings as Record<string, unknown>);
    if (ds.layoutMode === "slider") {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "contentList") {
    const ds = mergeContentDisplaySettings(p.displaySettings as Record<string, unknown>);
    if (ds.layoutMode === "slider") {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    if (ds.layoutMode === "list") {
      return {
        effectiveMode: "collapse",
        sliderEnabled: false,
        collapseVariant: "stack",
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "logoCloud") {
    const displayMode = (p.displayMode as string) ?? "grid";
    if (displayMode === "carousel" || displayMode === "marquee") {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "productFaq") {
    const layoutMode = (p.layoutMode as string) ?? "accordion";
    if (layoutMode === "grid") {
      return {
        effectiveMode: "grid",
        sliderEnabled: false,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "collapse",
      sliderEnabled: false,
      collapseVariant: "accordion",
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (
    type === "productGrid" ||
    type === "productCarousel" ||
    type === "relatedProducts"
  ) {
    const layout = (p.layout as string) ?? (type === "productCarousel" ? "carousel" : "grid");
    if (layout === "carousel") {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "relatedContent" || type === "recentlyViewed" || type === "categoryExplorer") {
    const layout = (p.layout as string) ?? "grid";
    if (layout === "carousel") {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    if (layout === "list") {
      return {
        effectiveMode: "collapse",
        sliderEnabled: false,
        collapseVariant: "stack",
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "timeline") {
    const layout = (p.layout as string) ?? "vertical";
    if (layout === "horizontal") {
      return {
        effectiveMode: "slider",
        sliderEnabled: true,
        collapseVariant: DEFAULT_COLLAPSE_VARIANT,
        showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
      };
    }
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (type === "gallery" || type === "masonryGallery" || type === "videoGallery") {
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  if (
    type === "featureGrid" ||
    type === "benefitsGrid" ||
    type === "statsCounter" ||
    type === "trustBadges"
  ) {
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  return {
    effectiveMode: "grid",
    sliderEnabled: false,
    collapseVariant: DEFAULT_COLLAPSE_VARIANT,
    showMoreLimit: DEFAULT_SHOW_MORE_LIMIT,
  };
}

function applyOverflowSettings(
  settings: BlockContentOverflowSettings | undefined,
  base: ResolvedContentOverflow
): ResolvedContentOverflow {
  const mode: ContentOverflowMode = settings?.mode ?? "inherit";

  if (mode === "inherit") {
    return base;
  }

  if (mode === "grid") {
    return {
      effectiveMode: "grid",
      sliderEnabled: false,
      collapseVariant: settings?.collapseVariant ?? base.collapseVariant,
      showMoreLimit: settings?.showMoreLimit ?? base.showMoreLimit,
    };
  }

  if (mode === "slider") {
    const sliderEnabled = settings?.sliderEnabled !== false;
    return {
      effectiveMode: sliderEnabled ? "slider" : "grid",
      sliderEnabled,
      collapseVariant: settings?.collapseVariant ?? base.collapseVariant,
      showMoreLimit: settings?.showMoreLimit ?? base.showMoreLimit,
    };
  }

  if (mode === "collapse") {
    return {
      effectiveMode: "collapse",
      sliderEnabled: false,
      collapseVariant: settings?.collapseVariant ?? DEFAULT_COLLAPSE_VARIANT,
      showMoreLimit: settings?.showMoreLimit ?? DEFAULT_SHOW_MORE_LIMIT,
    };
  }

  return base;
}

/** Resolve effective overflow for a single device */
export function resolveContentOverflowForDevice(
  block: BlockNode,
  device: DeviceBreakpoint
): ResolvedContentOverflow {
  return resolveContentOverflowCssFlags(block)[device];
}

/** Per-breakpoint flags for SSR / CSS visibility shells */
export function resolveContentOverflowCssFlags(
  block: BlockNode
): Record<DeviceBreakpoint, ResolvedContentOverflow> {
  const base = resolveBaseContentOverflow(block);
  const desktopLayer = normalizeSettings(block.responsive?.desktop?.contentOverflow);
  const tabletLayer = normalizeSettings(block.responsive?.tablet?.contentOverflow);
  const mobileLayer = normalizeSettings(block.responsive?.mobile?.contentOverflow);

  const desktop = applyOverflowSettings(desktopLayer, base);
  const tablet = applyOverflowSettings(tabletLayer, desktop);
  const mobile = applyOverflowSettings(mobileLayer, tablet);

  return { desktop, tablet, mobile };
}

export function contentOverflowToDataAttributes(
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>
): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const device of DEVICES) {
    const f = flags[device];
    const mode =
      f.effectiveMode === "slider" && !f.sliderEnabled ? "grid" : f.effectiveMode;
    attrs[`data-overflow-${device}`] = mode;
    if (mode === "collapse") {
      attrs[`data-collapse-${device}`] = f.collapseVariant;
    }
  }
  return attrs;
}
