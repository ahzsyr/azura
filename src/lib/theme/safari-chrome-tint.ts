/**
 * Chromium still reads theme-color. Safari 26 samples the edges painted by
 * browser-tint.css. This module only publishes the CSS variables and chrome
 * attributes those stylesheets read. It does not create or paint edge strips.
 */
export const SAFARI_CHROME_TINT_VAR = "--az-browser-chrome-tint";
export const SAFARI_CHROME_TINT_LIGHT_VAR = "--az-browser-chrome-tint-light";
export const SAFARI_CHROME_TINT_DARK_VAR = "--az-browser-chrome-tint-dark";
/** Active chrome tint fed into site Liquid Glass header/footer fills. */
export const SITE_GLASS_TINT_VAR = "--az-site-glass-tint";
/** Site glass fill alpha 0–1 (Liquid Glass / header capsule — not OS chrome). */
export const SITE_GLASS_FILL_ALPHA_VAR = "--az-site-glass-fill-alpha";
/** Fill strength 0–1 for transparent/glass chrome styles (OS / Theme Studio meta). */
export const CHROME_TINT_OPACITY_VAR = "--az-chrome-tint-opacity";
/** Active CSS gradient when chromeTintStyle is gradient. */
export const CHROME_GRADIENT_VAR = "--az-browser-chrome-gradient";
export const CHROME_GRADIENT_LIGHT_VAR = "--az-browser-chrome-gradient-light";
export const CHROME_GRADIENT_DARK_VAR = "--az-browser-chrome-gradient-dark";
export const CHROME_TINT_STYLE_ATTR = "data-chrome-tint-style";
export const CHROME_TINT_SOURCE_ATTR = "data-chrome-tint-source";
export const IOS_STATUS_BAR_ATTR = "data-ios-status-bar";
export const SAFARI_CHROME_TOP_ID = "az-safari-chrome-top";
export const SAFARI_CHROME_BOTTOM_ID = "az-safari-chrome-bottom";

export type SyncSafariChromeTintOptions = {
  lightColor?: string;
  darkColor?: string;
  /**
   * Header/footer Liquid Glass fill. Defaults to `color`.
   * Pass the projection surface (not a scroll-section sample) so capsules
   * stay on the site chrome while Safari anchors may follow scroll tint.
   */
  glassTint?: string;
  /** transparent | glass | solid | gradient */
  chromeTintStyle?: string;
  /** surface | primary */
  chromeTintSource?: string;
  /** default | black | black-translucent */
  iosStatusBarStyle?: string;
  /** Effective fill strength 0–1 */
  chromeTintOpacity?: number;
  chromeGradientLight?: string | null;
  chromeGradientDark?: string | null;
};

function setRootVar(root: HTMLElement, name: string, value: string): void {
  if (root.style.getPropertyValue(name) !== value) {
    root.style.setProperty(name, value);
  }
}

const CHROME_TINT_STYLES = new Set(["transparent", "glass", "solid", "gradient"]);
const CHROME_TINT_SOURCES = new Set(["surface", "primary"]);
const IOS_STATUS_BARS = new Set(["default", "black", "black-translucent"]);

/**
 * Project the active Theme Color onto CSS variables and chrome attributes.
 * Safari edge strips are owned by applyBrowserTint — this function must not
 * paint them.
 *
 * Mirrors onto --az-site-glass-tint unless `glassTint` is provided separately
 * (scroll samples retint the theme-color without washing header/footer glass).
 */
export function syncSafariChromeTint(
  color: string,
  options?: SyncSafariChromeTintOptions,
): void {
  if (typeof document === "undefined") return;
  const tint = color.trim();
  if (!tint) return;

  const root = document.documentElement;
  const glass = options?.glassTint?.trim() || tint;
  setRootVar(root, SAFARI_CHROME_TINT_VAR, tint);
  setRootVar(root, SITE_GLASS_TINT_VAR, glass);

  const light = options?.lightColor?.trim();
  const dark = options?.darkColor?.trim();
  if (light) setRootVar(root, SAFARI_CHROME_TINT_LIGHT_VAR, light);
  if (dark) setRootVar(root, SAFARI_CHROME_TINT_DARK_VAR, dark);

  // color-scheme helps Safari 26 trust the page enough to apply Liquid Glass.
  const isDark =
    root.classList?.contains?.("dark") || root.getAttribute?.("data-theme") === "dark";
  const scheme = isDark ? "dark" : "light";
  if (root.style && root.style.colorScheme !== scheme) {
    root.style.colorScheme = scheme;
  }

  const style = options?.chromeTintStyle?.trim();
  if (style && CHROME_TINT_STYLES.has(style)) {
    if (root.getAttribute(CHROME_TINT_STYLE_ATTR) !== style) {
      root.setAttribute(CHROME_TINT_STYLE_ATTR, style);
    }
  }

  const source = options?.chromeTintSource?.trim();
  if (source && CHROME_TINT_SOURCES.has(source)) {
    if (root.getAttribute(CHROME_TINT_SOURCE_ATTR) !== source) {
      root.setAttribute(CHROME_TINT_SOURCE_ATTR, source);
    }
  }

  const iosStatusBar = options?.iosStatusBarStyle?.trim();
  if (iosStatusBar && IOS_STATUS_BARS.has(iosStatusBar)) {
    if (root.getAttribute(IOS_STATUS_BAR_ATTR) !== iosStatusBar) {
      root.setAttribute(IOS_STATUS_BAR_ATTR, iosStatusBar);
    }
  }

  if (typeof options?.chromeTintOpacity === "number") {
    const opacity = Math.min(1, Math.max(0, options.chromeTintOpacity));
    // OS / Theme Studio chrome opacity only — do not restyle site header fill.
    setRootVar(root, CHROME_TINT_OPACITY_VAR, String(opacity));
  }

  const gradLight = options?.chromeGradientLight?.trim() || "";
  const gradDark = options?.chromeGradientDark?.trim() || "";
  if (gradLight) setRootVar(root, CHROME_GRADIENT_LIGHT_VAR, gradLight);
  if (gradDark) setRootVar(root, CHROME_GRADIENT_DARK_VAR, gradDark);
  const activeGrad = isDark ? gradDark || gradLight : gradLight || gradDark;
  if (activeGrad) {
    setRootVar(root, CHROME_GRADIENT_VAR, activeGrad);
  } else if (style && style !== "gradient") {
    root.style.removeProperty(CHROME_GRADIENT_VAR);
  }
}
