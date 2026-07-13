import type { BlockNode, PageBlocks } from "@/types/builder";
import { layoutRegistry } from "@/features/layout-engine/layout-registry";
import type { Composition, LayoutType } from "@/features/layout-engine/types";
import type {
  HeaderBuilderSettings,
  ResolvedHeaderOverlay,
} from "@/features/navigation/types";
import { getBlockSettings } from "@/features/builder/instance/block-instance";

export const HEADER_OVERLAY_TOP_GAP_BOXED = "12px";

/** CSS calc for auto content inset — uses live --header-height from HeaderDesktopBehavior */
export const HEADER_OVERLAY_AUTO_PADDING =
  "calc(var(--header-height, 76px) + var(--header-overlay-top-gap, 12px))";

export function isBoxedHeaderStyle(headerStyle: string | undefined): boolean {
  return Boolean(headerStyle?.startsWith("boxed-"));
}

export function computeHeaderOverlayPaddingTop(
  overlay: ResolvedHeaderOverlay | undefined
): string | undefined {
  if (!overlay?.enabled) return undefined;
  if (overlay.contentInset === "custom" && overlay.paddingTop) {
    return overlay.paddingTop;
  }
  return HEADER_OVERLAY_AUTO_PADDING;
}

/** @deprecated Legacy block settings — read only for backward compatibility */
function getLegacyBlockHeaderOverlay(block: BlockNode | undefined): {
  enabled?: boolean;
  surface?: "transparent" | "glass" | "solid";
  contentInset?: "auto" | "custom";
  paddingTop?: string;
} | undefined {
  if (!block) return undefined;
  const raw = getBlockSettings(block).headerOverlay;
  if (!raw || typeof raw !== "object") return undefined;
  return raw as {
    enabled?: boolean;
    surface?: "transparent" | "glass" | "solid";
    contentInset?: "auto" | "custom";
    paddingTop?: string;
  };
}

/** Resolve active first-block header overlay from header workspace (with legacy block fallback). */
export function resolvePageHeaderOverlay(
  headerSettings: HeaderBuilderSettings,
  blocks?: PageBlocks,
  options?: { composition?: Composition; layoutType?: LayoutType }
): ResolvedHeaderOverlay | null {
  const surface = headerSettings.overlaySurface ?? "glass";
  const fromHeader = headerSettings.firstBlockHeaderOverlay;

  if (fromHeader?.enabled) {
    return {
      enabled: true,
      surface,
      contentInset: fromHeader.contentInset,
      paddingTop: fromHeader.paddingTop,
    };
  }

  const primaryBlock = resolveHeroBlock(options?.composition, options?.layoutType) ?? blocks?.[0];
  const legacy = getLegacyBlockHeaderOverlay(primaryBlock);
  if (legacy?.enabled) {
    return {
      enabled: true,
      surface: legacy.surface ?? surface,
      contentInset: legacy.contentInset,
      paddingTop: legacy.paddingTop,
    };
  }

  return null;
}

export function isPageHeaderOverlayActive(
  headerSettings: HeaderBuilderSettings,
  blocks?: PageBlocks,
  options?: { composition?: Composition; layoutType?: LayoutType }
): boolean {
  return resolvePageHeaderOverlay(headerSettings, blocks, options)?.enabled === true;
}

/**
 * DOM attributes for pages that opt into header overlay.
 * Pass `hasUnderlay: false` (or omit enabling) for pages without a media surface
 * (minimal catalog titles, product PDP, text-only blog) so the header stays normal.
 */
export function pageHeaderOverlayDataAttributes(
  overlay: ResolvedHeaderOverlay | null | undefined,
  options?: { hasUnderlay?: boolean },
): Record<string, string> {
  if (!overlay?.enabled) return {};
  if (options?.hasUnderlay === false) return {};
  return {
    "data-page-header-overlay": "true",
    "data-page-header-overlay-surface": overlay.surface ?? "glass",
    "data-header-overlay-underlay": "true",
  };
}

/** Catalog listing hero styles that provide a visual underlay for the header. */
export function catalogHeroSupportsHeaderOverlay(
  style: string | undefined,
): boolean {
  return style === "banner" || style === "split";
}

/** Block types that provide a media underlay suitable for header overlay. */
export const HEADER_OVERLAY_MEDIA_BLOCK_TYPES = new Set([
  "hero",
  "videoHero",
  "videoGallery",
  "beforeAfter",
  "interactiveHotspots",
  "masonryGallery",
  "gallery",
  "image",
]);

export function firstBlockSupportsHeaderOverlay(
  block: BlockNode | undefined,
): boolean {
  if (!block?.type) return false;
  return HEADER_OVERLAY_MEDIA_BLOCK_TYPES.has(block.type);
}

export function resolveHeroBlock(
  composition?: Composition,
  layoutType?: LayoutType,
): BlockNode | undefined {
  if (!composition) return undefined;
  if (composition.layout.topSection?.enabled && composition.regions.top[0]) {
    return composition.regions.top[0];
  }
  const type = layoutType ?? composition.layout.type;
  const definition = layoutRegistry.get(type);
  if (!definition) return composition.regions.primary[0];
  return composition.regions[definition.primaryRegion]?.[0];
}
