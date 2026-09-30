/**
 * Scroll-aware browser chrome tinting (Samsung-style).
 *
 * Sections opt in with data attributes. The observer resolves the dominant
 * section and stores a light/dark tint pair; ThemeEngineProvider merges that
 * pair into syncThemeColorMeta() — the exclusive post-boot theme-color writer
 * — so Safari edge anchors (syncSafariChromeTint) stay in lockstep.
 *
 * Declare a section tint:
 *   <section
 *     data-chrome-tint-light="#e8f0ee"
 *     data-chrome-tint-dark="#0a0a12"
 *   >
 *
 * Omit either attr to fall back to the site projection color for that mode.
 * Only fire updates when the dominant section’s tint pair actually changes.
 */

import type { ResolvedAppearance } from "@/features/theme/engine/types";
import {
  isDarkBackground,
  isLightBackground,
} from "@/features/theme/surfaces/theme-surfaces";
import { coerceColorString } from "@/lib/theme/tokens/color-utils";

export const CHROME_TINT_LIGHT_ATTR = "data-chrome-tint-light";
export const CHROME_TINT_DARK_ATTR = "data-chrome-tint-dark";
export const CHROME_TINT_SELECTOR = `[${CHROME_TINT_LIGHT_ATTR}], [${CHROME_TINT_DARK_ATTR}]`;

/** Minimum intersection ratio before a section can become dominant. */
export const SCROLL_CHROME_MIN_RATIO = 0.15;

/**
 * Bias sampling toward the upper-middle viewport (status-bar relevance).
 * Kept moderate — aggressive bottom margins starve short footers; pinned
 * scroll-boundary fallback covers the rest.
 */
export const SCROLL_CHROME_ROOT_MARGIN = "-10% 0px -28% 0px";

export const SCROLL_CHROME_THRESHOLDS = [0, 0.15, 0.35, 0.5, 0.75, 1];

/** Px slack for max-scroll / top detection (subpixel + rubber-band). */
export const SCROLL_PIN_SLACK_PX = 2;

export type ScrollChromeTint = {
  light?: string;
  dark?: string;
  /** Stable identity for change detection (id / block type / attr fingerprint). */
  sourceKey: string;
};

export type ChromeTintPair = {
  lightColor: string;
  darkColor: string;
};

type ObserverController = {
  disconnect: () => void;
  rescan: () => void;
};

let activeTint: ScrollChromeTint | null = null;
let controller: ObserverController | null = null;

function normalizeHex(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const coerced = coerceColorString(value.trim());
  if (!coerced) return undefined;
  // Stable compare for #rgb / #rrggbb; leave non-hex (oklch, etc.) as-is.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(coerced)) {
    return coerced.toLowerCase();
  }
  return coerced;
}

export function getActiveScrollChromeTint(): ScrollChromeTint | null {
  return activeTint;
}

/** Test / teardown helper — not for production writers. */
export function resetActiveScrollChromeTint(): void {
  activeTint = null;
}

export function setActiveScrollChromeTint(tint: ScrollChromeTint | null): void {
  activeTint = tint;
}

export function chromeTintDataAttrs(
  light: string,
  dark: string,
): Record<string, string> {
  return {
    [CHROME_TINT_LIGHT_ATTR]: light,
    [CHROME_TINT_DARK_ATTR]: dark,
  };
}

export function scrollChromeTintEquals(
  a: ScrollChromeTint | null | undefined,
  b: ScrollChromeTint | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.sourceKey === b.sourceKey && a.light === b.light && a.dark === b.dark;
}

export function readScrollChromeTintFromElement(el: Element): ScrollChromeTint | null {
  const light = normalizeHex(el.getAttribute(CHROME_TINT_LIGHT_ATTR));
  const dark = normalizeHex(el.getAttribute(CHROME_TINT_DARK_ATTR));
  if (!light && !dark) return null;

  const htmlEl = el as HTMLElement;
  const sourceKey =
    htmlEl.id ||
    el.getAttribute("data-block-id") ||
    el.getAttribute("data-block-type") ||
    `${el.tagName}:${light ?? ""}:${dark ?? ""}`;

  return { light, dark, sourceKey };
}

/**
 * Merge projection base colors with the active scroll-section tint.
 * Missing section sides fall back to the projection for that mode.
 */
export function mergeScrollChromeTint(
  base: ChromeTintPair,
  scroll: ScrollChromeTint | null | undefined,
): ChromeTintPair {
  if (!scroll) return base;
  return {
    lightColor: scroll.light || base.lightColor,
    darkColor: scroll.dark || base.darkColor,
  };
}

