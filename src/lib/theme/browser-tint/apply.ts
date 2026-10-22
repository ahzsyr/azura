import type { TintAttrs } from "./resolve";

export const TINT_TOP_ID = "az-tint-top";
export const TINT_BOTTOM_ID = "az-tint-bottom";
export const TINT_TOP_ATTR = "data-tint-top";
export const TINT_BOTTOM_ATTR = "data-tint-bottom";
export const TINT_PAD_ATTR = "data-tint-pad";
export const TINT_TOP_COLOR_VAR = "--az-tint-top-color";
export const TINT_BOTTOM_COLOR_VAR = "--az-tint-bottom-color";
export const TINT_GRADIENT_VAR = "--az-tint-gradient";
export const TINT_HTML_BG_VAR = "--az-tint-html-bg";

function setAttr(root: HTMLElement, name: string, value: string): void {
  if (root.getAttribute(name) !== value) root.setAttribute(name, value);
}

function setVar(root: HTMLElement, name: string, value: string): void {
  if (root.style.getPropertyValue(name) !== value) {
    root.style.setProperty(name, value);
  }
}

/**
 * The only writer for Safari edge tint. Sets attributes and variables.
 * It never writes an inline background on an element — that beats the stylesheet
 * and is what made every style look like one solid bar.
 */
export function applyBrowserTint(attrs: TintAttrs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  setAttr(root, TINT_TOP_ATTR, attrs.top);
  setAttr(root, TINT_BOTTOM_ATTR, attrs.bottom);
  setAttr(root, TINT_PAD_ATTR, attrs.pad);
  setVar(root, TINT_TOP_COLOR_VAR, attrs.topColor);
  setVar(root, TINT_BOTTOM_COLOR_VAR, attrs.bottomColor);
  setVar(root, TINT_GRADIENT_VAR, attrs.gradient);
  setVar(root, TINT_HTML_BG_VAR, attrs.htmlBackground);
}

export function tintHtmlAttrs(attrs: TintAttrs): Record<string, string> {
  return {
    [TINT_TOP_ATTR]: attrs.top,
    [TINT_BOTTOM_ATTR]: attrs.bottom,
    [TINT_PAD_ATTR]: attrs.pad,
  };
}

export function tintCssVars(attrs: TintAttrs): Record<string, string> {
  return {
    [TINT_TOP_COLOR_VAR]: attrs.topColor,
    [TINT_BOTTOM_COLOR_VAR]: attrs.bottomColor,
    [TINT_GRADIENT_VAR]: attrs.gradient,
    [TINT_HTML_BG_VAR]: attrs.htmlBackground,
  };
}
