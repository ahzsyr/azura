import type { BlockNode, PageBlocks } from "@/types/builder";
import { createBlock } from "@/schemas/blocks";
import {
  containerMaxChildren,
  isContainerBlock,
} from "@/features/builder/container-blocks";

function cloneBlockWithNewIds(block: BlockNode): BlockNode {
  const cloned = createBlock(block.type, block.props) as BlockNode;
  const next: BlockNode = {
    ...block,
    id: cloned.id,
    type: block.type,
    props: cloned.props,
    settings: block.settings ?? cloned.settings,
  };
  if (block.children?.length) {
    next.children = block.children.map(cloneBlockWithNewIds);
  } else if (isContainerBlock(block.type)) {
    next.children = [];
  } else {
    delete next.children;
  }
  return next;
}

export function cloneBlocks(blocks: PageBlocks): PageBlocks {
  return JSON.parse(JSON.stringify(blocks)) as PageBlocks;
}

export function collectBlockIds(blocks: PageBlocks): string[] {
  const ids: string[] = [];
  const walk = (nodes: PageBlocks) => {
    for (const n of nodes) {
      ids.push(n.id);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(blocks);
  return ids;
}

export function updateBlockInTree(
  blocks: PageBlocks,
  blockId: string,
  updater: (block: BlockNode) => BlockNode
): PageBlocks {
  return blocks.map((block) => {
    if (block.id === blockId) return updater(block);
    if (block.children?.length) {
      return { ...block, children: updateBlockInTree(block.children, blockId, updater) };
    }
    return block;
  });
}

export function removeBlockFromTree(blocks: PageBlocks, blockId: string): PageBlocks {
  return blocks
    .filter((b) => b.id !== blockId)
    .map((block) =>
      block.children?.length
        ? { ...block, children: removeBlockFromTree(block.children, blockId) }
        : block
    );
}

export function insertBlockInTree(
  blocks: PageBlocks,
  block: BlockNode,
  parentId?: string | null
): PageBlocks {
  if (!parentId) return [...blocks, block];
  return updateBlockInTree(blocks, parentId, (parent) => {
    if (!isContainerBlock(parent.type)) return parent;
    const children = parent.children ?? [];
    const maxChildren = containerMaxChildren(parent.type, parent.props);
    if (maxChildren != null && children.length >= maxChildren) return parent;
    return { ...parent, children: [...children, block] };
  });
}

export function reorderBlocksAtLevel(blocks: PageBlocks, activeId: string, overId: string): PageBlocks {
  const oldIndex = blocks.findIndex((b) => b.id === activeId);
  const newIndex = blocks.findIndex((b) => b.id === overId);
  if (oldIndex < 0 || newIndex < 0) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

export function reorderInTree(blocks: PageBlocks, activeId: string, overId: string): PageBlocks {
  const activeRoot = blocks.some((b) => b.id === activeId);
  const overRoot = blocks.some((b) => b.id === overId);
  if (activeRoot && overRoot) return reorderBlocksAtLevel(blocks, activeId, overId);

  return blocks.map((block) => {
    if (!block.children?.length) return block;
    const childHasActive = block.children.some((c) => c.id === activeId);
    const childHasOver = block.children.some((c) => c.id === overId);
    if (childHasActive && childHasOver) {
      return { ...block, children: reorderBlocksAtLevel(block.children, activeId, overId) };
    }
    return { ...block, children: reorderInTree(block.children, activeId, overId) };
  });
}

export function duplicateBlockInTree(
  blocks: PageBlocks,
  blockId: string
): { blocks: PageBlocks; newId: string | null } {
  let newId: string | null = null;
  let duplicated = false;

  function walk(nodes: PageBlocks): PageBlocks {
    const idx = nodes.findIndex((b) => b.id === blockId);
    if (idx >= 0) {
      duplicated = true;
      const cloned = cloneBlockWithNewIds(nodes[idx]);
      newId = cloned.id;
      const next = [...nodes];
      next.splice(idx + 1, 0, cloned);
      return next;
    }
    return nodes.map((node) =>
      node.children?.length ? { ...node, children: walk(node.children) } : node
    );
  }

  const result = walk(blocks);
  return { blocks: duplicated ? result : blocks, newId };
}

export function moveBlockInTree(
  blocks: PageBlocks,
  blockId: string,
  direction: "up" | "down"
): PageBlocks {
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx >= 0) {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return blocks;
    return reorderBlocksAtLevel(blocks, blockId, blocks[newIdx].id);
  }
  return blocks.map((block) =>
    block.children?.length
      ? { ...block, children: moveBlockInTree(block.children, blockId, direction) }
      : block
  );
}

export function findBlockById(blocks: PageBlocks, id: string): BlockNode | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children?.length) {
      const found = findBlockById(b.children, id);
      if (found) return found;
    }
  }
  return null;
}
