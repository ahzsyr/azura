function isElementVisible(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (parseFloat(style.opacity) < 0.05) return false;
    node = node.parentElement;
  }
  return true;
}

/** Wait until a scroll-reveal host ancestor gets `.revealed`, or timeout. */
export function waitForScrollReveal(el: Element, maxMs = 2000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const host = el.closest<HTMLElement>(
    "[data-scroll-item], [data-reveal], [data-animation]",
  );
  if (!host || host.classList.contains("revealed")) return Promise.resolve();

  return new Promise((resolve) => {
    const start = performance.now();

    const done = () => {
      observer.disconnect();
      resolve();
    };

    const observer = new MutationObserver(() => {
      if (host.classList.contains("revealed")) done();
    });
    observer.observe(host, { attributes: true, attributeFilter: ["class"] });

    const poll = () => {
      if (host.classList.contains("revealed") || performance.now() - start >= maxMs) {
        done();
        return;
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
}

/** Wait until element and ancestors are visible (opacity/display), or timeout. */
export function waitUntilVisible(el: Element, maxMs = 800): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (isElementVisible(el)) return Promise.resolve();

  return new Promise((resolve) => {
    const start = performance.now();

    const check = () => {
      if (isElementVisible(el) || performance.now() - start >= maxMs) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}
