"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { observeIntersection } from "@/lib/performance/intersection-observer-hub";

type Options = {
  /** ms to keep data-scrolling after scroll stops */
  idleMs?: number;
};

/**
 * Marks scroll container while user scrolls (themed thumb glow) and
 * reveals [data-scroll-reveal] children inside the root when they enter view.
 */
export function useScrollContainer<T extends HTMLElement>(
  options: Options = {},
): RefObject<T | null> {
  const { idleMs = 480 } = options;
  const ref = useRef<T | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.scrolling = "true";
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (ref.current) ref.current.dataset.scrolling = "false";
    }, idleMs);
  }, [idleMs]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.addEventListener("scroll", onScroll, { passive: true });

    const unobserveFns: Array<() => void> = [];
    const tracked = new WeakSet<Element>();

    if (!reduced) {
      const observeTarget = (node: Element) => {
        if (tracked.has(node)) return;
        tracked.add(node);
        unobserveFns.push(
          observeIntersection(
            node,
            (entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("az-in-view");
            },
            { root: el, rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
          ),
        );
      };

      const observeTargets = () => {
        el.querySelectorAll("[data-scroll-reveal]:not(.az-in-view)").forEach(observeTarget);
      };

      observeTargets();
      const mutation = new MutationObserver(observeTargets);
      mutation.observe(el, { childList: true, subtree: true });

      return () => {
        el.removeEventListener("scroll", onScroll);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        for (const off of unobserveFns) off();
        mutation.disconnect();
      };
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [onScroll]);

  return ref;
}
