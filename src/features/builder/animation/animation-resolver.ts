import type { CSSProperties } from "react";
import type { BlockAnimationSettings } from "@/types/block-system";
import type { ThemeTokens } from "@/types/theme";

const ANIMATION_CLASS_MAP: Record<string, string> = {
  fade: "block-anim-fade",
  slide: "block-anim-slide",
  zoom: "block-anim-zoom",
  rotate: "block-anim-rotate",
  scale: "block-anim-scale",
  bounce: "block-anim-bounce",
  none: "",
};

function isLoopBehavior(animation: BlockAnimationSettings | undefined): boolean {
  return animation?.behavior === "loop";
}

/** Keyframe entrance runs on load; scroll reveal handles below-the-fold blocks in once mode. */
function usesEntranceKeyframes(
  animation: BlockAnimationSettings | undefined,
  blockIndex: number,
): boolean {
  if (!animation?.enabled) return false;
  if (isLoopBehavior(animation)) return true;
  return blockIndex <= 1;
}

function hasEntranceType(animation: BlockAnimationSettings | undefined): boolean {
  const entrance = animation?.entrance?.type ?? "none";
  return entrance !== "none" && Boolean(ANIMATION_CLASS_MAP[entrance]);
}

export function resolveAnimationClasses(
  animation: BlockAnimationSettings | undefined,
  theme?: ThemeTokens,
  blockIndex = 0,
): string {
  if (theme?.animationsEnabled === false) return "";
  if (!animation?.enabled) return "";

  const classes: string[] = ["block-anim-root"];

  if (isLoopBehavior(animation)) {
    classes.push("block-anim-loop");
  } else {
    classes.push("block-anim-once");
  }

  if (usesEntranceKeyframes(animation, blockIndex) && hasEntranceType(animation)) {
    const entrance = animation!.entrance!.type!;
    classes.push(ANIMATION_CLASS_MAP[entrance], "block-anim-entrance");
  }

  if (animation.hover?.type && animation.hover.type !== "none") {
    classes.push("block-anim-hover", ANIMATION_CLASS_MAP[animation.hover.type] ?? "");
  }

  return classes.filter(Boolean).join(" ");
}

export function animationInlineStyle(
  animation: BlockAnimationSettings | undefined,
  blockIndex = 0,
): CSSProperties {
  if (!usesEntranceKeyframes(animation, blockIndex)) return {};

  const phase = animation?.entrance;
  if (!phase) return {};

  return {
    animationDuration: phase.durationMs ? `${phase.durationMs}ms` : undefined,
    animationDelay: phase.delayMs ? `${phase.delayMs}ms` : undefined,
    animationTimingFunction: phase.easing,
    animationIterationCount: isLoopBehavior(animation) ? "infinite" : 1,
  };
}

const SCROLL_ANIMATION_MAP: Record<string, string> = {
  fade: "fade",
  slide: "slide-up",
  zoom: "fade",
  scale: "fade",
  rotate: "fade",
  bounce: "slide-up",
  none: "",
};

export function resolveScrollRevealAttributes(
  animation: BlockAnimationSettings | undefined,
  theme?: ThemeTokens,
  blockIndex = 0,
): Record<string, string> {
  if (theme?.animationsEnabled === false) return {};
  if (!animation?.enabled) return {};
  if (isLoopBehavior(animation)) return {};
  if (blockIndex <= 1) return {};

  const scrollType = animation.scroll?.type;
  if (!scrollType || scrollType === "none") {
    const entrance = animation.entrance?.type;
    if (!entrance || entrance === "none") return {};
    const mapped = SCROLL_ANIMATION_MAP[entrance] ?? "fade";
    const delay = animation.entrance?.delayMs ?? 0;
    return {
      "data-animation": mapped,
      ...(delay > 0 ? { "data-delay": String(delay) } : {}),
    };
  }

  const mapped = SCROLL_ANIMATION_MAP[scrollType] ?? "fade";
  const delay = animation.scroll?.delayMs ?? 0;
  return {
    "data-animation": mapped,
    ...(delay > 0 ? { "data-delay": String(delay) } : {}),
  };
}
