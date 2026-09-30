import { getConstrainedMotionSnapshot } from "@/lib/motion/constrained-motion-snapshot";

type ParallaxBinding = {
  element: HTMLElement;
  speed: number;
  cleanup: () => void;
};

const bindings = new WeakMap<HTMLElement, ParallaxBinding>();
const activeElements = new Set<HTMLElement>();
let scrollListenerAttached = false;
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrolled = window.pageYOffset;
    for (const el of activeElements) {
      const speed = Number.parseFloat(el.dataset.parallaxSpeed ?? "0.5") || 0.5;
      el.style.transform = `translate3d(0, ${scrolled * speed}px, 0)`;
    }
    ticking = false;
  });
}

function ensureScrollListener() {
  if (scrollListenerAttached || typeof window === "undefined") return;
  scrollListenerAttached = true;
  window.addEventListener("scroll", onScroll, { passive: true });
}

function removeScrollListenerIfIdle() {
  if (activeElements.size === 0 && scrollListenerAttached) {
    window.removeEventListener("scroll", onScroll);
    scrollListenerAttached = false;
  }
}

export function bindParallaxElement(element: HTMLElement, speed: number): () => void {
  if (typeof window === "undefined") return () => {};

  const { shouldReduceMotion, shouldSimplifyMotion } = getConstrainedMotionSnapshot();
  if (shouldReduceMotion || shouldSimplifyMotion || !speed) {
    return () => {};
  }

  element.dataset.parallaxBg = "true";
  element.dataset.parallaxSpeed = String(speed);
  element.classList.add("parallax-bg");
  activeElements.add(element);
  ensureScrollListener();
  onScroll();

  const cleanup = () => {
    element.removeAttribute("data-parallax-bg");
    element.removeAttribute("data-parallax-speed");
    element.classList.remove("parallax-bg");
    element.style.removeProperty("transform");
    activeElements.delete(element);
    bindings.delete(element);
    removeScrollListenerIfIdle();
  };

  bindings.set(element, { element, speed, cleanup });
  return cleanup;
}

export function resetParallaxScrollListener(): void {
  activeElements.clear();
  removeScrollListenerIfIdle();
}
