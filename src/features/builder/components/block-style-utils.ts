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

/** True when block Look & Feel section background should drive the outer wrapper. */
export function hasActiveBlockVisualBackground(block: BlockNode): boolean {
  const type = block.visual?.sectionBackground?.type;
  return Boolean(type && type !== "none");
}

export function resolveMarketingBackgroundType(
  block: BlockNode,
  propsBackgroundType: string | undefined,
  defaultType = "gradient"
): string {
  if (hasActiveBlockVisualBackground(block)) {
    return "transparent";
  }
  return propsBackgroundType ?? defaultType;
}