export function activeColorFromChromeTintPair(
  pair: ChromeTintPair,
  resolved: ResolvedAppearance,
): string {
  return resolved === "dark" ? pair.darkColor : pair.lightColor;
}

/**
 * Resolve the colors that should be passed to syncThemeColorMeta when a
 * scroll section may override the projection.
 *
 * Appearance-locked luminance: never apply a dark scroll tint while the
 * resolved appearance is light (and vice versa). That keeps Safari OS Liquid
 * Glass + --az-site-glass-tint aligned with the active theme.
 */
export function resolveScrollAwareChromeColors(input: {
  resolved: ResolvedAppearance;
  baseLight: string;
  baseDark: string;
  /** When set (no scroll override), use this as the active color (forced path). */
  baseActiveColor?: string;
  scroll?: ScrollChromeTint | null;
}): { color: string; lightColor: string; darkColor: string } {
  const pair = mergeScrollChromeTint(
    { lightColor: input.baseLight, darkColor: input.baseDark },
    input.scroll,
  );

  let lightColor = pair.lightColor;
  let darkColor = pair.darkColor;

  // Clamp pair sides so light/dark slots match appearance luminance.
  // Dark = near-black only (keeps accent mid-tones like gold for light chrome).
  if (isDarkBackground(lightColor)) {
    lightColor = input.baseLight;
  }
  if (isLightBackground(darkColor)) {
    darkColor = input.baseDark;
  }

  const clampedPair: ChromeTintPair = { lightColor, darkColor };

  let color = input.scroll
    ? activeColorFromChromeTintPair(clampedPair, input.resolved)
    : input.baseActiveColor?.trim() ||
      activeColorFromChromeTintPair(clampedPair, input.resolved);

  // Final gate on the active color against resolved appearance.
  if (input.resolved === "light" && isDarkBackground(color)) {
    color = input.baseActiveColor?.trim() || input.baseLight;
  } else if (input.resolved === "dark" && isLightBackground(color)) {
    color = input.baseActiveColor?.trim() || input.baseDark;
  }

  return {
    color,
    lightColor,
    darkColor,
  };
}

export function pickDominantScrollChromeTarget(
  ratios: ReadonlyMap<Element, number>,
  minRatio: number = SCROLL_CHROME_MIN_RATIO,
): Element | null {
  let best: Element | null = null;
  let bestRatio = 0;
  for (const [el, ratio] of ratios) {
    if (ratio >= minRatio && ratio > bestRatio) {
      bestRatio = ratio;
      best = el;
    }
  }
  return best;
}

export function isPinnedAtTop(slackPx: number = SCROLL_PIN_SLACK_PX): boolean {
  if (typeof window === "undefined") return false;
  return window.scrollY <= slackPx;
}

export function isPinnedAtBottom(slackPx: number = SCROLL_PIN_SLACK_PX): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const doc = document.documentElement;
  return window.innerHeight + window.scrollY >= doc.scrollHeight - slackPx;
}

/** Document-order extreme among registered tint targets (footer / hero). */
export function pickDocumentExtremeTarget(
  elements: Iterable<Element>,
  which: "first" | "last",
): Element | null {
  // Bitmasks match Node.DOCUMENT_POSITION_* (avoid relying on a DOM global in tests).
  const FOLLOWING = 4;
  const PRECEDING = 2;
  let best: Element | null = null;
  for (const el of elements) {
    if (!best) {
      best = el;
      continue;
    }
    const pos = best.compareDocumentPosition(el);
    if (which === "last") {
      if (pos & FOLLOWING) best = el;
    } else if (pos & PRECEDING) {
      best = el;
    }
  }
  return best;
}

/**
 * Resolve the active chrome-tint target.
 *
 * Decision tree (locked):
 * 1. Pinned at bottom → last registered (footer), even if ratios starve.
 * 2. Else best ratio >= minRatio → that target.
 * 3. Else null → base projection. Never promote a candidate solely because
 *    ratio > 0 (faint footer mid-page must not steal chrome).
 *
 * Pin-top is a narrow exception: only when already at top and the first
 * registered target is actually intersecting.
 */
export function resolveDominantScrollChromeTarget(
  ratios: ReadonlyMap<Element, number>,
  registered: Iterable<Element>,
  options?: {
    minRatio?: number;
    pinnedTop?: boolean;
    pinnedBottom?: boolean;
  },
): Element | null {
  const minRatio = options?.minRatio ?? SCROLL_CHROME_MIN_RATIO;

  const pinnedBottom = options?.pinnedBottom ?? isPinnedAtBottom();
  if (pinnedBottom) {
    return pickDocumentExtremeTarget(registered, "last");
  }

  const dominant = pickDominantScrollChromeTarget(ratios, minRatio);
  if (dominant) return dominant;

  const pinnedTop = options?.pinnedTop ?? isPinnedAtTop();
  if (pinnedTop) {
    const first = pickDocumentExtremeTarget(registered, "first");
    if (first && (ratios.get(first) ?? 0) > 0) return first;
  }
  return null;
}

