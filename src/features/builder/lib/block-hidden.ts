import type { BlockNode } from "@/types/builder";

export function isBlockHidden(block: BlockNode): boolean {
  return block.hidden === true;
}

export function setBlockHidden(block: BlockNode, hidden: boolean): BlockNode {
  return hidden ? { ...block, hidden: true } : { ...block, hidden: undefined };
}
