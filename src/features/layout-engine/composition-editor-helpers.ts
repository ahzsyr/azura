import { updateBlockInTree } from "@/features/builder/block-tree";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { Composition, RegionId } from "@/features/layout-engine/types";
import { getEditorRegionOrder, isTopSectionEnabled } from "@/features/layout-engine/types";
import { layoutRegistry } from "@/features/layout-engine/layout-registry";

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
