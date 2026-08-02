export type HeroEntranceEffect = "none" | "fade-up" | "slide-in" | "typewriter" | "glitch" | "pulse" | "bounce";

export type HeroAnimationsConfig = {
  headingEffect?: string;
  subheadingEffect?: string;
  badgeEffect?: string;
  staggerDelay?: number;
  animationDuration?: number;
  parallaxSpeed?: number;
};

const ENTRANCE_EFFECTS = new Set(["fade-up", "slide-in", "typewriter", "glitch"]);

export function isHeroEntranceEffect(effect: string | undefined | null): effect is HeroEntranceEffect {
  if (!effect) return false;
  return ENTRANCE_EFFECTS.has(effect);
}

export function heroEntranceClass(
  effect: string | undefined | null,
  element: "heading" | "subheading" | "badge",
): string {
  if (!effect || effect === "none") return "";

  if (element === "heading") {
    if (effect === "fade-up") {
      return "hero-anim-entrance hero-anim-fade-up hero-anim-heading";
    }
    if (effect === "slide-in") {
      return "hero-anim-entrance hero-anim-slide-in hero-anim-heading";
    }
    if (effect === "glitch") return "animate-glitch hero-anim-heading";
    if (effect === "typewriter") return "hero-anim-heading hero-anim-typewriter";
    return "";
  }

  if (element === "subheading") {
    if (effect === "fade-up") {
      return "hero-anim-entrance hero-anim-fade-up hero-anim-subheading";
    }
    if (effect === "slide-in") {
      return "hero-anim-entrance hero-anim-slide-in hero-anim-subheading";
    }
    return "";
  }

  if (element === "badge") {
    if (effect === "pulse") return "animate-pulse";
    if (effect === "bounce") return "animate-bounce";
  }

  return "";
}

export function parseHeroAnimations(raw: unknown): HeroAnimationsConfig {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    headingEffect: typeof o.headingEffect === "string" ? o.headingEffect : undefined,
    subheadingEffect: typeof o.subheadingEffect === "string" ? o.subheadingEffect : undefined,
    badgeEffect: typeof o.badgeEffect === "string" ? o.badgeEffect : undefined,
    staggerDelay: typeof o.staggerDelay === "number" ? o.staggerDelay : undefined,
    animationDuration: typeof o.animationDuration === "number" ? o.animationDuration : undefined,
    parallaxSpeed: typeof o.parallaxSpeed === "number" ? o.parallaxSpeed : undefined,
  };
}
