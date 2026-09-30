import { PUBLIC_MOTION } from "@/lib/motion/public-motion";

const STAGGER_BLOCK_SELECTOR =
  "[data-block-index][data-reveal]:not([data-reveal-delay]), [data-block-index][data-animation]:not([data-reveal-delay])";

export const STAGGER_STEP_MS = PUBLIC_MOTION.staggerMs;
export const STAGGER_MAX_MS = PUBLIC_MOTION.staggerMaxMs;

export function staggerDelayForIndex(index: number): number | undefined {
  if (index <= 0) return undefined;
  return Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS);
}

/**
 * Auto-assign reveal delays to sibling blocks (Astro performance-client parity).
 */
export function initStaggeredReveal(root: ParentNode = document): void {
  if (typeof document === "undefined") return;

  const blocks = root.querySelectorAll<HTMLElement>(STAGGER_BLOCK_SELECTOR);
  if (!blocks.length) return;

  const groups = new Map<Element, HTMLElement[]>();
  blocks.forEach((el) => {
    const parent = el.parentElement ?? document.body;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push(el);
  });

  groups.forEach((groupBlocks) => {
    groupBlocks.forEach((el, i) => {
      const delay = staggerDelayForIndex(i);
      if (delay != null) {
        el.dataset.revealDelay = String(delay);
      }
    });
  });
}
