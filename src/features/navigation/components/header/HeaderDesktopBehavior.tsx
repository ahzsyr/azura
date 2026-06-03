import { useEffect, useLayoutEffect as _useLayoutEffect, useRef, useState } from "react";
import type { HeaderDesktopMode } from "@/features/navigation/types";
import {
  isBoxedHeaderStyle,
  readBlockHeaderOverlayActive,
} from "@/features/navigation/header-overlay-utils";
import {
  boxedHeaderTopGapPx,
  resolveHeaderInsetActive,
  resolveStickyNavTopPx,
  SITE_CONTENT_TOP_INSET_CSS,
} from "@/features/navigation/site-header-inset";

const useLayoutEffect = typeof window !== "undefined" ? _useLayoutEffect : useEffect;

const NEEDS_SPACER: ReadonlySet<HeaderDesktopMode> = new Set([
  "fixed-top",
  "hide-reveal",
  "absolute",
  "sticky",
  "shrink-scroll",
]);

const ALWAYS_INSET_MODES: ReadonlySet<HeaderDesktopMode> = new Set([
  "fixed-top",
  "hide-reveal",
  "absolute",
]);

interface Props {
  mode: HeaderDesktopMode;
  overlayMode?: "none" | "over-media" | "transparent-until-scroll";
  suppressSpacer?: boolean;
}

function isWorkspaceOverlayMode(
  overlayMode: "none" | "over-media" | "transparent-until-scroll"
): boolean {
  return overlayMode === "over-media" || overlayMode === "transparent-until-scroll";
}

function hasCmsPageHeaderOverlay(): boolean {
  return document.querySelector('[data-page-header-overlay="true"]') != null;
}

function resolveUsesLayoutSpacer(
  mode: HeaderDesktopMode,
  renderSpacerSuppressed: boolean,
  blockOverlay: boolean
): boolean {
  return (
    NEEDS_SPACER.has(mode) &&
    !renderSpacerSuppressed &&
    !(blockOverlay && hasCmsPageHeaderOverlay())
  );
}

function syncHeaderInsetDataset(
  root: HTMLElement,
  mode: HeaderDesktopMode,
  workspaceOverlay: boolean,
  blockOverlay: boolean,
  usesLayoutSpacer: boolean
): void {
  const isSticking = root.classList.contains("header--sticking");
  const active = resolveHeaderInsetActive({
    mode,
    workspaceOverlay,
    blockOverlay,
    isSticking,
    usesLayoutSpacer,
  });
  const html = document.documentElement;
  if (active) {
    html.dataset.headerInsetActive = "true";
  } else {
    delete html.dataset.headerInsetActive;
  }
}

function publishHeaderMetrics(root: HTMLElement, usesLayoutSpacer: boolean): void {
  const html = document.documentElement;
  const h = Math.ceil(root.getBoundingClientRect().height);
  const headerStyle = root.getAttribute("data-header-style") ?? "";
  const blockOverlay = readBlockHeaderOverlayActive();

  html.style.setProperty("--header-height", `${h}px`);
  html.style.setProperty("--site-content-top-inset", SITE_CONTENT_TOP_INSET_CSS);

  if (blockOverlay) {
    const topGap = boxedHeaderTopGapPx(headerStyle);
    html.style.setProperty("--header-overlay-total-inset", `${h + topGap}px`);
  } else {
    html.style.removeProperty("--header-overlay-total-inset");
    if (
      !usesLayoutSpacer &&
      isBoxedHeaderStyle(headerStyle) &&
      !hasCmsPageHeaderOverlay()
    ) {
      html.style.setProperty("--header-overlay-top-gap", `${boxedHeaderTopGapPx(headerStyle)}px`);
    } else if (!blockOverlay && !html.hasAttribute("data-block-header-overlay")) {
      html.style.removeProperty("--header-overlay-top-gap");
    }
  }

  const stickyTop = resolveStickyNavTopPx(h, headerStyle);
  const top = `${stickyTop}px`;
  html.style.setProperty("--az-sticky-nav-top", top);
  document.querySelectorAll<HTMLElement>(".prd-page").forEach((page) => {
    page.style.setProperty("--prd-crumb-top", top);
    page.style.setProperty("--prd-side-top", top);
  });
}

function clearHeaderMetrics(): void {
  const html = document.documentElement;
  html.style.removeProperty("--header-height");
  html.style.removeProperty("--header-overlay-total-inset");
  html.style.removeProperty("--site-content-top-inset");
  delete html.dataset.headerInsetActive;
}

