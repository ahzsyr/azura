"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { getConstrainedMotionSnapshot } from "@/hooks/use-constrained-motion";

type Options = {
  /** ms to keep data-scrolling after scroll stops */
  idleMs?: number;
  /** ms to debounce mutation rescans */
  mutationDebounceMs?: number;
};

/**
 * Marks scroll container while user scrolls (themed thumb glow) and
 * reveals [data-scroll-reveal] children inside the root when they enter view.
 */
export function useScrollContainer<T extends HTMLElement>(
  options: Options = {},
): RefObject<T | null> {
  const { idleMs = 480, mutationDebounceMs = 100 } = options;
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

    const { shouldReduceMotion } = getConstrainedMotionSnapshot();
    el.addEventListener("scroll", onScroll, { passive: true });

    const unobserveFns: Array<() => void> = [];
    const tracked = new WeakSet<Element>();
    let mutationTimer: ReturnType<typeof setTimeout> | null = null;

    if (!shouldReduceMotion) {
      const observeTarget = (node: Element) => {
        if (tracked.has(node) || node.classList.contains("az-in-view")) return;
        tracked.add(node);
        unobserveFns.push(
          observeOnce(
            node,
            () => {
              node.classList.add("az-in-view");
            },
            { root: el, rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
          ),
        );
      };

      const observeTargets = () => {
        el.querySelectorAll("[data-scroll-reveal]:not(.az-in-view)").forEach(observeTarget);
      };

      observeTargets();
      const mutation = new MutationObserver(() => {
        if (mutationTimer) clearTimeout(mutationTimer);
        mutationTimer = setTimeout(observeTargets, mutationDebounceMs);
      });
      mutation.observe(el, { childList: true, subtree: true });

      return () => {
        el.removeEventListener("scroll", onScroll);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (mutationTimer) clearTimeout(mutationTimer);
        for (const off of unobserveFns) off();
        mutation.disconnect();
      };
    }

    el.querySelectorAll("[data-scroll-reveal]").forEach((node) => {
      node.classList.add("az-in-view");
    });

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [onScroll, mutationDebounceMs]);

  return ref;
}
