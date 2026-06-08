import type { ThemeTokens } from "@/types/theme";
import { DEFAULT_MONO_FONT } from "@/features/theme/tokens/design-tokens";

export const FONT_FAMILY_TOKENS = {
  body: "--font-body",
  heading: "--font-heading",
  display: "--font-display",
  mono: "--font-mono",
  azBody: "--az-font-body",
  azDisplay: "--az-font-display",
  azMono: "--az-font-mono",
} as const;

export const FONT_SCALE_TOKENS = {
  root: "--font-size-root",
  base: "--font-size-base",
  headingScale: "--heading-scale",
  hero: "--az-fs-hero",
  h1: "--az-fs-h1",
  h2: "--az-fs-h2",
  h3: "--az-fs-h3",
  h4: "--az-fs-h4",
  body: "--az-fs-body",
  small: "--az-fs-small",
} as const;

/** Centralized typography CSS from theme tokens. */
export function buildTypographyCss(tokens: ThemeTokens): string {
  const c = tokens.typography;
  return `@layer tokens {
  html {
    --az-font-display:'${c.headingFont}',sans-serif;
    --az-font-body:'${c.bodyFont}',sans-serif;
    --az-font-mono:'${DEFAULT_MONO_FONT}',monospace;
    --font-display:var(--az-font-display);
    --font-body:var(--az-font-body);
    --font-mono:var(--az-font-mono);
    --font-heading:var(--az-font-display);
    --font-size-root:${c.baseFontSize};
    --font-size-base:${c.baseFontSize};
    --heading-scale:${c.headingScale};
    --az-fs-hero:clamp(2.4rem,6vw,5.5rem);
    --az-fs-h1:clamp(2rem,4.5vw,4rem);
    --az-fs-h2:clamp(1.5rem,3vw,2.75rem);
    --az-fs-h3:clamp(1.2rem,2vw,1.875rem);
    --az-fs-h4:clamp(1rem,1.5vw,1.375rem);
    --az-fs-body:clamp(0.9rem,1.2vw,1.0625rem);
    --az-fs-small:clamp(0.72rem,1vw,0.84rem);
    --az-fs-mono:clamp(0.65rem,0.9vw,0.78rem);
    --az-fs-label:clamp(0.6rem,0.8vw,0.72rem);
  }
}`;
}
