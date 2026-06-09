"use client";

import { useEffect } from "react";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { getConstrainedMotionSnapshot } from "@/lib/motion/constrained-motion-snapshot";
import { whenShellReady, RESCAN_REVEAL_EVENT } from "@/lib/motion/shell-ready";

const REVEAL_SELECTOR =
  "[data-reveal]:not(.revealed), [data-animation]:not(.revealed), [data-scroll-item]:not(.revealed)";

const MOBILE_MQ = "(max-width: 768px)";

function getIoOptions(): IntersectionObserverInit {
  const isMobile =
    typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;
  return {
    threshold: isMobile ? 0.05 : 0.05,
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
  return rect.width > 0 && rect.height > 0 && rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0;
}

function getSiblingStagger(el: HTMLElement): number {
  const parent = el.parentElement;
  if (!parent) return 0;
  const { shouldSimplifyMotion, allowStagger } = getConstrainedMotionSnapshot();
  if (!allowStagger) return 0;

  const siblings = Array.from(
    parent.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
  );
  const idx = siblings.indexOf(el);
  const step = shouldSimplifyMotion ? 40 : 60;
  const maxStagger = shouldSimplifyMotion ? 120 : 360;
  return idx > 0 ? Math.min(idx * step, maxStagger) : 0;
}

function resolveRevealDelay(el: HTMLElement): number {
  const raw =
    el.dataset.revealDelay ??
    el.dataset.delay ??
    el.getAttribute("data-reveal-delay") ??
    "";
  const explicit = Number.parseInt(raw, 10);
  if (!Number.isNaN(explicit)) return Math.max(0, explicit);
  return getSiblingStagger(el);
}

/**
 * Single shared IntersectionObserver for scroll-reveal elements.
 */
export function ScrollRevealObserver() {
  useEffect(() => {
    const root =
      document.querySelector<HTMLElement>("main.site-main") ??
      document.querySelector<HTMLElement>("main") ??
      document.body;

    const { shouldReduceMotion } = getConstrainedMotionSnapshot();

    const unobserveFns: Array<() => void> = [];
    const trackedReveal = new WeakSet<Element>();

    const revealElement = (el: HTMLElement) => {
      if (el.classList.contains("revealed")) return;
      const delay = resolveRevealDelay(el);
      if (delay > 0) {
        el.style.setProperty("--az-anim-delay", `${delay}ms`);
      }

      const reveal = () => el.classList.add("revealed");
      if (delay > 0) {
        window.setTimeout(reveal, delay);
      } else {
        reveal();
      }
    };

    const observeReveal = (el: HTMLElement) => {
      if (!isElementVisible(el)) return;
      if (trackedReveal.has(el)) return;
      if (el.classList.contains("revealed")) return;
      trackedReveal.add(el);

      if (isInViewport(el)) {
        revealElement(el);
        return;
      }

      unobserveFns.push(
        observeOnce(
          el,
          () => {
            revealElement(el);
          },
          getIoOptions(),
        ),
      );
    };

    const scan = () => {
      if (getConstrainedMotionSnapshot().shouldReduceMotion) return;
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
        if (!el.classList.contains("revealed")) observeReveal(el);
      });
    };

    const start = () => {
      if (shouldReduceMotion) {
        root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
          el.classList.add("revealed");
          el.style.transition = "none";
        });
        return;
      }

      scan();

      let mutationTimer: ReturnType<typeof setTimeout> | null = null;
      const mo = new MutationObserver(() => {
        if (mutationTimer) clearTimeout(mutationTimer);
        mutationTimer = setTimeout(scan, 80);
      });
      mo.observe(root, { childList: true, subtree: true });

      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      const onResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(scan, 120);
      };
      window.addEventListener("resize", onResize);

      let scrollTimer: ReturnType<typeof setTimeout> | null = null;
      const onScroll = () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(scan, 80);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("touchmove", onScroll, { passive: true });
      document.addEventListener(RESCAN_REVEAL_EVENT, onScroll);

      requestAnimationFrame(scan);

      return () => {
        mo.disconnect();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("touchmove", onScroll);
        document.removeEventListener(RESCAN_REVEAL_EVENT, onScroll);
        if (mutationTimer) clearTimeout(mutationTimer);
        if (resizeTimer) clearTimeout(resizeTimer);
        if (scrollTimer) clearTimeout(scrollTimer);
        for (const off of unobserveFns) off();
      };
    };

    let stopInner: (() => void) | undefined;
    const stopShellWait = whenShellReady(() => {
      stopInner = start();
    });

    return () => {
      stopShellWait();
      stopInner?.();
    };
  }, []);

  return null;
}
