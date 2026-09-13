"use client";

import { useEffect } from "react";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { getConstrainedMotionSnapshot } from "@/lib/motion/constrained-motion-snapshot";
import { whenShellReady, RESCAN_REVEAL_EVENT } from "@/lib/motion/shell-ready";

const LAZY_BLOCK_SELECTOR = "[data-lazy-block]:not(.az-lazy-revealed)";

function getIoOptions(): IntersectionObserverInit {
  return {
    threshold: 0,
    rootMargin: "0px 0px 800px 0px",
  };
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;

  let node: HTMLElement | null = el;
  while (node) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < vh &&
    rect.bottom > 0 &&
    rect.left < vw &&
    rect.right > 0
  );
}

function revealLazyBlock(el: HTMLElement, instant: boolean) {
  if (el.classList.contains("az-lazy-revealed")) return;
  el.classList.add("az-lazy-revealed");
  el.style.contentVisibility = "visible";
  if (instant) {
    el.style.animation = "none";
    el.style.opacity = "1";
    el.style.transform = "none";
  }
  document.dispatchEvent(new CustomEvent(RESCAN_REVEAL_EVENT));
}

/**
 * Reveals lazy CMS blocks (fade-in + content-visibility unlock).
 */
export function LazyBlockRevealObserver() {
  useEffect(() => {
    const root =
      document.querySelector<HTMLElement>("main.site-main") ??
      document.querySelector<HTMLElement>("main") ??
      document.body;

    const unobserveFns: Array<() => void> = [];
    const trackedLazy = new WeakSet<Element>();

    const observeLazy = (el: HTMLElement, instant: boolean) => {
      if (!isElementVisible(el)) return;
      if (trackedLazy.has(el)) return;
      if (el.classList.contains("az-lazy-revealed")) return;
      trackedLazy.add(el);

      if (isInViewport(el)) {
        revealLazyBlock(el, instant);
        return;
      }

      unobserveFns.push(
        observeOnce(
          el,
          () => {
            revealLazyBlock(el, instant);
          },
          getIoOptions(),
        ),
      );
    };

    const scan = () => {
      if (document.hidden) return;
      const { shouldReduceMotion, shouldSimplifyMotion } = getConstrainedMotionSnapshot();
      const instant = shouldReduceMotion || shouldSimplifyMotion;
      root.querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR).forEach((el) => {
        if (!el.classList.contains("az-lazy-revealed")) observeLazy(el, instant);
      });
    };

    let mutationTimer: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => {
      if (document.hidden) return;
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(scan, 150);
    });

    const start = () => {
      scan();
      requestAnimationFrame(scan);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => scan(), { timeout: 300 });
      }
      mo.observe(root, { childList: true, subtree: true });
      window.addEventListener("resize", scan);
      document.addEventListener(RESCAN_REVEAL_EVENT, scan);
    };

    const stopShellWait = whenShellReady(start);

    return () => {
      stopShellWait();
      mo.disconnect();
      window.removeEventListener("resize", scan);
      document.removeEventListener(RESCAN_REVEAL_EVENT, scan);
      if (mutationTimer) clearTimeout(mutationTimer);
      for (const off of unobserveFns) off();
    };
  }, []);

  return null;
}
