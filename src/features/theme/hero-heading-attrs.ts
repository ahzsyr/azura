export const SITE_TEXT_EFFECT_SOURCE_ATTR = "data-text-effect-source";
export const SITE_TEXT_EFFECT_SOURCE_VALUE = "site";

/** SSR-safe attrs for site-wide hero headings (matches effects-runtime tagging). */
export function siteHeroHeadingAttrs(
  textEffect: string | null | undefined,
): Record<string, string> | undefined {
  if (!textEffect || textEffect === "none") return undefined;
  return {
    "data-text-effect": textEffect,
    [SITE_TEXT_EFFECT_SOURCE_ATTR]: SITE_TEXT_EFFECT_SOURCE_VALUE,
  };
}
