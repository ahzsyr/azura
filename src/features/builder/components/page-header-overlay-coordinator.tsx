"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import type { ResolvedHeaderOverlay } from "@/features/navigation/types";
import {
  computeHeaderOverlayPaddingTop,
  HEADER_OVERLAY_TOP_GAP_BOXED,
  isBoxedHeaderStyle,
} from "@/features/builder/header-overlay";

type Props = {
  overlay: ResolvedHeaderOverlay;
};

const ROOT_ATTR = "data-block-header-overlay";
const HTML_ATTR = "data-block-header-overlay";

/** True when the current page opted into overlay with a media underlay. */
function pageHasHeaderOverlayUnderlay(): boolean {
  if (document.querySelector('[data-page-header-overlay="true"]') != null) return true;
  if (document.querySelector('[data-header-overlay-underlay="true"]') != null) return true;
  if (document.querySelector('[data-header-overlay-block="true"]') != null) return true;
  return false;
}

export function PageHeaderOverlayCoordinator({ overlay }: Props) {
  const { enabled, surface, contentInset, paddingTop } = overlay;
  // pathname is included so the effect re-runs on every soft navigation,
  // triggering cleanup that clears stale overlay attrs before the new page
  // checks for an underlay. Without this, Home (Hero) → PDP leaves
  // data-block-header-overlay on <html>, zeroing .site-main padding.
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.getElementById("headerRoot");
    if (!root) return;

    const html = document.documentElement;

    // On every navigation: immediately clear any overlay that was applied by
    // a previous route so the new page starts from a clean state.
    const clearOverlay = () => {
      root.removeAttribute(ROOT_ATTR);
      html.removeAttribute(HTML_ATTR);
      html.style.removeProperty("--header-overlay-top-gap");
      html.style.removeProperty("--block-header-overlay-padding");
      root.removeAttribute("data-overlay-snapshot-block");
    };

    if (!enabled) {
      clearOverlay();
      return;
    }

    const headerStyle = root.getAttribute("data-header-style") ?? "";
    const isBoxed = isBoxedHeaderStyle(headerStyle);

    let applied = false;
    const applyOverlay = () => {
      if (applied) return true;
      // Setting alone is not enough — require a real underlay marker on the page.
      if (!pageHasHeaderOverlayUnderlay()) return false;

      root.setAttribute(ROOT_ATTR, "true");
      html.setAttribute(HTML_ATTR, "true");
      html.style.setProperty(
        "--header-overlay-top-gap",
        isBoxed ? HEADER_OVERLAY_TOP_GAP_BOXED : "0px",
      );

      const resolvedPaddingTop = computeHeaderOverlayPaddingTop({
        enabled,
        surface,
        contentInset,
        paddingTop,
      });
      if (resolvedPaddingTop) {
        html.style.setProperty("--block-header-overlay-padding", resolvedPaddingTop);
      }

      applied = true;
      return true;
    };

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (!applyOverlay()) {
      observer = new MutationObserver(() => {
        if (!applyOverlay()) return;
        observer?.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-page-header-overlay",
          "data-header-overlay-underlay",
          "data-header-overlay-block",
        ],
      });
      // Give late client islands a short window; then leave header in normal mode.
      timeoutId = setTimeout(() => {
        observer?.disconnect();
      }, 2500);
    }

    return () => {
      observer?.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      // Always clear on route change so the next page starts clean. The new
      // effect run will re-apply only if an underlay marker is present.
      clearOverlay();
    };
  }, [enabled, surface, contentInset, paddingTop, pathname]);

  return null;
}
