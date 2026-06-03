import type { BlockNode } from "@/types/builder";
import type {
  BlockAnimationSettings,
  BlockResponsiveOverride,
  BlockResponsiveSettings,
  BlockStyleSettings,
  BlockVisibilityRules,
  DeviceBreakpoint,
} from "@/types/block-system";

export function updateBlockStyles(
  block: BlockNode,
  styles: Partial<BlockStyleSettings>
): BlockNode {
  return { ...block, styles: { ...block.styles, ...styles } };
}

export function updateBlockResponsive(
  block: BlockNode,
  device: DeviceBreakpoint,
  patch: Partial<BlockStyleSettings> & Partial<BlockResponsiveOverride>
): BlockNode {
  const responsive: BlockResponsiveSettings = { ...block.responsive };
  responsive[device] = { ...responsive[device], ...patch };
  return { ...block, responsive };
}

export function updateBlockVisibility(
  block: BlockNode,
  visibility: Partial<BlockVisibilityRules>
): BlockNode {
  return { ...block, visibility: { ...block.visibility, ...visibility } };
}

export function updateBlockAnimation(
  block: BlockNode,
  animation: Partial<BlockAnimationSettings>
): BlockNode {
  return { ...block, animation: { ...block.animation, ...animation } };
}

export function updateBlockVisual(
  block: BlockNode,
  visual: Partial<import("@/types/block-system").BlockVisualSettings>
): BlockNode {
  return { ...block, visual: { ...block.visual, ...visual } };
}
