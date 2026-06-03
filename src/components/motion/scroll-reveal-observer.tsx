"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR =
  "[data-reveal]:not(.revealed), [data-animation]:not(.revealed)";
const LAZY_BLOCK_SELECTOR = "[data-lazy-block]:not(.az-lazy-revealed)";

/**
 * Computes a stagger delay for sibling elements.
 * Port of sample/src/scripts/performance-client.ts stagger logic.
 * delay = 60ms × siblingIndex, capped at 360ms.
 */
function getSiblingStagger(el: HTMLElement): number {
  const parent = el.parentElement;
  if (!parent) return 0;
  const siblings = Array.from(
    parent.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
  );
  const idx = siblings.indexOf(el);
  return idx > 0 ? Math.min(idx * 60, 360) : 0;
}

/**
 * Astro parity: IntersectionObserver adds `.revealed` to scroll-animated elements.
 * CSS contract lives in `globals.css` (`[data-animation]` + optional `[data-reveal]`).
 *
 * Enhancements (BRT parity):
 * - Sibling stagger: 60ms × index, max 360ms
 * - `data-reveal-delay` attribute override
 * - Lazy block observer (data-lazy-block → az-lazy-revealed)
 * - Earlier rootMargin (-100px) so elements animate before fully in view
 */
export function ScrollRevealObserver() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) {
      targets.forEach((el) => {
        el.classList.add("revealed");
        el.style.transition = "none";
      });
      document
        .querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR)
        .forEach((el) => el.classList.add("az-lazy-revealed"));
      return;
    }

    // ── Main reveal observer ─────────────────────────────────────────────────
    const revealIO = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;

          // Explicit delay attribute takes precedence; otherwise stagger siblings
          const explicitDelay = Number.parseInt(
            el.dataset.revealDelay ?? "",
            10,
          );
          const delay = Number.isNaN(explicitDelay)
            ? getSiblingStagger(el)
            : Math.max(0, explicitDelay);

          const reveal = () => {
            el.classList.add("revealed");
            observer.unobserve(el);
          };

          if (delay > 0) {
            window.setTimeout(reveal, delay);
          } else {
            reveal();
          }
        }
      },
      // Fire 100px before fully entering viewport for a more natural feel
      { threshold: 0.05, rootMargin: "0px 0px -100px 0px" },
    );

    targets.forEach((el) => revealIO.observe(el));

    // ── Lazy block observer ──────────────────────────────────────────────────
    const lazyIO = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add("az-lazy-revealed");
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px 200px 0px" },
    );

    document
      .querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR)
      .forEach((el) => lazyIO.observe(el));

    // ── MutationObserver: pick up dynamically injected blocks ────────────────
    const mo = new MutationObserver(() => {
      document
        .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
        .forEach((el) => revealIO.observe(el));
      document
        .querySelectorAll<HTMLElement>(LAZY_BLOCK_SELECTOR)
        .forEach((el) => lazyIO.observe(el));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      revealIO.disconnect();
      lazyIO.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
