import { initTextEffects, resetTextEffects } from "@/features/theme/effects/text";
import {
  SITE_TEXT_EFFECT_SOURCE_ATTR,
  SITE_TEXT_EFFECT_SOURCE_VALUE,
} from "@/features/theme/hero-heading-attrs";
import type { CapabilityPolicy, EffectModule, EffectRuntimeConfig } from "./types";

const SITE_TEXT_EFFECT_SOURCE = SITE_TEXT_EFFECT_SOURCE_ATTR;
const HERO_HEADING_SELECTOR =
  '[data-block-type="hero"] h1, [data-block-type="hero"] h2, [data-hero-title], [data-text-effect-target="heading"]';

let activeTextEffect: string | null = null;

function clearSiteTaggedHeroTextEffects(): void {
  document
    .querySelectorAll<HTMLElement>(`[${SITE_TEXT_EFFECT_SOURCE}="${SITE_TEXT_EFFECT_SOURCE_VALUE}"]`)
    .forEach((el) => {
      el.removeAttribute("data-text-effect");
      el.removeAttribute(SITE_TEXT_EFFECT_SOURCE);
    });
}

function tagHeroHeadings(textEffect: string | null) {
  document.querySelectorAll("[data-block-heading-effect]").forEach((el) => {
    if (el.hasAttribute("data-text-effect-off")) return;
    const effect = el.getAttribute("data-block-heading-effect");
    if (effect) {
      el.setAttribute("data-text-effect", effect);
      el.setAttribute(SITE_TEXT_EFFECT_SOURCE, "block");
    }
  });

  if (!textEffect || textEffect === "none") {
    clearSiteTaggedHeroTextEffects();
    return;
  }

  document.querySelectorAll(HERO_HEADING_SELECTOR).forEach((el) => {
    if (el.hasAttribute("data-text-effect-off")) return;
    if (el.closest("[data-text-effect-off]")) return;
    const explicit = el.getAttribute("data-text-effect");
    const source = el.getAttribute(SITE_TEXT_EFFECT_SOURCE);
    if (source === "block") return;
    if (
      source === SITE_TEXT_EFFECT_SOURCE_VALUE &&
      explicit &&
      explicit !== "inherit"
    ) {
      return;
    }
    if (!explicit || explicit === "inherit") {
      el.setAttribute("data-text-effect", textEffect);
      el.setAttribute(SITE_TEXT_EFFECT_SOURCE, SITE_TEXT_EFFECT_SOURCE_VALUE);
    }
  });
}

function resolveTextEffect(
  effectId: string | null,
  policy: CapabilityPolicy,
): string | null {
  if (!effectId || effectId === "none") return null;
  if (!policy.allowTextAnimation) return null;
  return effectId;
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
      activeTextEffect = null;
      return;
    }

    const effectId = resolveTextEffect(config.text.effectId, policy);

    if (effectId) {
      html.dataset.textEffectTheme = effectId;
    } else {
      delete html.dataset.textEffectTheme;
    }

    tagHeroHeadings(effectId);

    if (!config.animationsEnabled || !effectId) {
      activeTextEffect = null;
      return;
    }

    if (effectId === activeTextEffect) return;
    activeTextEffect = effectId;
    initTextEffects(effectId);
  },

  destroy() {
    activeTextEffect = null;
    resetTextEffects();
    clearSiteTaggedHeroTextEffects();
    delete document.documentElement.dataset.textEffectTheme;
  },
};
