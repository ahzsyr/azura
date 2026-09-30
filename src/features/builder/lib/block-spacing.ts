import type { BlockNode } from "@/types/builder";
import type { BlockStyleSettings } from "@/types/block-system";

/** True when the block has explicit top/bottom spacing authored in styles. */
export function blockOwnsSectionSpacing(styles?: BlockStyleSettings | null): boolean {
  if (!styles) return false;
  return (
    styles.paddingTop !== undefined ||
    styles.paddingBottom !== undefined ||
    styles.paddingTopPreset !== undefined ||
    styles.paddingBottomPreset !== undefined ||
    styles.sectionSpacing !== undefined ||
    styles.sectionSpacingPreset !== undefined
  );
}

export function blockNodeOwnsSectionSpacing(block: BlockNode): boolean {
  if (blockOwnsSectionSpacing(block.styles)) return true;
  const responsive = block.responsive;
  if (!responsive) return false;
  return (["desktop", "tablet", "mobile"] as const).some((bp) =>
    blockOwnsSectionSpacing(responsive[bp]),
  );
}
