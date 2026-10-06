import { downgradeTextEffectForPolicy } from "@/features/theme/downgrade-text-effect";
import { initTextEffects, resetTextEffects } from "@/features/theme/effects/text";
import {
  SITE_TEXT_EFFECT_SOURCE_ATTR,
  SITE_TEXT_EFFECT_SOURCE_VALUE,
  SITE_TEXT_EFFECT_TARGET_SELECTOR,
} from "@/features/theme/hero-heading-attrs";
import type { CapabilityPolicy, EffectModule, EffectRuntimeConfig } from "./types";

const SITE_TEXT_EFFECT_SOURCE = SITE_TEXT_EFFECT_SOURCE_ATTR;
const HERO_HEADING_SELECTOR = SITE_TEXT_EFFECT_TARGET_SELECTOR;

let activeTextEffect: string | null = null;

function clearSiteTaggedHeroTextEffects(): void {
  document
    .querySelectorAll<HTMLElement>(`[${SITE_TEXT_EFFECT_SOURCE}="${SITE_TEXT_EFFECT_SOURCE_VALUE}"]`)
    .forEach((el) => {
      el.removeAttribute("data-text-effect");
      el.removeAttribute(SITE_TEXT_EFFECT_SOURCE);
    });
}

function clearBlockTaggedTextEffects(): void {
  document
    .querySelectorAll<HTMLElement>(`[${SITE_TEXT_EFFECT_SOURCE}="block"]`)
    .forEach((el) => {
      el.removeAttribute("data-text-effect");
      el.removeAttribute(SITE_TEXT_EFFECT_SOURCE);
    });
}

/** Tag hero + block headings for the active text effect. */
export function tagHeroHeadings(textEffect: string | null) {
  clearBlockTaggedTextEffects();

  document.querySelectorAll("[data-block-heading-effect]").forEach((blockEl) => {
    if (blockEl.hasAttribute("data-text-effect-off")) return;
    const effect = blockEl.getAttribute("data-block-heading-effect");
    if (!effect) return;
    blockEl
      .querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-text-effect-target="heading"]')
      .forEach((heading) => {
        if (heading.hasAttribute("data-text-effect-off")) return;
        if (heading.closest("[data-text-effect-off]")) return;
        heading.setAttribute("data-text-effect", effect);
        heading.setAttribute(SITE_TEXT_EFFECT_SOURCE, "block");
      });
  });

  if (!textEffect || textEffect === "none") {
    clearSiteTaggedHeroTextEffects();
    return;
  }

  document.querySelectorAll(HERO_HEADING_SELECTOR).forEach((el) => {
    if (el.hasAttribute("data-text-effect-off")) return;
    if (el.closest("[data-text-effect-off]")) return;
    if (el.classList.contains("hero-anim-typewriter")) return;
    const source = el.getAttribute(SITE_TEXT_EFFECT_SOURCE);
    if (source === "block") return;
    el.setAttribute("data-text-effect", textEffect);
    el.setAttribute(SITE_TEXT_EFFECT_SOURCE, SITE_TEXT_EFFECT_SOURCE_VALUE);
  });
}

export function clearAllTaggedTextEffects(): void {
  clearSiteTaggedHeroTextEffects();
  clearBlockTaggedTextEffects();
}

export const textEngine: EffectModule = {
  initialize() {
    activeTextEffect = null;
  },

  update(config: EffectRuntimeConfig, policy: CapabilityPolicy) {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    resetTextEffects();

    if (!config.text.enabled) {
      delete html.dataset.textEffectTheme;
      delete html.dataset.presetTextEffect;
      clearSiteTaggedHeroTextEffects();
      tagHeroHeadings(null);
      if (config.animationsEnabled && policy.allowTextAnimation) {
        initTextEffects(null);
      }
      activeTextEffect = null;
      return;
    }

    const effectId = downgradeTextEffectForPolicy(config.text.effectId, policy);

    if (effectId) {
      html.dataset.textEffectTheme = effectId;
    } else {
      delete html.dataset.textEffectTheme;
    }

    tagHeroHeadings(effectId);

    if (!config.animationsEnabled || !policy.allowTextAnimation) {
      activeTextEffect = null;
      return;
    }

    activeTextEffect = effectId;
    initTextEffects(effectId);
  },

  destroy() {
    activeTextEffect = null;
    resetTextEffects();
    clearAllTaggedTextEffects();
    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.textEffectTheme;
    }
  },
};

/** Re-tag and apply after late-mounted headings (SPA navigations). */
export function rescanTextEffectTargets(
  textEffect: string | null | undefined,
  animationsEnabled: boolean,
  policy: CapabilityPolicy,
): void {
  if (!animationsEnabled || !policy.allowTextAnimation) return;
  const effect = downgradeTextEffectForPolicy(textEffect, policy);
  tagHeroHeadings(effect);
  initTextEffects(effect);
}
