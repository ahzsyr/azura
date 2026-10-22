"use client";

/**
 * Edge-to-edge chrome behaviour (page content passes under the site bar).
 *
 * Responsibilities — all visual only; the header's own design is untouched:
 * - Marks the page-stack root (`[data-az-underlay]`) so that root reserves the
 *   bar's height while the bar overlays it. CSS owns the actual reserve.
 * - Renders two fixed, pointer-transparent layers:
 *     `.az-chrome-tint-zone`   – paints the OS chrome colour in the device
 *                                safe area (status bar / home indicator) so the
 *                                browser edge and the bar read as one surface.
 *     `.az-chrome-scroll-edge` – scroll edge fade where content meets the bar.
 * - Reveals the fade once scrolled; rAF-throttled passive scroll listener.
 *
 * Degrades safely: with JavaScript off the underlay class is never added, so
 * the bar keeps today's static layout.
 */

import { useEffect, useRef } from "react";

/** Scroll offset (px) after which the scroll edge fade is shown. */
export const CHROME_FADE_REVEAL_PX = 8;

/** How the bar resolves against the page. Mirrors data-edge-to-edge. */
export type EdgeToEdgeMode = "on" | "edge" | "off";

export function readEdgeToEdgeMode(root: HTMLElement | null): EdgeToEdgeMode {
  const raw = root?.getAttribute("data-edge-to-edge");
  if (raw === "off") return "off";
  // "edge" pads into the safe area without the underlay; "on" is the default.
  if (raw === "edge") return "edge";
  return "on";
}

export function shouldShowScrollEdge(scrollY: number): boolean {
  return scrollY > CHROME_FADE_REVEAL_PX;
}

/**
 * Height of the bar's own band that the page must tuck under, in px.
 *
 * Desktop (>= 969px, in-flow sticky/static bars): the header root paints a
 * transparent band around the capsule (its float inset above and below), so the
 * band is the root's padding-top doubled.
 * Mobile: the bar is in normal flow; the band is its measured box height, which
 * already contains the device safe-area padding (never added twice).
 * Overlay / fixed / hiding modes position the bar out of flow, so no band is
 * pulled (the existing header inset already reserves space).
 */
export function measureChromeBand(
  root: HTMLElement | null,
  opts: { isMobile: boolean; safeTopPx: number },
): number {
  if (!root) return 0;
  const mode = root.getAttribute("data-header-desktop") ?? "";
  if (mode === "fixed-top" || mode === "hide-reveal" || mode === "absolute") return 0;
  if (root.getAttribute("data-header-overlay") === "true") return 0;
  const style = getComputedStyle(root);
  const padTop = parseFloat(style.paddingTop) || 0;
  if (opts.isMobile) {
    // The bar is in flow: its own box already includes the safe-area padding
    // (header-builder.css pads .site-header by --az-safe-top), so the band is the
    // root box height only — adding the safe area again would double-count it.
    const measured = root.getBoundingClientRect().height;
    if (measured > 0) return Math.round(measured);
    const headerHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--header-height"),
    );
    return Math.round((headerHeight || 0) + opts.safeTopPx);
  }
  return Math.round(padTop * 2);
}

const MOBILE_MQ = "(max-width: 968px)";

function findPageStack(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".marketing-page-content") ??
    document.querySelector<HTMLElement>(".route-page-layer") ??
    document.querySelector<HTMLElement>(".site-main")
  );
}

function setUnderlay(active: boolean): void {
  const stack = findPageStack();
  if (!stack) return;
  if (active) stack.setAttribute("data-az-underlay", "true");
  else stack.removeAttribute("data-az-underlay");
}

export function ChromeEdgeLayers() {
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headerRoot =
      document.querySelector<HTMLElement>(
        "#headerRoot:not([data-header-shell]), .header-root:not([data-header-shell])",
      ) ?? null;
    const fade = fadeRef.current;

    let mode = readEdgeToEdgeMode(headerRoot);
    const html = document.documentElement;

    const publishBand = () => {
      if (mode !== "on") {
        html.style.removeProperty("--az-chrome-band");
        return;
      }
      const safeTopPx =
        parseFloat(getComputedStyle(html).getPropertyValue("--az-safe-top")) || 0;
      const band = measureChromeBand(headerRoot, {
        isMobile: window.matchMedia(MOBILE_MQ).matches,
        safeTopPx,
      });
      html.style.setProperty("--az-chrome-band", `${band}px`);
    };

    const syncUnderlay = () => {
      mode = readEdgeToEdgeMode(headerRoot);
      setUnderlay(mode === "on");
      publishBand();
    };
    syncUnderlay();

    // Bar height changes with breakpoint, shrink-on-scroll and font scaling.
    const resizeObserver =
      headerRoot && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(publishBand)
        : null;
    if (headerRoot) resizeObserver?.observe(headerRoot);
    window.addEventListener("resize", publishBand);

    // Theme Studio can flip the setting at runtime.
    const attrObserver =
      headerRoot && typeof MutationObserver !== "undefined"
        ? new MutationObserver(syncUnderlay)
        : null;
    attrObserver?.observe(headerRoot as HTMLElement, {
      attributes: true,
      attributeFilter: ["data-edge-to-edge"],
    });

    if (!fade) {
      return () => {
        attrObserver?.disconnect();
        resizeObserver?.disconnect();
        window.removeEventListener("resize", publishBand);
        setUnderlay(false);
        html.style.removeProperty("--az-chrome-band");
      };
    }

    const setReveal = (next: boolean) => {
      const value = String(next);
      if (fade.dataset.reveal !== value) fade.dataset.reveal = value;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        setReveal(shouldShowScrollEdge(window.scrollY));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", publishBand);
      attrObserver?.disconnect();
      resizeObserver?.disconnect();
      setUnderlay(false);
      html.style.removeProperty("--az-chrome-band");
    };
  }, []);

  return (
    <>
      <div className="az-chrome-tint-zone" aria-hidden="true" />
      <div
        ref={fadeRef}
        className="az-chrome-scroll-edge"
        data-reveal="false"
        aria-hidden="true"
      />
    </>
  );
}
