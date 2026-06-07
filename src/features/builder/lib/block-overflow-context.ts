import type { BlockNode } from "@/types/builder";
import type { BlockType } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { CONTENT_OVERFLOW_CAPABLE_TYPES } from "@/features/builder/registry/definitions";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

export function isContentOverflowCapable(type: BlockType): boolean {
  return CONTENT_OVERFLOW_CAPABLE_TYPES.has(type);
}

export function resolveOverflowContextForBlock(
  block: BlockNode,
  previewDevice?: DeviceBreakpoint
): BlockOverflowContext | undefined {
  if (!isContentOverflowCapable(block.type)) return undefined;
  return {
    flags: resolveContentOverflowCssFlags(block),
    previewDevice,
  };
}
