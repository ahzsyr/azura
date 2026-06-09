"use client";

import { useEffect } from "react";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { whenShellReady, RESCAN_REVEAL_EVENT } from "@/lib/motion/shell-ready";

const LAZY_BLOCK_SELECTOR = "[data-lazy-block]:not(.az-lazy-revealed)";

const MOBILE_MQ = "(max-width: 768px)";

function getIoOptions(): IntersectionObserverInit {
  const isMobile =
    typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;
  return {
    threshold: 0.05,
    rootMargin: isMobile ? "0px 0px 320px 0px" : "0px 0px 240px 0px",
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

function revealLazyBlock(el: HTMLElement) {
  if (el.classList.contains("az-lazy-revealed")) return;
  el.classList.add("az-lazy-revealed");
  el.style.contentVisibility = "visible";
  document.dispatchEvent(new CustomEvent(RESCAN_REVEAL_EVENT));
}

/**
 * Reveals lazy CMS blocks (fade-in + content-visibility unlock).
 * Always mounted — independent of scroll-reveal / theme animation toggles.
 */
export function LazyBlockRevealObserver() {
  useEffect(() => {
    const root =
      document.querySelector<HTMLElement>("main.site-main") ??
      document.querySelector<HTMLElement>("main") ??
      document.body;

    const unobserveFns: Array<() => void> = [];
    const trackedLazy = new WeakSet<Element>();

    const observeLazy = (el: HTMLElement) => {
      if (!isElementVisible(el)) return;
      if (trackedLazy.has(el)) return;
      if (el.classList.contains("az-lazy-revealed")) return;
      trackedLazy.add(el);

      if (isInViewport(el)) {
        revealLazyBlock(el);
        return;
      }

      unobserveFns.push(
        observeOnce(
          el,
          () => {
            revealLazyBlock(el);
          },
          getIoOptions(),
        ),
      );
    };

    const scan = () => {
      if (document.hidden) return;
      root.querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR).forEach((el) => {
        if (!el.classList.contains("az-lazy-revealed")) observeLazy(el);
      });
    };

    let mutationTimer: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => {
      if (document.hidden) return;
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(scan, 150);
    });

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (document.hidden) return;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(scan, 150);
    };

    const start = () => {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => scan(), { timeout: 500 });
      } else {
        scan();
      }
      mo.observe(root, { childList: true, subtree: true });
      window.addEventListener("resize", onScroll);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("touchmove", onScroll, { passive: true });
      requestAnimationFrame(scan);
    };

    const stopShellWait = whenShellReady(start);

    return () => {
      stopShellWait();
      mo.disconnect();
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
      if (mutationTimer) clearTimeout(mutationTimer);
      if (scrollTimer) clearTimeout(scrollTimer);
      for (const off of unobserveFns) off();
    };
  }, []);

  return null;
}
