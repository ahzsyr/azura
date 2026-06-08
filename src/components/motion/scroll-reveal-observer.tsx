"use client";

import { useEffect } from "react";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { getConstrainedMotionSnapshot } from "@/hooks/use-constrained-motion";

const REVEAL_SELECTOR =
  "[data-reveal]:not(.revealed), [data-animation]:not(.revealed), [data-scroll-item]:not(.revealed)";
const LAZY_BLOCK_SELECTOR = "[data-lazy-block]:not(.az-lazy-revealed)";

const MOBILE_MQ = "(max-width: 768px)";

function getIoOptions(): IntersectionObserverInit {
  const isMobile =
    typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;
  return {
    threshold: isMobile ? 0.08 : 0.05,
    rootMargin: isMobile ? "0px 0px 280px 0px" : "0px 0px 200px 0px",
  };
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
 * Single shared IntersectionObserver for reveal + lazy blocks.
 */
export function ScrollRevealObserver() {
  useEffect(() => {
    const root =
      document.querySelector<HTMLElement>("main.site-main") ??
      document.querySelector<HTMLElement>("main") ??
      document.body;

    const { shouldReduceMotion } = getConstrainedMotionSnapshot();

    const revealTargets = root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
    const lazyTargets = root.querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR);

    const unobserveFns: Array<() => void> = [];
    const trackedReveal = new WeakSet<Element>();
    const trackedLazy = new WeakSet<Element>();

    if (shouldReduceMotion) {
      revealTargets.forEach((el) => {
        el.classList.add("revealed");
        el.style.transition = "none";
      });
      lazyTargets.forEach((el) => el.classList.add("az-lazy-revealed"));
      return;
    }

    const revealElement = (el: HTMLElement) => {
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
      if (trackedReveal.has(el)) return;
      trackedReveal.add(el);
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

    const observeLazy = (el: HTMLElement) => {
      if (trackedLazy.has(el)) return;
      trackedLazy.add(el);
      unobserveFns.push(
        observeOnce(
          el,
          () => {
            el.classList.add("az-lazy-revealed");
          },
          getIoOptions(),
        ),
      );
    };

    revealTargets.forEach(observeReveal);
    lazyTargets.forEach(observeLazy);

    let mutationTimer: ReturnType<typeof setTimeout> | null = null;
    const scan = () => {
      if (getConstrainedMotionSnapshot().shouldReduceMotion) return;
      root
        .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
        .forEach((el) => {
          if (!el.classList.contains("revealed")) observeReveal(el);
        });
      root
        .querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR)
        .forEach((el) => {
          if (!el.classList.contains("az-lazy-revealed")) observeLazy(el);
        });
    };

    const mo = new MutationObserver(() => {
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(scan, 100);
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      if (mutationTimer) clearTimeout(mutationTimer);
      for (const off of unobserveFns) off();
    };
  }, []);

  return null;
}
