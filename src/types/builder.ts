export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "gallery"
  | "faq"
  | "testimonials"
  | "pricing"
  | "cta"
  | "video"
  | "richText"
  | "catalog"
  | "contentList"
  | "customHtml"
  | "spacer"
  | "divider"
  | "section"
  | "inquiryForm";

import type {
  BlockAnimationSettings,
  BlockLocalizationSettings,
  BlockResponsiveSettings,
  BlockSeoSettings,
  BlockStyleSettings,
  BlockSystemVersion,
  BlockVisibilityRules,
  BlockVisualSettings,
} from "@/types/block-system";

/**
 * Block instance on a page. Supports unlimited instances of the same type.
 * Legacy v1 uses `props`; v2 uses `settings` plus optional style/visibility layers.
 */
export type BlockNode = {
  id: string;
  type: BlockType;
  version?: BlockSystemVersion;
  /** @deprecated v1 — use settings; kept for backward compatibility */
  props: Record<string, unknown>;
  settings?: Record<string, unknown>;
  styles?: BlockStyleSettings;
  responsive?: BlockResponsiveSettings;
  localization?: BlockLocalizationSettings;
  visibility?: BlockVisibilityRules;
  seo?: BlockSeoSettings;
  animation?: BlockAnimationSettings;
  visual?: BlockVisualSettings;
  children?: BlockNode[];
};

export type PageBlocks = BlockNode[];
