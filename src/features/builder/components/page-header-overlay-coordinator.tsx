"use client";

import { useLayoutEffect } from "react";
import type { ResolvedHeaderOverlay } from "@/features/navigation/types";
import {
  computeHeaderOverlayPaddingTop,
  HEADER_OVERLAY_TOP_GAP_BOXED,
} from "@/features/builder/header-overlay";
import { isBoxedHeaderStyle } from "@/features/builder/header-overlay";

type Props = {
  overlay: ResolvedHeaderOverlay;
};

const ROOT_ATTR = "data-block-header-overlay";
const HTML_ATTR = "data-block-header-overlay";

function pageHasCmsHeaderOverlayMarker(): boolean {
  return document.querySelector('[data-page-header-overlay="true"]') != null;
}

export function PageHeaderOverlayCoordinator({ overlay }: Props) {
  const { enabled, surface, contentInset, paddingTop } = overlay;

  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.getElementById("headerRoot");
    if (!root) return;

    const headerStyle = root.getAttribute("data-header-style") ?? "";
    if (!isBoxedHeaderStyle(headerStyle)) return;

    const html = document.documentElement;
    let applied = false;
    const applyOverlay = () => {
      if (applied) return true;
      if (!pageHasCmsHeaderOverlayMarker()) return false;

      const snapshot = {
        rootBlockOverlay: root.getAttribute(ROOT_ATTR),
        htmlBlockOverlay: html.getAttribute(HTML_ATTR),
        topGap: html.style.getPropertyValue("--header-overlay-top-gap"),
        blockPadding: html.style.getPropertyValue("--block-header-overlay-padding"),
      };
      root.setAttribute("data-overlay-snapshot-block", JSON.stringify(snapshot));

      root.setAttribute(ROOT_ATTR, "true");
      html.setAttribute(HTML_ATTR, "true");
      html.style.setProperty("--header-overlay-top-gap", HEADER_OVERLAY_TOP_GAP_BOXED);

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
    if (!applyOverlay()) {
      observer = new MutationObserver(() => {
        if (!applyOverlay()) return;
        observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (!applied) return;
      try {
        const prev = JSON.parse(root.getAttribute("data-overlay-snapshot-block") ?? "{}") as {
          rootBlockOverlay?: string | null;
          htmlBlockOverlay?: string | null;
          topGap?: string;
          blockPadding?: string;
        };
        if (prev.rootBlockOverlay) root.setAttribute(ROOT_ATTR, prev.rootBlockOverlay);
        else root.removeAttribute(ROOT_ATTR);
        if (prev.htmlBlockOverlay) html.setAttribute(HTML_ATTR, prev.htmlBlockOverlay);
        else html.removeAttribute(HTML_ATTR);
        if (prev.topGap) html.style.setProperty("--header-overlay-top-gap", prev.topGap);
        else html.style.removeProperty("--header-overlay-top-gap");
        if (prev.blockPadding) html.style.setProperty("--block-header-overlay-padding", prev.blockPadding);
        else html.style.removeProperty("--block-header-overlay-padding");
      } catch {
        root.removeAttribute(ROOT_ATTR);
        html.removeAttribute(HTML_ATTR);
        html.style.removeProperty("--header-overlay-top-gap");
        html.style.removeProperty("--block-header-overlay-padding");
      }
      root.removeAttribute("data-overlay-snapshot-block");
    };
  }, [enabled, surface, contentInset, paddingTop]);

  return null;
}
