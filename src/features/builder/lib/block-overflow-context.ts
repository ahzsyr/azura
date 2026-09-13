import type { BlockNode } from "@/types/builder";
import type { BlockType } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { CONTENT_OVERFLOW_CAPABLE_TYPES } from "@/features/builder/registry/definitions";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

export function isContentOverflowCapable(type: BlockType): boolean {
  return CONTENT_OVERFLOW_CAPABLE_TYPES.has(type);
}

function blockHasCustomOverflow(block: BlockNode): boolean {
  const settings = block.settings ?? {};
  const props = (block.props ?? {}) as Record<string, unknown>;
  const direct = settings.contentOverflow ?? props.contentOverflow;
  if (direct && typeof direct === "object" && Object.keys(direct as object).length > 0) {
    return true;
  }
  for (const bp of ["desktop", "tablet", "mobile"] as const) {
    const layer = block.responsive?.[bp]?.contentOverflow;
    if (layer && typeof layer === "object" && Object.keys(layer).length > 0) {
      return true;
    }
  }
  return false;
}

export function resolveOverflowContextForBlock(
  block: BlockNode,
  previewDevice?: DeviceBreakpoint,
): BlockOverflowContext | undefined {
  if (!isContentOverflowCapable(block.type)) return undefined;
  if (!blockHasCustomOverflow(block)) return undefined;
  return {
    flags: resolveContentOverflowCssFlags(block),
    previewDevice,
  };
}
