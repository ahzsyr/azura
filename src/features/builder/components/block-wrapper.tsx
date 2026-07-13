import { memo, type CSSProperties, type ReactNode } from "react";
import type { BlockNode } from "@/types/builder";
import type { BlockRenderContext, BlockSectionBackground, DeviceBreakpoint } from "@/types/block-system";
import { resolveBlockStyles } from "@/features/builder/styles/style-resolver";
import {
  getLocaleStyleOverride,
  getLocaleVisibilityOverride,
} from "@/features/builder/localization/block-localization";
import { evaluateVisibility } from "@/features/builder/visibility/visibility-resolver";
import { isBlockHidden } from "@/features/builder/lib/block-hidden";
import {
  animationInlineStyle,
  resolveAnimationClasses,
  resolveScrollRevealAttributes,
} from "@/features/builder/animation/animation-resolver";
import { resolveBlockSeo } from "@/features/builder/seo/block-seo";
import { resolveBlockHeadingTextEffect } from "@/features/theme/visual-experience-resolver";
import { sectionBackgroundToCss } from "@/features/theme/backgrounds/background-system";
import { SectionBackgroundLayers } from "@/components/theme/section-background-layers";
import { blockNodeOwnsSectionSpacing } from "@/features/builder/lib/block-spacing";
import { BlockSpacingProvider } from "@/features/builder/lib/block-spacing-context";
import { getBlockSettings } from "@/features/builder/instance/block-instance";

type BlockWrapperProps = {
  block: BlockNode;
  children: ReactNode;
  ctx: BlockRenderContext;
  className?: string;
  firstBlockOverlayActive?: boolean;
  blockIndex?: number;
  lazyLoad?: boolean;
};

function detectDevice(): DeviceBreakpoint {
  return "desktop";
}

function sectionBackgroundStyle(bg: BlockSectionBackground | undefined): CSSProperties {
  return sectionBackgroundToCss(bg);
}

export const BlockWrapper = memo(function BlockWrapper({
  block,
  children,
  ctx,
  className = "",
  firstBlockOverlayActive = false,
  blockIndex = 0,
  lazyLoad = true,
}: BlockWrapperProps) {
  const device = ctx.device ?? detectDevice();
  const localeStyles = getLocaleStyleOverride(block, ctx.locale);
  const localeVisibility = getLocaleVisibilityOverride(block, ctx.locale);
  const siteTextEffect = ctx.siteTextEffect ?? ctx.theme?.textEffect ?? null;
  const headingTextEffect = resolveBlockHeadingTextEffect(block.visual, siteTextEffect);

  if (isBlockHidden(block) && !ctx.previewMode) return null;

  const visible = evaluateVisibility(block.visibility, { ...ctx, device }, localeVisibility);
  if (!visible) return null;

  const resolved = resolveBlockStyles({
    blockId: block.id,
    styles: block.styles,
    responsive: block.responsive,
    localeStyles,
    breakpoint: device,
    theme: ctx.theme,
  });

  if (resolved.hidden) return null;

  const pageAnimationsEnabled = ctx.pageAnimationsEnabled;
  const themeForAnim =
    pageAnimationsEnabled === false && ctx.theme
      ? { ...ctx.theme, animationsEnabled: false }
      : ctx.theme;

  const animClasses = resolveAnimationClasses(block.animation, themeForAnim, blockIndex);
  const animStyle = animationInlineStyle(block.animation, blockIndex);
  const scrollAttrs = resolveScrollRevealAttributes(block.animation, themeForAnim, blockIndex);
  const lazyBlockAttrs =
    lazyLoad && blockIndex > 2 && !ctx.previewMode ? { "data-lazy-block": "true" } : {};
  const seo = resolveBlockSeo(block.seo);
  const sectionBg = block.visual?.sectionBackground;
  const sectionStyle = sectionBackgroundStyle(sectionBg);
  // Inner hero owns overlay pull-up / full-bleed breakout. Outer must not clip them.
  const heroLayout =
    block.type === "hero" || block.type === "videoHero"
      ? String(getBlockSettings(block).layout ?? "")
      : "";
  const needsShellBreakout =
    firstBlockOverlayActive || heroLayout === "fullBleed";
  const hasSectionBg = Boolean(sectionBg?.type && sectionBg.type !== "none");

  const combinedClass = [
    resolved.className,
    animClasses,
    firstBlockOverlayActive ? "block-header-underlay" : "",
    hasSectionBg ? "relative" : "",
    hasSectionBg && !needsShellBreakout ? "overflow-hidden" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cursorOff = block.visual?.siteEffects?.cursor === "off";
  const textOff = block.visual?.siteEffects?.text === "off";
  const ownsSectionSpacing = blockNodeOwnsSectionSpacing(block);

  return (
    <BlockSpacingProvider ownsSpacing={ownsSectionSpacing}>
      <div
      className={combinedClass}
      style={{ ...resolved.style, ...animStyle, ...sectionStyle }}
      {...resolved.dataAttributes}
      {...scrollAttrs}
      {...lazyBlockAttrs}
      data-block-type={block.type}
      data-block-version={block.version ?? "1.0"}
      data-block-index={String(blockIndex)}
      {...(firstBlockOverlayActive ? { "data-header-overlay-block": "true" } : {})}
      {...(needsShellBreakout ? { "data-hero-shell-breakout": "true" } : {})}
      {...(seo.jsonLd ? { "data-block-jsonld": "true" } : {})}
      {...(cursorOff ? { "data-block-cursor-off": "true" } : {})}
      {...(textOff ? { "data-text-effect-off": "true" } : {})}
      {...(headingTextEffect ? { "data-block-heading-effect": headingTextEffect } : {})}
      suppressHydrationWarning
    >
      <SectionBackgroundLayers bg={sectionBg} />
      {children}
    </div>
    </BlockSpacingProvider>
  );
});
