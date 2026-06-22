import type { BlockNode, PageBlocks } from "@/types/builder";
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
  blocks?: PageBlocks
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

  const legacy = getLegacyBlockHeaderOverlay(blocks?.[0]);
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
  blocks?: PageBlocks
): boolean {
  return resolvePageHeaderOverlay(headerSettings, blocks)?.enabled === true;
}
