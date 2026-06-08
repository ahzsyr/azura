import type { ThemeTokens } from "@/types/theme";

export const MOTION_TOKENS = {
  scale: "--motion-scale",
  speed: "--animation-speed",
  durationFast: "--motion-duration-fast",
  durationNormal: "--motion-duration-normal",
  durationSlow: "--motion-duration-slow",
  easeStandard: "--motion-ease-standard",
  easeEmphasized: "--motion-ease-emphasized",
} as const;

const EASE_STANDARD = "cubic-bezier(0.4, 0, 0.2, 1)";
const EASE_EMPHASIZED = "cubic-bezier(0.2, 0, 0, 1)";

export function buildMotionCss(tokens: ThemeTokens): string {
  const factor = tokens.animationsEnabled ? tokens.animationSpeed : 0.01;
  const fast = `${Math.round(150 * factor)}ms`;
  const normal = `${Math.round(300 * factor)}ms`;
  const slow = `${Math.round(500 * factor)}ms`;

  if (!tokens.animationsEnabled) {
    return `@layer tokens {
  html { --motion-scale:0; --animation-speed:0; }
}
@layer utilities {
  html[data-motion="off"] *,
  html:not([data-motion]) * {
    animation-duration:0.01ms !important;
    animation-iteration-count:1 !important;
    transition-duration:0.01ms !important;
  }
}`;
  }

  return `@layer tokens {
  html {
    --motion-scale:${tokens.animationSpeed};
    --animation-speed:${tokens.animationSpeed};
    --motion-duration-fast:${fast};
    --motion-duration-normal:${normal};
    --motion-duration-slow:${slow};
    --motion-ease-standard:${EASE_STANDARD};
    --motion-ease-emphasized:${EASE_EMPHASIZED};
  }
}`;
}
