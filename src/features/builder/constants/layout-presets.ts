import type { CssLength } from "@/types/block-system";

export type WidthPreset = "full" | "fit" | "custom";
export type MaxWidthPreset = "full" | "page" | "wide" | "narrow" | "custom";
export type MinHeightPreset = "auto" | "40vh" | "50vh" | "75vh" | "screen" | "custom";
export type SectionSpacingPreset = "none" | "compact" | "default" | "large" | "custom";

export const WIDTH_PRESET_VALUES: Record<Exclude<WidthPreset, "custom">, CssLength> = {
  full: "100%",
  fit: "fit-content",
};

export const MAX_WIDTH_PRESET_VALUES: Record<Exclude<MaxWidthPreset, "custom">, CssLength | "none"> = {
  full: "none",
  page: "var(--site-page-max-width)",
  wide: "1600px",
  narrow: "48rem",
};

export const MIN_HEIGHT_PRESET_VALUES: Record<Exclude<MinHeightPreset, "custom">, CssLength> = {
  auto: "auto",
  "40vh": "40vh",
  "50vh": "50vh",
  "75vh": "75vh",
  screen: "100vh",
};

export const SECTION_SPACING_PRESET_VALUES: Record<
  Exclude<SectionSpacingPreset, "custom">,
  CssLength
> = {
  none: 0,
  compact: "2rem",
  /** Matches theme `.section-padding` via shared CSS variable. */
  default: "var(--az-section-padding-block)",
  large: "6rem",
};

export const WIDTH_PRESET_OPTIONS: { value: WidthPreset; label: string }[] = [
  { value: "full", label: "Full width" },
  { value: "fit", label: "Content fit" },
  { value: "custom", label: "Custom" },
];

export const MAX_WIDTH_PRESET_OPTIONS: { value: MaxWidthPreset; label: string }[] = [
  { value: "full", label: "Full bleed" },
  { value: "page", label: "Page width" },
  { value: "wide", label: "Wide" },
  { value: "narrow", label: "Narrow" },
  { value: "custom", label: "Custom" },
];

export const MIN_HEIGHT_PRESET_OPTIONS: { value: MinHeightPreset; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "40vh", label: "40% viewport" },
  { value: "50vh", label: "50% viewport" },
  { value: "75vh", label: "75% viewport" },
  { value: "screen", label: "Full screen" },
  { value: "custom", label: "Custom" },
];

export const SECTION_SPACING_PRESET_OPTIONS: { value: SectionSpacingPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "custom", label: "Custom" },
];
