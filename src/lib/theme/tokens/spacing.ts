import type { ThemeTokens } from "@/types/theme";

export const SPACING_TOKENS = {
  scale: "--spacing-scale",
  xs: "--az-space-xs",
  sm: "--az-space-sm",
  md: "--az-space-md",
  lg: "--az-space-lg",
  xl: "--az-space-xl",
  gapSm: "--az-gap-sm",
  gapMd: "--az-gap-md",
  gapLg: "--az-gap-lg",
  gapXl: "--az-gap-xl",
  spXs: "--az-sp-xs",
  spSm: "--az-sp-sm",
  spMd: "--az-sp-md",
  spLg: "--az-sp-lg",
  spXl: "--az-sp-xl",
  sp2xl: "--az-sp-2xl",
  sp3xl: "--az-sp-3xl",
} as const;

export function buildSpacingCss(tokens: ThemeTokens): string {
  const scale = tokens.spacingScale;
  return `html {
  --spacing-scale:${scale};
  --az-space-xs:0.25rem;
  --az-space-sm:0.5rem;
  --az-space-md:1rem;
  --az-space-lg:1.5rem;
  --az-space-xl:2rem;
  --az-sp-xs:clamp(0.25rem,0.5vw,0.5rem);
  --az-sp-sm:clamp(0.5rem,1vw,0.75rem);
  --az-sp-md:clamp(0.75rem,1.5vw,1.25rem);
  --az-sp-lg:clamp(1rem,2vw,2rem);
  --az-sp-xl:clamp(1.5rem,3vw,3.5rem);
  --az-sp-2xl:clamp(2rem,4.5vw,6rem);
  --az-sp-3xl:clamp(3rem,6vw,9rem);
  --az-gap-sm:clamp(0.5rem,1.5vw,1rem);
  --az-gap-md:clamp(1rem,2vw,1.5rem);
  --az-gap-lg:clamp(1.5rem,2.5vw,2.5rem);
  --az-gap-xl:clamp(2rem,3vw,4rem);
  --az-radius-sm:8px;
  --az-radius-md:12px;
  --az-radius-lg:16px;
}

html[data-spacing] .container-premium,
html[data-theme-spacing] .container-premium {
  padding-inline:calc(1rem * var(--spacing-scale));
}
html[data-spacing] .section-padding,
html[data-theme-spacing] .section-padding {
  padding-block:calc(5rem * var(--spacing-scale));
}`;
}
