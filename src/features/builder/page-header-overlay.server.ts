import "server-only";

import { cache } from "react";
import type { PageBlocks } from "@/types/builder";
import type { Composition, LayoutType } from "@/features/layout-engine/types";
import { resolveHeroBlock } from "@/features/builder/header-overlay";
import { navigationService } from "@/features/navigation/navigation.service";
import type { HeaderBuilderSettings } from "@/features/navigation/types";
import {
  firstBlockSupportsHeaderOverlay,
  pageHeaderOverlayDataAttributes,
  resolvePageHeaderOverlay,
} from "@/features/builder/header-overlay";

export function resolvePageHeaderOverlayContext(
  headerSettings: HeaderBuilderSettings,
  blocks?: PageBlocks,
  options?: { hasUnderlay?: boolean; composition?: Composition; layoutType?: LayoutType },
) {
  const overlay = resolvePageHeaderOverlay(headerSettings, blocks, options);
  const heroBlock = resolveHeroBlock(options?.composition, options?.layoutType);
  const hasUnderlay =
    options?.hasUnderlay ??
    (heroBlock ? firstBlockSupportsHeaderOverlay(heroBlock) : blocks != null ? firstBlockSupportsHeaderOverlay(blocks[0]) : true);
  const active = overlay?.enabled === true && hasUnderlay;
  return {
    overlay: active ? overlay : overlay?.enabled ? { ...overlay, enabled: false } : null,
    /** Preference enabled in header settings (ignores underlay gate). */
    preferred: overlay?.enabled === true,
    active,
    dataAttributes: pageHeaderOverlayDataAttributes(overlay, { hasUnderlay }),
  };
}

/** Loads header workspace settings and resolves overlay for public page renderers. */
export const loadPageHeaderOverlay = cache(
  async (
    locale: string,
    blocks?: PageBlocks,
    options?: { hasUnderlay?: boolean; composition?: Composition; layoutType?: LayoutType },
  ) => {
    const workspace = await navigationService.getWorkspaceForSite(undefined, locale);
    return resolvePageHeaderOverlayContext(workspace.settings, blocks, options);
  },
);
