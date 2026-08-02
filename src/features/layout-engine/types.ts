import type { PageBlocks } from "@/types/builder";

export type RegionId = "top" | "primary" | "asideStart" | "asideEnd";

export type ColumnRatioToken =
  | "equal"
  | "20-80"
  | "25-75"
  | "30-70"
  | "80-20"
  | "75-25"
  | "70-30"
  | "20-60-20"
  | "25-50-25"
  | "20-50-30"
  | "golden"
  | "custom";

export type LayoutType =
  | "full"
  | "left-sidebar"
  | "right-sidebar"
  | "three-column"
  | "split";

export type TopSectionWidth = "full" | "boxed";

export type StickyScrollMode = "document" | "main-only";

export type BreakpointBehavior = {
  stackOrder: RegionId[];
  regionVisibility: Partial<Record<RegionId, boolean>>;
};

export type LayoutSpacing = {
  gap?: "sm" | "md" | "lg" | "xl" | "custom";
  gapCustomPx?: number;
  padding?: "none" | "sm" | "md" | "lg";
  maxWidth?: "full" | "page" | "wide" | "narrow" | "custom";
  container?: "boxed" | "fluid";
};

export type RegionAuthoredConfig = {
  ratio?: ColumnRatioToken;
  sticky?: boolean;
};

export type LayoutSettings = {
  type: LayoutType;
  spacing: LayoutSpacing;
  verticalAlign?: "start" | "center" | "end" | "stretch";
  topSection?: {
    enabled: boolean;
    width?: TopSectionWidth;
  };
  stickyScroll?: StickyScrollMode;
  regions: Partial<Record<RegionId, RegionAuthoredConfig>>;
  responsive?: {
    tablet?: BreakpointBehavior;
    mobile?: BreakpointBehavior;
  };
};

/**
 * Metadata is reserved for future experience-layer capabilities.
 *
 * Ownership rules:
 * - Only experience-layer capabilities may write here.
 * - Never store block data here.
 * - Never store layout definitions here.
 * - v1 intentionally remains empty.
 */
export type CompositionMetadata = {
  [key: string]: never;
};

export type Composition = {
  version: 1;
  layout: LayoutSettings;
  regions: Record<RegionId, PageBlocks>;
  hiddenRegions: Record<RegionId, PageBlocks>;
  metadata: CompositionMetadata;
};

export type LayoutRenderOptions = {
  supportedRegions?: RegionId[];
  locale: string;
};

export type RegionPolicy = {
  allowedCategories?: string[];
  disallowedBlockTypes?: string[];
};

export type LayoutSwitchEntry = {
  from: LayoutType;
  to: LayoutType;
  regionMap: Partial<Record<RegionId, RegionId | null | "restore">>;
};

export type LayoutDefinition = {
  type: LayoutType;
  name: string;
  editorDescription: string;
  activeRegions: RegionId[];
  primaryRegion: RegionId;
  defaultRatio?: ColumnRatioToken;
  defaultResponsive?: {
    tablet?: BreakpointBehavior;
    mobile?: BreakpointBehavior;
  };
  supportsTopSection: boolean;
  supportsStickyAside: boolean;
  supportsCustomRatio: boolean;
  supportsResponsiveVisibility: boolean;
  regionPolicies?: Partial<Record<RegionId, RegionPolicy>>;
  switchMap: LayoutSwitchEntry[];
};

/** Block storage iteration order (includes optional top region). */
export const DEFAULT_REGION_ORDER: RegionId[] = ["top", "primary", "asideStart", "asideEnd"];

/** Column-only regions used by layout grid definitions. */
export const COLUMN_REGION_ORDER: RegionId[] = ["primary", "asideStart", "asideEnd"];

export function createEmptyRegionRecord(): Record<RegionId, PageBlocks> {
  return {
    top: [],
    primary: [],
    asideStart: [],
    asideEnd: [],
  };
}

export function isRegionId(value: unknown): value is RegionId {
  return (
    value === "top" ||
    value === "primary" ||
    value === "asideStart" ||
    value === "asideEnd"
  );
}

export function isTopSectionEnabled(layout: LayoutSettings): boolean {
  return layout.topSection?.enabled === true;
}

export function getEditorRegionOrder(
  layout: LayoutSettings,
  activeRegions: RegionId[],
): RegionId[] {
  const regions: RegionId[] = [];
  if (isTopSectionEnabled(layout)) regions.push("top");
  for (const regionId of activeRegions) {
    if (regionId !== "top") regions.push(regionId);
  }
  return regions;
}