export type StartScrollChromeTintObserverOptions = {
  onChange: (tint: ScrollChromeTint | null) => void;
  rootMargin?: string;
  threshold?: number | number[];
  minRatio?: number;
  /** Observe DOM mutations for soft-nav / CMS blocks. Default true. */
  observeMutations?: boolean;
};

/**
 * IntersectionObserver-driven section tint tracker.
 * Calls onChange only when the dominant tint pair changes.
 */
export function startScrollChromeTintObserver(
  options: StartScrollChromeTintObserverOptions,
): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  stopScrollChromeTintObserver();

  const {
    onChange,
    rootMargin = SCROLL_CHROME_ROOT_MARGIN,
    threshold = SCROLL_CHROME_THRESHOLDS,
    minRatio = SCROLL_CHROME_MIN_RATIO,
    observeMutations = true,
  } = options;

  const ratios = new Map<Element, number>();
  const tintByEl = new Map<Element, ScrollChromeTint>();
  let mutationTimer: ReturnType<typeof setTimeout> | null = null;

  const publish = (next: ScrollChromeTint | null) => {
    if (scrollChromeTintEquals(activeTint, next)) return;
    // Set module state before onChange so syncThemeColorForMode() can read it,
    // and still pass `next` so callers can apply without a second lookup.
    activeTint = next;
    onChange(next);
  };

  const recompute = () => {
    const dominant = resolveDominantScrollChromeTarget(ratios, tintByEl.keys(), {
      minRatio,
    });
    publish(dominant ? tintByEl.get(dominant) ?? null : null);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(entry.target, entry.intersectionRatio);
      }
      recompute();
    },
    { root: null, rootMargin, threshold },
  );

  // Boundary-only scroll listener: short footers/heroes can miss the IO band
  // when pinned at max/min scroll. Passive — no per-tick DOM writes unless pin flips.
  const onScrollBoundary = () => {
    if (isPinnedAtBottom() || isPinnedAtTop()) recompute();
  };
  window.addEventListener("scroll", onScrollBoundary, { passive: true });

  const observeEl = (el: Element) => {
    const tint = readScrollChromeTintFromElement(el);
    if (!tint) return;
    if (tintByEl.has(el)) {
      tintByEl.set(el, tint);
      return;
    }
    tintByEl.set(el, tint);
    ratios.set(el, 0);
    observer.observe(el);
  };

  const unobserveMissing = (live: Set<Element>) => {
    for (const el of [...tintByEl.keys()]) {
      if (live.has(el)) continue;
      observer.unobserve(el);
      tintByEl.delete(el);
      ratios.delete(el);
    }
  };

  const scan = () => {
    const nodes = document.querySelectorAll(CHROME_TINT_SELECTOR);
    const live = new Set<Element>();
    nodes.forEach((el) => {
      live.add(el);
      observeEl(el);
    });
    unobserveMissing(live);
    // Refresh stored tints in case attrs changed on an already-observed node.
    for (const el of tintByEl.keys()) {
      const tint = readScrollChromeTintFromElement(el);
      if (tint) tintByEl.set(el, tint);
      else {
        observer.unobserve(el);
        tintByEl.delete(el);
        ratios.delete(el);
      }
    }
    recompute();
  };

  scan();

  let mutationObserver: MutationObserver | null = null;
  if (observeMutations && typeof MutationObserver !== "undefined" && document.body) {
    mutationObserver = new MutationObserver(() => {
      if (mutationTimer != null) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(() => {
        mutationTimer = null;
        scan();
      }, 80);
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [CHROME_TINT_LIGHT_ATTR, CHROME_TINT_DARK_ATTR],
    });
  }

  controller = {
    disconnect: () => {
      if (mutationTimer != null) clearTimeout(mutationTimer);
      mutationObserver?.disconnect();
      observer.disconnect();
      window.removeEventListener("scroll", onScrollBoundary);
      ratios.clear();
      tintByEl.clear();
    },
    rescan: scan,
  };

  return () => {
    stopScrollChromeTintObserver();
  };
}

export function rescanScrollChromeTintTargets(): void {
  controller?.rescan();
}

export function stopScrollChromeTintObserver(): void {
  controller?.disconnect();
  controller = null;
}
