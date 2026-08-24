import { updateBlockInTree } from "@/features/builder/block-tree";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { Composition, LayoutType, RegionId } from "@/features/layout-engine/types";
import { getEditorRegionOrder, isTopSectionEnabled } from "@/features/layout-engine/types";
import { layoutRegistry } from "@/features/layout-engine/layout-registry";

const LTR_PREVIEW_COLUMNS: Record<LayoutType, string> = {
  full: "1fr",
  "left-sidebar": "1fr 2fr",
  "right-sidebar": "2fr 1fr",
  "three-column": "1fr 2fr 1fr",
  split: "1fr 1fr",
};

export function findBlockById(blocks: PageBlocks, id: string): BlockNode | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children?.length) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getCompositionBlocks(composition: Composition): PageBlocks {
  return [
    ...composition.regions.top,
    ...composition.regions.primary,
    ...composition.regions.asideStart,
    ...composition.regions.asideEnd,
    ...composition.hiddenRegions.top,
    ...composition.hiddenRegions.primary,
    ...composition.hiddenRegions.asideStart,
    ...composition.hiddenRegions.asideEnd,
  ];
}

export function getCompositionRegionLabel(regionId: RegionId, isRtl: boolean): string {
  if (regionId === "top") return "Top";
  if (regionId === "primary") return "Main";
  if (regionId === "asideStart") return isRtl ? "Right Sidebar" : "Left Sidebar";
  return isRtl ? "Left Sidebar" : "Right Sidebar";
}

export function getLayoutDisplayName(type: LayoutType, isRtl: boolean): string {
  if (type === "left-sidebar") return isRtl ? "Right Sidebar" : "Left Sidebar";
  if (type === "right-sidebar") return isRtl ? "Left Sidebar" : "Right Sidebar";
  return layoutRegistry.getOrThrow(type).name;
}

/**
 * Admin chrome is LTR, so RTL previews must reverse track sizes AND region
 * order together. Reversing only one side swaps column widths onto the
 * wrong regions.
 */
export function getLayoutPreviewColumns(type: LayoutType, isRtl = false): string {
  const columns = LTR_PREVIEW_COLUMNS[type] ?? "1fr";
  if (!isRtl || type === "full") return columns;
  return columns.split(/\s+/).reverse().join(" ");
}

export function getLayoutPreviewRegions(activeRegions: RegionId[], isRtl: boolean): RegionId[] {
  if (!isRtl || activeRegions.length < 2) return activeRegions;
  return [...activeRegions].reverse();
}

export function getEditableRegions(composition: Composition): RegionId[] {
  const definition = layoutRegistry.getOrThrow(composition.layout.type);
  return getEditorRegionOrder(composition.layout, definition.activeRegions);
}

export function hasRenderableCompositionBlocks(composition: Composition): boolean {
  return (
    composition.regions.top.length > 0 ||
    composition.regions.primary.length > 0 ||
    composition.regions.asideStart.length > 0 ||
    composition.regions.asideEnd.length > 0
  );
}

export function updateCompositionBlock(
  composition: Composition,
  blockId: string,
  updater: (block: BlockNode) => BlockNode,
): Composition {
  const apply = (blocks: PageBlocks) => updateBlockInTree(blocks, blockId, updater);
  return {
    ...composition,
    regions: {
      top: apply(composition.regions.top),
      primary: apply(composition.regions.primary),
      asideStart: apply(composition.regions.asideStart),
      asideEnd: apply(composition.regions.asideEnd),
    },
    hiddenRegions: {
      top: apply(composition.hiddenRegions.top),
      primary: apply(composition.hiddenRegions.primary),
      asideStart: apply(composition.hiddenRegions.asideStart),
      asideEnd: apply(composition.hiddenRegions.asideEnd),
    },
  };
}

export function patchCompositionRegion(
  composition: Composition,
  regionId: RegionId,
  blocks: PageBlocks,
): Composition {
  return {
    ...composition,
    regions: {
      ...composition.regions,
      [regionId]: blocks,
    },
  };
}

export { isTopSectionEnabled };
