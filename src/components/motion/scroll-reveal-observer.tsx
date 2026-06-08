"use client";

import { useEffect } from "react";
import { observeIntersection } from "@/lib/performance/intersection-observer-hub";

const REVEAL_SELECTOR =
  "[data-reveal]:not(.revealed), [data-animation]:not(.revealed)";
const LAZY_BLOCK_SELECTOR = "[data-lazy-block]:not(.az-lazy-revealed)";

function getSiblingStagger(el: HTMLElement): number {
  const parent = el.parentElement;
  if (!parent) return 0;
  const siblings = Array.from(
    parent.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
  );
  const idx = siblings.indexOf(el);
  return idx > 0 ? Math.min(idx * 60, 360) : 0;
}

const IO_OPTIONS: IntersectionObserverInit = {
  threshold: 0.05,
  rootMargin: "0px 0px 200px 0px",
};

/**
 * Single shared IntersectionObserver for reveal + lazy blocks.
 */
export function ScrollRevealObserver() {
  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
    const lazyTargets = document.querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR);
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const unobserveFns: Array<() => void> = [];
    const trackedReveal = new WeakSet<Element>();
    const trackedLazy = new WeakSet<Element>();

    if (prefersReduced) {
      revealTargets.forEach((el) => {
        el.classList.add("revealed");
        el.style.transition = "none";
      });
      lazyTargets.forEach((el) => el.classList.add("az-lazy-revealed"));
      return;
    }

    const revealElement = (el: HTMLElement) => {
      const explicitDelay = Number.parseInt(el.dataset.revealDelay ?? "", 10);
      const delay = Number.isNaN(explicitDelay)
        ? getSiblingStagger(el)
        : Math.max(0, explicitDelay);

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
        observeIntersection(
          el,
          (entry) => {
            if (!entry.isIntersecting) return;
            revealElement(el);
          },
          IO_OPTIONS,
        ),
      );
    };

    const observeLazy = (el: HTMLElement) => {
      if (trackedLazy.has(el)) return;
      trackedLazy.add(el);
      unobserveFns.push(
        observeIntersection(
          el,
          (entry) => {
            if (!entry.isIntersecting) return;
            el.classList.add("az-lazy-revealed");
          },
          IO_OPTIONS,
        ),
      );
    };

    revealTargets.forEach(observeReveal);
    lazyTargets.forEach(observeLazy);

    const mo = new MutationObserver(() => {
      document
        .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
        .forEach((el) => {
          if (!el.classList.contains("revealed")) observeReveal(el);
        });
      document
        .querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR)
        .forEach((el) => {
          if (!el.classList.contains("az-lazy-revealed")) observeLazy(el);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      for (const off of unobserveFns) off();
    };
  }, []);

  return null;
}
