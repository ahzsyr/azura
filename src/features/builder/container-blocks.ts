import type { BlockType } from "@/types/builder";

export const CONTAINER_BLOCK_TYPES = ["section", "rowSection"] as const;
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