export function HeaderDesktopBehavior({ mode, overlayMode = "none", suppressSpacer }: Props) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const [blockOverlay, setBlockOverlay] = useState(false);

  const workspaceOverlay = isWorkspaceOverlayMode(overlayMode);

  useLayoutEffect(() => {
    const root = document.getElementById("headerRoot");
    const html = document.documentElement;
    if (!root) return;

    const sync = () => setBlockOverlay(readBlockHeaderOverlayActive());
    sync();

    const moRoot = new MutationObserver(sync);
    moRoot.observe(root, { attributes: true, attributeFilter: ["data-block-header-overlay"] });
    const moHtml = new MutationObserver(sync);
    moHtml.observe(html, { attributes: true, attributeFilter: ["data-block-header-overlay"] });
    return () => {
      moRoot.disconnect();
      moHtml.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.getElementById("headerRoot");
    if (!root || !readBlockHeaderOverlayActive()) return;
    if (mode === "sticky" || mode === "shrink-scroll") {
      root.classList.add("header--sticking");
    }
  }, [mode]);

  const renderSpacerSuppressed = suppressSpacer || workspaceOverlay;
  const overlaySpacerSuppressed = renderSpacerSuppressed || blockOverlay;
  const usesLayoutSpacer = resolveUsesLayoutSpacer(
    mode,
    renderSpacerSuppressed,
    blockOverlay
  );

  useLayoutEffect(() => {
    const root = document.getElementById("headerRoot");
    if (!root) return;

    const run = () => {
      const blockOv = readBlockHeaderOverlayActive();
      const layoutSpacer = resolveUsesLayoutSpacer(mode, renderSpacerSuppressed, blockOv);
      publishHeaderMetrics(root, layoutSpacer);
      syncHeaderInsetDataset(root, mode, workspaceOverlay, blockOv, layoutSpacer);
    };

    run();
    const ro = new ResizeObserver(run);
    ro.observe(root);
    window.addEventListener("resize", run, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
      clearHeaderMetrics();
    };
  }, [mode, workspaceOverlay, renderSpacerSuppressed]);

  useLayoutEffect(() => {
    if (overlaySpacerSuppressed || !NEEDS_SPACER.has(mode)) return;

    const root = document.getElementById("headerRoot");
    const spacer = spacerRef.current;
    if (!root || !spacer) return;

    const apply = () => {
      const insetActive = document.documentElement.dataset.headerInsetActive === "true";
      if (insetActive && (workspaceOverlay || suppressSpacer)) {
        spacer.style.display = "none";
        return;
      }
      const h = root.getBoundingClientRect().height;
      spacer.style.height = `${Math.ceil(h)}px`;

      if (mode === "sticky" || mode === "shrink-scroll") {
        const sticking = root.classList.contains("header--sticking");
        spacer.style.display = sticking && !overlaySpacerSuppressed ? "block" : "none";
      } else {
        spacer.style.display = "block";
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(root);
    window.addEventListener("resize", apply, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [mode, overlaySpacerSuppressed, workspaceOverlay, suppressSpacer]);

  useEffect(() => {
    const root = document.getElementById("headerRoot");
    if (!root) return;

    const syncInset = () => {
      const blockOv = readBlockHeaderOverlayActive();
      const layoutSpacer = resolveUsesLayoutSpacer(mode, renderSpacerSuppressed, blockOv);
      publishHeaderMetrics(root, layoutSpacer);
      syncHeaderInsetDataset(root, mode, workspaceOverlay, blockOv, layoutSpacer);
    };

    if (workspaceOverlay) {
      const onScroll = () => {
        const scrolled = window.scrollY > 8;
        root.classList.toggle("header--overlay-scrolled", scrolled);
        if (overlayMode === "transparent-until-scroll") {
          root.classList.toggle("header--sticking", scrolled);
        }
        syncInset();
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      syncInset();
      return () => {
        window.removeEventListener("scroll", onScroll);
        root.classList.remove("header--overlay-scrolled", "header--sticking");
      };
    }

    if (!ALWAYS_INSET_MODES.has(mode) && mode !== "sticky" && mode !== "shrink-scroll") {
      root.classList.remove("header--concealed", "header--shrunk", "header--sticking");
      syncInset();
      return;
    }

    if (mode === "fixed-top" || mode === "absolute") {
      syncInset();
      return;
    }

    const spacer = spacerRef.current;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;

      if (mode === "sticky") {
        const sticking = readBlockHeaderOverlayActive() || y > 0;
        root.classList.toggle("header--sticking", sticking);
        if (spacer && !overlaySpacerSuppressed) {
          spacer.style.display = sticking ? "block" : "none";
        }
        lastY = y;
        syncInset();
        return;
      }

      if (mode === "shrink-scroll") {
        const sticking = readBlockHeaderOverlayActive() || y > 0;
        root.classList.toggle("header--sticking", sticking);
        root.classList.toggle("header--shrunk", y > 48);
        if (spacer && !overlaySpacerSuppressed) {
          spacer.style.display = sticking ? "block" : "none";
        }
        lastY = y;
        syncInset();
        return;
      }

      const dy = y - lastY;
      if (y < 72) {
        root.classList.remove("header--concealed");
      } else if (dy > 8) {
        root.classList.add("header--concealed");
      } else if (dy < -8) {
        root.classList.remove("header--concealed");
      }
      lastY = y;
      syncInset();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    syncInset();
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("header--concealed", "header--shrunk", "header--sticking");
      if (spacer) spacer.style.display = "";
    };
  }, [mode, overlayMode, overlaySpacerSuppressed, workspaceOverlay, renderSpacerSuppressed]);

  const showSpacer = usesLayoutSpacer;

  if (!showSpacer && !ALWAYS_INSET_MODES.has(mode) && !workspaceOverlay) {
    return null;
  }

  if (!NEEDS_SPACER.has(mode) && !workspaceOverlay) return null;

  return (
    <div
      ref={spacerRef}
      className="header-layout-spacer"
      aria-hidden
      data-header-spacer={mode}
      style={renderSpacerSuppressed || overlaySpacerSuppressed ? { display: "none" } : undefined}
    />
  );
}
