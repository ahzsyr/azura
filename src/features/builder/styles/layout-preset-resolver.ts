import type { BlockLayoutStyles, BlockStyleSettings } from "@/types/block-system";
import {
  MAX_WIDTH_PRESET_VALUES,
  MIN_HEIGHT_PRESET_VALUES,
  SECTION_SPACING_PRESET_VALUES,
  WIDTH_PRESET_VALUES,
  type MaxWidthPreset,
  type MinHeightPreset,
  type SectionSpacingPreset,
  type WidthPreset,
} from "@/features/builder/constants/layout-presets";

export function resolveLayoutFromPresets(styles: BlockStyleSettings): BlockStyleSettings {
  const next = { ...styles };

  const widthPreset = styles.widthPreset as WidthPreset | undefined;
  if (widthPreset && widthPreset !== "custom") {
    next.width = WIDTH_PRESET_VALUES[widthPreset];
  }

  const maxWidthPreset = styles.maxWidthPreset as MaxWidthPreset | undefined;
  if (maxWidthPreset && maxWidthPreset !== "custom") {
    const v = MAX_WIDTH_PRESET_VALUES[maxWidthPreset];
    next.maxWidth = v === "none" ? undefined : v;
    if (v === "none") delete next.maxWidth;
  }

  const minHeightPreset = styles.minHeightPreset as MinHeightPreset | undefined;
  if (minHeightPreset && minHeightPreset !== "custom") {
    next.minHeight = MIN_HEIGHT_PRESET_VALUES[minHeightPreset];
  }

  const sectionSpacingPreset = styles.sectionSpacingPreset as SectionSpacingPreset | undefined;
  if (sectionSpacingPreset && sectionSpacingPreset !== "custom") {
    next.sectionSpacing = SECTION_SPACING_PRESET_VALUES[sectionSpacingPreset];
  }

  return next;
}

export function inferWidthPreset(width: BlockLayoutStyles["width"]): WidthPreset {
  if (width === undefined || width === "") return "full";
  if (width === "100%" || width === "100vw") return "full";
  if (width === "fit-content") return "fit";
  return "custom";
}

export function inferMaxWidthPreset(maxWidth: BlockLayoutStyles["maxWidth"]): MaxWidthPreset {
  if (maxWidth === undefined || maxWidth === "" || maxWidth === "none") return "full";
  if (maxWidth === "80rem" || maxWidth === "1280px") return "page";
  if (maxWidth === "90rem" || maxWidth === "1440px") return "wide";
  if (maxWidth === "48rem" || maxWidth === "768px") return "narrow";
  return "custom";
}

export function inferMinHeightPreset(minHeight: BlockLayoutStyles["minHeight"]): MinHeightPreset {
  if (minHeight === undefined || minHeight === "" || minHeight === "auto") return "auto";
  if (minHeight === "40vh") return "40vh";
  if (minHeight === "50vh") return "50vh";
  if (minHeight === "75vh") return "75vh";
  if (minHeight === "100vh" || minHeight === "100dvh") return "screen";
  return "custom";
}

export function inferSectionSpacingPreset(
  spacing: BlockLayoutStyles["sectionSpacing"]
): SectionSpacingPreset {
  if (spacing === undefined || spacing === "" || spacing === 0) return "none";
  if (spacing === "2rem" || spacing === 32) return "compact";
  if (spacing === "4rem" || spacing === 64) return "default";
  if (spacing === "6rem" || spacing === 96) return "large";
  return "custom";
}
