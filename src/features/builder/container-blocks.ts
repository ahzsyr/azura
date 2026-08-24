import type { BlockType } from "@/types/builder";

export const SECTION_LAYOUT_MODES = [
  "stack",
  "splitLeft",
  "splitRight",
  "grid",
  "slider",
] as const;
export type SectionLayoutMode = (typeof SECTION_LAYOUT_MODES)[number];

export const CONTAINER_BLOCK_TYPES = ["section", "rowSection", "contactSection"] as const;
export type ContainerBlockType = (typeof CONTAINER_BLOCK_TYPES)[number];

export function isContainerBlock(type: BlockType): type is ContainerBlockType {
  return (CONTAINER_BLOCK_TYPES as readonly string[]).includes(type);
}

export function containerMaxChildren(
  type: BlockType,
  props: Record<string, unknown>
): number | null {
  if (type === "rowSection") {
    const max = props.maxColumns;
    if (max === 2 || max === 3 || max === 4) return max;
    return 2;
  }
  if (type === "section") return null;
  if (type === "contactSection") return null;
  return null;
}

export function rowSectionColumnLayoutsForMax(maxColumns: number): string[] {
  if (maxColumns === 2) return ["equal", "wide-left", "wide-right"];
  if (maxColumns === 3) return ["equal-thirds"];
  if (maxColumns === 4) return ["equal-quarters"];
  return ["equal"];
}

export function resolveRowSectionGridTemplate(
  columnLayout: string,
  maxColumns: number
): string {
  switch (columnLayout) {
    case "wide-left":
      return "2fr 1fr";
    case "wide-right":
      return "1fr 2fr";
    case "equal-thirds":
      return "repeat(3, minmax(0, 1fr))";
    case "equal-quarters":
      return "repeat(4, minmax(0, 1fr))";
    case "equal":
    default:
      return maxColumns === 3
        ? "repeat(3, minmax(0, 1fr))"
        : maxColumns === 4
          ? "repeat(4, minmax(0, 1fr))"
          : "repeat(2, minmax(0, 1fr))";
  }
}

export function normalizeSectionLayoutMode(value: unknown): SectionLayoutMode {
  if (
    typeof value === "string" &&
    (SECTION_LAYOUT_MODES as readonly string[]).includes(value)
  ) {
    return value as SectionLayoutMode;
  }
  return "stack";
}

export function normalizeSectionColumns(value: unknown): 2 | 3 | 4 {
  const n = Number(value);
  if (n === 2 || n === 3 || n === 4) return n;
  return 2;
}

export function normalizeSectionSlidesPerView(value: unknown): 1 | 2 | 3 {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return 1;
}

export function normalizeSectionGap(value: unknown): "sm" | "md" | "lg" {
  if (value === "sm" || value === "lg") return value;
  return "md";
}

export function normalizeSectionMaxWidth(value: unknown): "full" | "container" | "narrow" {
  if (value === "container" || value === "narrow") return value;
  return "full";
}

export function resolveSectionEffectiveLayout(
  layoutMode: SectionLayoutMode,
  childCount: number
): SectionLayoutMode {
  if ((layoutMode === "splitLeft" || layoutMode === "splitRight") && childCount < 2) {
    return "stack";
  }
  if (layoutMode === "grid" && childCount < 2) {
    return "stack";
  }
  if (layoutMode === "slider" && childCount < 2) {
    return "stack";
  }
  return layoutMode;
}

export function resolveSectionSplitGridTemplate(
  layoutMode: "splitLeft" | "splitRight"
): string {
  return layoutMode === "splitLeft" ? "2fr 1fr" : "1fr 2fr";
}

export function resolveSectionGridTemplate(columns: number): string {
  return `repeat(${columns}, minmax(0, 1fr))`;
}

export function sectionLayoutGapClass(gap: string): string {
  if (gap === "sm") return "section-layout-grid--gap-sm";
  if (gap === "lg") return "section-layout-grid--gap-lg";
  return "section-layout-grid--gap-md";
}

export function sectionLayoutMaxWidthClass(maxWidth: string): string {
  if (maxWidth === "narrow") return "max-w-3xl mx-auto w-full";
  if (maxWidth === "container") return "w-full";
  return "w-full";
}

export function sectionLayoutGridColumnClass(columns: number): string {
  if (columns === 4) return "section-layout-grid--cols-4";
  if (columns === 3) return "section-layout-grid--cols-3";
  return "section-layout-grid--cols-2";
}
